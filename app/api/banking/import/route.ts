import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'

// ── Value parsers ─────────────────────────────────────────────────────────────

function parseAmount(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Math.abs(val)
  const s = String(val).replace(/[+,\s]/g, '').replace(/^-/, '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// Preserves sign — used for AED equivalent column in master spreadsheet
function parseSigned(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/,/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  // xlsx Date objects are UTC midnight — use UTC getters to avoid timezone shift
  if (val instanceof Date) {
    const y = val.getUTCFullYear()
    const m = String(val.getUTCMonth() + 1).padStart(2, '0')
    const d = String(val.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(val).trim()
  // "DD MMM YYYY" format from ENBD exports — parse directly, no timezone involved
  const parts = s.split(' ')
  if (parts.length === 3 && MONTH_MAP[parts[1]]) {
    return `${parts[2]}-${MONTH_MAP[parts[1]]}-${parts[0].padStart(2, '0')}`
  }
  // Fallback: force UTC parse to avoid timezone shift
  const d = new Date(s + 'T00:00:00Z')
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function parseBalance(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function str(val: unknown): string {
  return String(val ?? '').trim()
}

// ── Format detection ──────────────────────────────────────────────────────────

// Master spreadsheet: row 0 = header with 'Date', 'Currency', 'Accounting Category'
// Raw bank export: row 0 is part of the metadata block (first cell is null)
function isMasterFormat(rows: unknown[][]): boolean {
  if (rows.length < 2) return false
  const h = rows[0]
  return str(h[0]) === 'Date' && str(h[2]) === 'Currency' && str(h[10]) === 'Accounting Category'
}

// ── Auto-categorization rules (for raw bank imports) ─────────────────────────

type AutoCat = { accounting_category: string; transaction_type: string; document_required: string }

const RULES: Array<{ match: (desc: string, credit: number, debit: number) => boolean; result: AutoCat }> = [
  // Own-account transfers (check before anything else)
  {
    match: d => /acct to acct transfer/i.test(d),
    result: { accounting_category: 'Own-account transfer', transaction_type: 'Own-account transfer', document_required: 'Bank statement' },
  },
  // Salaries via WPS
  {
    match: (d, _c, dbt) => dbt > 0 && (/wps sif posting/i.test(d) || /salary\s+(wps|fund transfer)/i.test(d) || /^salary\s+/i.test(d)),
    result: { accounting_category: 'Salaries and wages', transaction_type: 'Expense', document_required: 'WPS / payroll support' },
  },
  // Inward remittances → client receipts
  {
    match: (d, crd) => crd > 0 && /inward remittance/i.test(d),
    result: { accounting_category: 'Client receipts - review invoice', transaction_type: 'Receipt - review', document_required: 'Sales invoice / contract' },
  },
  // IPP transfers (incoming) → client receipts
  {
    match: (d, crd) => crd > 0 && /ipp transfer/i.test(d),
    result: { accounting_category: 'Client receipts - review invoice', transaction_type: 'Receipt - review', document_required: 'Sales invoice / contract' },
  },
  // VAT / bank charges
  {
    match: d => /value added tax/i.test(d) || /vat (output|reversal|input)/i.test(d),
    result: { accounting_category: 'Bank charges', transaction_type: 'Expense', document_required: 'Not required' },
  },
  // Transfer fees / correspondent charges
  {
    match: d => /funds transfer charges/i.test(d) || /corr\.?bank/i.test(d) || /fbf fee/i.test(d) || /salaam adv/i.test(d),
    result: { accounting_category: 'Bank charges', transaction_type: 'Expense', document_required: 'Not required' },
  },
  // Visa card purchases → shareholder personal expenses
  {
    match: (d, _c, dbt) => dbt > 0 && /visa purchase/i.test(d),
    result: { accounting_category: 'Shareholder/Director Personal Expenses', transaction_type: 'Expense / payment - review', document_required: 'Supplier invoice / receipt / contract' },
  },
  // International wire with personal reference → shareholder current account
  {
    match: (d, _c, dbt) =>
      dbt > 0 &&
      /online international money transfer/i.test(d) &&
      /\b(bonus|travel expenses|salary advance)\b/i.test(d),
    result: { accounting_category: "Shareholder's Current Account", transaction_type: 'Shareholder / director payment', document_required: 'Bank statement' },
  },
  // International / local wire for professional services
  {
    match: (d, _c, dbt) =>
      dbt > 0 &&
      /(online (international|local) (money transfer|fund transfer))/i.test(d) &&
      /payment for (professional|business) services/i.test(d),
    result: { accounting_category: 'Professional / consultancy fees', transaction_type: 'Expense / payment - review', document_required: 'Supplier invoice / receipt / contract' },
  },
  // Marketing / advertising
  {
    match: (d, _c, dbt) => dbt > 0 && /(marketing|advertising|advertisement)/i.test(d),
    result: { accounting_category: 'Advertising/Marketing', transaction_type: 'Expense / payment - review', document_required: 'Supplier invoice / receipt / contract' },
  },
]

function autoCategorize(
  description: string,
  credit: number,
  debit: number,
  userRules: Array<{ pattern: string; accounting_category: string; transaction_type: string | null; document_required: string | null }>
): AutoCat | null {
  // User-defined rules run first (more specific, learned from history)
  const lower = description.toLowerCase()
  for (const rule of userRules) {
    if (lower.includes(rule.pattern.toLowerCase())) {
      return {
        accounting_category: rule.accounting_category,
        transaction_type: rule.transaction_type ?? '',
        document_required: rule.document_required ?? '',
      }
    }
  }
  // Hardcoded rules as fallback
  for (const rule of RULES) {
    if (rule.match(description, credit, debit)) return rule.result
  }
  return null
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: null,
    }) as unknown[][]

    const now = new Date().toISOString()

    // ── Master spreadsheet format ─────────────────────────────────────────────
    if (isMasterFormat(rows)) {
      const toUpsert: Record<string, unknown>[] = []

      const skippedRows: Array<{ row: number; reason: string }> = []

      let masterSeq = 0
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row || row.every(v => v === null || v === '')) { skippedRows.push({ row: i + 1, reason: 'blank row' }); continue }

        const dateStr = parseDate(row[0])
        if (!dateStr) { skippedRows.push({ row: i + 1, reason: `no date (value: ${JSON.stringify(row[0])})` }); continue }
        const reference = str(row[4])
        const description = str(row[5])
        if (!reference || !description) { skippedRows.push({ row: i + 1, reason: `missing reference or description (ref: "${reference}", desc: "${description}")` }); continue }
        masterSeq++

        const credit = parseAmount(row[6])
        const debit = parseAmount(row[7])
        const balance = parseBalance(row[8]) ?? 0
        const fxRate = parseAmount(row[11]) || 1
        const aedEquivalent = parseSigned(row[12])

        toUpsert.push({
          date: dateStr,
          value_date: parseDate(row[1]),
          currency: str(row[2]) || 'AED',
          account_number: str(row[3]),
          reference,
          description,
          credit,
          debit,
          balance,
          transaction_type: str(row[9]) || null,
          accounting_category: str(row[10]) || null,
          fx_rate_to_aed: fxRate,
          aed_equivalent: aedEquivalent,
          document_required: str(row[13]) || null,
          document_status: str(row[14]) || 'Missing',
          notes: str(row[15]) || null,
          sort_order: masterSeq,
          updated_at: now,
        })
      }

      if (toUpsert.length === 0) {
        return NextResponse.json({ error: 'No transactions found in file' }, { status: 422 })
      }

      // Deduplicate within the file itself — keep last occurrence of each composite key
      const dedupMap = new Map<string, Record<string, unknown>>()
      for (const row of toUpsert) {
        const key = `${row.date}|${row.account_number}|${row.reference}|${row.description}|${row.credit}|${row.debit}|${row.balance ?? 0}`
        dedupMap.set(key, row)
      }
      const deduped = Array.from(dedupMap.values())

      // Update on conflict — master data overwrites raw imports
      const { data: upserted, error } = await supabase
        .from('bank_transactions')
        .upsert(deduped, {
          onConflict: 'date,account_number,reference,description,credit,debit,balance',
          ignoreDuplicates: false,
        })
        .select('id')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const accounts = [...new Set(deduped.map(r => r.account_number as string))]
      const currencies = [...new Set(deduped.map(r => r.currency as string))]
      const categorized = deduped.filter(r => r.accounting_category).length
      const duplicatesInFile = toUpsert.length - deduped.length

      if (skippedRows.length > 0) {
        console.log(`[banking/import] Skipped ${skippedRows.length} rows:`, skippedRows)
      }

      return NextResponse.json({
        format: 'master',
        imported: upserted?.length ?? 0,
        total: deduped.length,
        duplicatesInFile,
        skippedRows: skippedRows.length,
        skippedDetail: skippedRows,
        categorized,
        accounts: accounts.join(', '),
        currencies: currencies.join(' + '),
      })
    }

    // ── Raw bank export format ────────────────────────────────────────────────

    // Extract account metadata from header block
    let accountNumber = ''
    let currency = 'AED'
    for (const row of rows.slice(0, 11)) {
      const label = str(row[0])
      const value = str(row[1])
      if (label === 'Account Number') accountNumber = value
      if (label === 'Account Currency') currency = value.toUpperCase()
    }
    if (!accountNumber) {
      return NextResponse.json({ error: 'Could not detect account number. Make sure you are uploading a bank statement export.' }, { status: 422 })
    }

    // Find data start row
    let dataStartRow = -1
    for (let i = 0; i < rows.length; i++) {
      if (str(rows[i][0]).toLowerCase() === 'date') { dataStartRow = i + 1; break }
    }
    if (dataStartRow === -1) {
      return NextResponse.json({ error: 'Could not find transaction header row' }, { status: 422 })
    }

    // Load monthly FX rates and user-defined categorisation rules
    const [{ data: fxRates }, { data: userRules }] = await Promise.all([
      supabase.from('monthly_fx_rates').select('*'),
      supabase.from('bank_categorisation_rules').select('pattern,accounting_category,transaction_type,document_required'),
    ])
    const fxMap = new Map<string, number>()
    for (const r of fxRates ?? []) fxMap.set(`${r.year}-${r.month}`, r.rate_to_aed)

    function getFxRate(dateStr: string): number {
      if (currency === 'AED') return 1
      const d = new Date(dateStr)
      return fxMap.get(`${d.getFullYear()}-${d.getMonth() + 1}`) ?? 1
    }

    const toInsert: Record<string, unknown>[] = []
    let autoCatCount = 0
    let rawSeq = 0

    for (let i = dataStartRow; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every(v => v === null || v === '')) continue

      const dateStr = parseDate(row[0])
      const reference = str(row[2])
      const description = str(row[3])
      if (!dateStr || !reference || !description) continue

      const credit = parseAmount(row[4])
      const debit = parseAmount(row[5])
      const balance = parseBalance(row[6]) ?? 0
      const fxRate = getFxRate(dateStr)
      const aedEquivalent = credit > 0 ? credit * fxRate : debit > 0 ? -debit * fxRate : 0

      const cat = autoCategorize(description, credit, debit, userRules ?? [])
      if (cat) autoCatCount++
      rawSeq++

      toInsert.push({
        date: dateStr,
        value_date: parseDate(row[1]),
        currency,
        account_number: accountNumber,
        reference,
        description,
        credit,
        debit,
        balance,
        fx_rate_to_aed: fxRate,
        aed_equivalent: aedEquivalent,
        transaction_type: cat?.transaction_type ?? null,
        accounting_category: cat?.accounting_category ?? null,
        document_required: cat?.document_required ?? null,
        document_status: cat?.accounting_category === 'Bank charges' || cat?.accounting_category === 'Own-account transfer' || /noon|apple\.com|apple|deliveroo|google|careem|medicina|supermarket|spinneys|kick|market|amazon|orbit|framer|anthropic|ev charging|osn|cooling|botim|sondos|lemon|polar|future link|pet corner|vox|higgsfield|adobe/i.test(description) ? 'Not Required' : 'Missing',
        sort_order: rawSeq,
        updated_at: now,
      })
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ error: 'No transactions found in file' }, { status: 422 })
    }

    // Skip duplicates — never overwrite manually categorized transactions
    const { data: inserted, error } = await supabase
      .from('bank_transactions')
      .upsert(toInsert, {
        onConflict: 'date,account_number,reference,description,credit,debit,balance',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const importedCount = inserted?.length ?? 0
    const skippedCount = toInsert.length - importedCount
    const needsReview = toInsert.length - autoCatCount

    return NextResponse.json({
      format: 'raw',
      imported: importedCount,
      skipped: skippedCount,
      total: toInsert.length,
      autoCategorized: autoCatCount,
      needsReview,
      account: accountNumber,
      currency,
    })
  } catch (err) {
    console.error('Banking import error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
