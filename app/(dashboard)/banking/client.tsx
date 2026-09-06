'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertCircle, ChevronUp, ChevronDown, Pencil, X, Check, Trash2, Sparkles, ExternalLink } from 'lucide-react'
import { BankTransaction, BankOpeningBalance, MonthlyFxRate, BankCategorisationRule } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const ACCOUNTING_CATEGORIES = [
  'Advertising/Marketing',
  'Bank charges',
  'Client receipts - review invoice',
  'Events / production',
  'Hotels / accommodation',
  'Licences & Government Fees',
  'Marketing / PR',
  'Other',
  'Own-account transfer',
  'Professional / consultancy fees',
  'Salaries and wages',
  'Salary advance / receivable',
  'Share Capital',
  "Shareholder's Current Account",
  'Shareholder/Director Personal Expenses',
  'Talent / model fees',
  'Travel',
  'Uncategorised expense',
  'Uncategorised receipt',
]

const TRANSACTION_TYPES = [
  'Expense',
  'Expense / payment - review',
  'Income / receipt',
  'Own-account transfer',
  'Receipt - review',
  'Shareholder / director payment',
  'Shareholder funding',
  'Review Required',
]

const DOCUMENT_STATUSES = ['Available', 'Missing', 'Not Required', 'Review Required']

const DOCUMENT_REQUIRED_OPTIONS = [
  'Bank statement',
  'Invoice / explanation',
  'Supplier invoice / receipt / contract',
  'Sales invoice / contract',
  'WPS / payroll support',
  'Not Required',
]

// Categories that flow through P&L as expenses (debits in trial balance)
const EXPENSE_CATEGORIES = new Set([
  'Advertising/Marketing',
  'Bank charges',
  'Events / production',
  'Hotels / accommodation',
  'Licences & Government Fees',
  'Marketing / PR',
  'Professional / consultancy fees',
  'Salaries and wages',
  'Talent / model fees',
  'Travel',
  'Other',
  'Uncategorised expense',
])

const INCOME_CATEGORIES = new Set([
  'Client receipts - review invoice',
  'Uncategorised receipt',
])

const SHAREHOLDER_CATEGORIES = new Set([
  "Shareholder's Current Account",
  'Shareholder/Director Personal Expenses',
  'Shareholder funding',
  'Salary advance / receivable',
])

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAed(n: number, signed = false) {
  const prefix = signed && n > 0 ? '+' : ''
  return `${prefix}AED ${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortDesc(s: string, max = 60) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'aed' | 'eur' | 'expenses' | 'income' | 'shareholder' | 'trial-balance'

type SortDir = 'asc' | 'desc'

type RememberPrompt = {
  txId: string
  description: string
  suggestedPattern: string
  category: string
  transactionType: string | null
}

const KNOWN_PREFIXES = [
  'Visa Purchase',
  'Inward Remittance',
  'IPP TRANSFER',
  'Online International Money Transfer',
  'Online Local Fund Transfer',
  'Acct to Acct transfer',
  'Value Added Tax',
  'Funds Transfer Charges',
  'Corr.Bank.Charges',
  'WPS SIF POSTING',
  'Salary',
]

function suggestPattern(description: string): string {
  for (const prefix of KNOWN_PREFIXES) {
    if (description.toLowerCase().startsWith(prefix.toLowerCase())) return prefix
  }
  // First meaningful chunk — up to 40 chars, trim at last word boundary
  const chunk = description.trim().slice(0, 40)
  const lastSpace = chunk.lastIndexOf(' ')
  return lastSpace > 8 ? chunk.slice(0, lastSpace) : chunk
}

type Props = {
  transactions: BankTransaction[]
  openingBalances: BankOpeningBalance[]
  fxRates: MonthlyFxRate[]
  rules: BankCategorisationRule[]
  initialTab: Tab
}

// ── Inline cell editor ───────────────────────────────────────────────────────

function SelectCell({ value, options, onChange, placeholder }: {
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left w-full group/cell flex items-center gap-1"
      >
        <span className={cn('text-xs', value ? 'text-gray-700' : 'text-gray-300')}>
          {value ?? placeholder ?? '—'}
        </span>
        <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/cell:opacity-100 shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        autoFocus
        value={value ?? ''}
        onChange={e => { onChange(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-gray-500 max-w-[160px]"
      >
        <option value="">— clear —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function TextCell({ value, onChange, placeholder }: {
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function save() {
    onChange(draft.trim() || null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value ?? ''); setEditing(true) }}
        className="text-left w-full group/cell flex items-center gap-1"
      >
        <span className={cn('text-xs', value ? 'text-gray-700' : 'text-gray-300')}>
          {value ? shortDesc(value, 40) : (placeholder ?? '—')}
        </span>
        <Pencil className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover/cell:opacity-100 shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:border-gray-500 w-40"
      />
      <button onClick={save} className="text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function BankingClient({ transactions: initialTransactions, openingBalances: initialOpeningBalances, fxRates, rules: initialRules, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions)
  const [openingBalances, setOpeningBalances] = useState<BankOpeningBalance[]>(initialOpeningBalances)
  const [rules, setRules] = useState<BankCategorisationRule[]>(initialRules)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [tbYear, setTbYear] = useState(new Date().getFullYear())
  const [rememberPrompt, setRememberPrompt] = useState<RememberPrompt | null>(null)
  const [rememberPattern, setRememberPattern] = useState('')
  const [ruleSaving, setRuleSaving] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Transactions filter/sort state
  const [txSearchInput, setTxSearchInput] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [txAccount, setTxAccount] = useState<'all' | string>('all')
  const [txCategories, setTxCategories] = useState<string[]>([])
  const [txCategoryOpen, setTxCategoryOpen] = useState(false)
  const [txDocStatus, setTxDocStatus] = useState('all')
  const [txNeedsReview, setTxNeedsReview] = useState(false)
  const [txMissingDoc, setTxMissingDoc] = useState(false)
  const [txSortCol, setTxSortCol] = useState<'date' | 'description' | 'credit' | 'debit' | 'balance' | 'aed_balance' | 'amount' | 'category' | 'doc_status' | 'notes'>('date')
  const [txSortDir, setTxSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const t = setTimeout(() => setTxSearch(txSearchInput), 300)
    return () => clearTimeout(t)
  }, [txSearchInput])

  // Opening balance edit state
  const [editingOb, setEditingOb] = useState<BankOpeningBalance | null>(null)
  const [obDraft, setObDraft] = useState({ debit_aed: '', credit_aed: '' })
  const [obSaving, setObSaving] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    router.replace(`/banking?tab=${t}`)
  }

  // ── Upload handler ─────────────────────────────────────────────────────────

  async function handleUpload(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setUploadError('Please upload an .xlsx or .xls file from your bank.')
      return
    }
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/banking/import', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json.error ?? 'Import failed')
      } else {
        setUploadResult(json)
        // Refresh transactions list
        const { data } = await supabase
          .from('bank_transactions')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
        if (data) setTransactions(data)
      }
    } catch {
      setUploadError('Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Inline transaction update ──────────────────────────────────────────────

  const updateTransaction = useCallback(async (id: string, patch: Partial<BankTransaction>, prevCategory?: string | null) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const supabase = createClient()
    await supabase.from('bank_transactions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)

    // Offer "Remember this?" only when setting a category on a previously-uncategorised row
    if (patch.accounting_category && !prevCategory) {
      const tx = transactions.find(t => t.id === id)
      if (!tx) return
      const suggested = suggestPattern(tx.description)
      // Don't prompt if a rule already covers this pattern
      const alreadyCovered = rules.some(r => tx.description.toLowerCase().includes(r.pattern.toLowerCase()))
      if (!alreadyCovered) {
        setRememberPrompt({
          txId: id,
          description: tx.description,
          suggestedPattern: suggested,
          category: patch.accounting_category,
          transactionType: patch.transaction_type ?? tx.transaction_type ?? null,
        })
        setRememberPattern(suggested)
      }
    }
  }, [transactions, rules])

  // ── Computed views ─────────────────────────────────────────────────────────

  const accounts = useMemo(() => {
    const s = new Set(transactions.map(t => t.account_number))
    return Array.from(s).sort()
  }, [transactions])

  const aedAccounts = useMemo(() => [...new Set(transactions.filter(t => t.currency === 'AED').map(t => t.account_number))].sort(), [transactions])
  const eurAccounts = useMemo(() => [...new Set(transactions.filter(t => t.currency === 'EUR').map(t => t.account_number))].sort(), [transactions])

  const aedNeedsReviewCount = useMemo(() => transactions.filter(t => t.currency === 'AED' && !t.accounting_category).length, [transactions])
  const eurNeedsReviewCount = useMemo(() => transactions.filter(t => t.currency === 'EUR' && !t.accounting_category).length, [transactions])
  const aedMissingDocCount = useMemo(() => transactions.filter(t => t.currency === 'AED' && t.accounting_category && t.document_status === 'Missing').length, [transactions])
  const eurMissingDocCount = useMemo(() => transactions.filter(t => t.currency === 'EUR' && t.accounting_category && t.document_status === 'Missing').length, [transactions])
  const needsReviewCount = aedNeedsReviewCount + eurNeedsReviewCount

  // Running AED equivalent balance for EUR transactions (sorted oldest→newest)
  const eurRunningAedMap = useMemo(() => {
    const eurOb = openingBalances.find(b => b.account_name.toLowerCase().includes('eur'))
    let running = eurOb ? (eurOb.credit_aed - eurOb.debit_aed) : 0
    const sorted = transactions
      .filter(t => t.currency === 'EUR')
      .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    const map = new Map<string, number>()
    for (const t of sorted) {
      running += (t.aed_equivalent ?? 0)
      map.set(t.id, running)
    }
    return map
  }, [transactions, openingBalances])

  function sortTx(list: BankTransaction[]) {
    return [...list].sort((a, b) => {
      let cmp = 0
      if (txSortCol === 'date') {
        cmp = a.date.localeCompare(b.date)
        if (cmp === 0) cmp = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      } else if (txSortCol === 'description') {
        cmp = a.description.localeCompare(b.description)
      } else if (txSortCol === 'credit') {
        cmp = a.credit - b.credit
      } else if (txSortCol === 'debit') {
        cmp = a.debit - b.debit
      } else if (txSortCol === 'balance') {
        cmp = (a.balance ?? 0) - (b.balance ?? 0)
      } else if (txSortCol === 'aed_balance') {
        cmp = ((a.balance ?? 0) * a.fx_rate_to_aed) - ((b.balance ?? 0) * b.fx_rate_to_aed)
      } else if (txSortCol === 'amount') {
        cmp = Math.abs(a.aed_equivalent ?? 0) - Math.abs(b.aed_equivalent ?? 0)
      } else if (txSortCol === 'category') {
        cmp = (a.accounting_category ?? '').localeCompare(b.accounting_category ?? '')
      } else if (txSortCol === 'doc_status') {
        cmp = (a.document_status ?? '').localeCompare(b.document_status ?? '')
      } else if (txSortCol === 'notes') {
        cmp = (a.notes ?? '').localeCompare(b.notes ?? '')
      }
      return txSortDir === 'asc' ? cmp : -cmp
    })
  }

  function filterTx(list: BankTransaction[]) {
    return list.filter(t => {
      if (txNeedsReview && t.accounting_category) return false
      if (txMissingDoc && t.document_status !== 'Missing') return false
      if (txAccount !== 'all' && t.account_number !== txAccount) return false
      if (txCategories.length > 0 && !txCategories.includes(t.accounting_category ?? '')) return false
      if (txDocStatus !== 'all' && t.document_status !== txDocStatus) return false
      if (txSearch) {
        const q = txSearch.toLowerCase()
        if (!t.description.toLowerCase().includes(q) && !t.reference.toLowerCase().includes(q) && !(t.notes ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  const aedTxFiltered = useMemo(() => sortTx(filterTx(transactions.filter(t => t.currency === 'AED'))), [transactions, txSearch, txAccount, txCategories, txDocStatus, txNeedsReview, txMissingDoc, txSortCol, txSortDir])
  const eurTxFiltered = useMemo(() => sortTx(filterTx(transactions.filter(t => t.currency === 'EUR'))), [transactions, txSearch, txAccount, txCategories, txDocStatus, txNeedsReview, txMissingDoc, txSortCol, txSortDir])
  const expenseTx = useMemo(() => sortTx(transactions.filter(t => t.debit > 0 && t.accounting_category !== 'Own-account transfer' && !SHAREHOLDER_CATEGORIES.has(t.accounting_category ?? ''))), [transactions, txSortCol, txSortDir])
  const incomeTx = useMemo(() => sortTx(transactions.filter(t => t.credit > 0 && t.accounting_category !== 'Own-account transfer' && !SHAREHOLDER_CATEGORIES.has(t.accounting_category ?? ''))), [transactions, txSortCol, txSortDir])
  const shareholderTx = useMemo(() => sortTx(transactions.filter(t => SHAREHOLDER_CATEGORIES.has(t.accounting_category ?? ''))), [transactions, txSortCol, txSortDir])

  // Trial balance computation
  const trialBalance = useMemo(() => {
    // Group movements by accounting_category
    const expenseMap = new Map<string, { debit: number; credit: number }>()
    let incomeCredit = 0
    let shareholderDebit = 0
    let shareholderCredit = 0

    for (const t of transactions) {
      if (!t.date.startsWith(String(tbYear))) continue
      const cat = t.accounting_category
      if (!cat || cat === 'Own-account transfer') continue
      const aed = Math.abs(t.aed_equivalent ?? 0)

      if (EXPENSE_CATEGORIES.has(cat)) {
        const entry = expenseMap.get(cat) ?? { debit: 0, credit: 0 }
        if (t.debit > 0) entry.debit += aed
        else entry.credit += aed
        expenseMap.set(cat, entry)
      } else if (INCOME_CATEGORIES.has(cat)) {
        if (t.credit > 0) incomeCredit += aed
      } else if (SHAREHOLDER_CATEGORIES.has(cat)) {
        if (t.debit > 0) shareholderDebit += aed
        else shareholderCredit += aed
      }
    }

    return { expenseMap, incomeCredit, shareholderDebit, shareholderCredit }
  }, [transactions, tbYear])

  function toggleSort(col: typeof txSortCol) {
    if (txSortCol === col) setTxSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setTxSortCol(col); setTxSortDir('desc') }
  }

  function SortIcon({ col }: { col: typeof txSortCol }) {
    if (txSortCol !== col) return null
    return txSortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  // ── Opening balance edit ───────────────────────────────────────────────────

  async function saveOpeningBalance() {
    if (!editingOb) return
    setObSaving(true)
    const supabase = createClient()
    const patch = {
      debit_aed: parseFloat(obDraft.debit_aed) || 0,
      credit_aed: parseFloat(obDraft.credit_aed) || 0,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('bank_opening_balances').update(patch).eq('id', editingOb.id)
    setOpeningBalances(prev => prev.map(b => b.id === editingOb.id ? { ...b, ...patch } : b))
    setObSaving(false)
    setEditingOb(null)
  }

  // ── Save rule + apply to existing ─────────────────────────────────────────

  async function handleSaveRule() {
    if (!rememberPrompt || !rememberPattern.trim()) return
    setRuleSaving(true)
    const supabase = createClient()
    const newRule = {
      pattern: rememberPattern.trim(),
      accounting_category: rememberPrompt.category,
      transaction_type: rememberPrompt.transactionType ?? null,
      document_required: null as string | null,
    }
    const { data } = await supabase
      .from('bank_categorisation_rules')
      .upsert(newRule, { onConflict: 'pattern', ignoreDuplicates: false })
      .select()
      .single()
    if (data) setRules(prev => [data as BankCategorisationRule, ...prev.filter(r => r.pattern !== data.pattern)])

    // Apply to all other uncategorised transactions that match the pattern
    const lower = rememberPattern.trim().toLowerCase()
    const toUpdate = transactions.filter(t => !t.accounting_category && t.id !== rememberPrompt.txId && t.description.toLowerCase().includes(lower))
    if (toUpdate.length > 0) {
      const ids = toUpdate.map(t => t.id)
      const patch = { accounting_category: newRule.accounting_category, transaction_type: newRule.transaction_type, updated_at: new Date().toISOString() }
      await supabase.from('bank_transactions').update(patch).in('id', ids)
      setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...patch } : t))
    }

    setRuleSaving(false)
    setRememberPrompt(null)
  }

  async function handleDeleteRule(id: string) {
    const supabase = createClient()
    await supabase.from('bank_categorisation_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  // ── Transaction table ──────────────────────────────────────────────────────

  function TxTable({ rows, showFilters = false, showBalance = false, balanceCurrency = 'AED', showAedBalance = false, availableAccounts, needsReview, missingDoc, showAedEquiv = true, showAedNet = false }: {
    rows: BankTransaction[]
    showFilters?: boolean
    showBalance?: boolean
    balanceCurrency?: string
    showAedBalance?: boolean
    availableAccounts?: string[]
    needsReview?: number
    missingDoc?: number
    showAedEquiv?: boolean
    showAedNet?: boolean
  }) {
    const filterAccounts = availableAccounts ?? accounts
    return (
      <div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              value={txSearchInput}
              onChange={e => setTxSearchInput(e.target.value)}
              placeholder="Search description or reference…"
              className="w-64 text-xs"
            />
            <select
              value={txAccount}
              onChange={e => setTxAccount(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="all">All accounts</option>
              {filterAccounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="relative">
              <button
                onClick={() => setTxCategoryOpen(o => !o)}
                className={cn(
                  'text-xs border rounded-lg px-3 py-2 bg-white focus:outline-none transition-colors flex items-center gap-2',
                  txCategories.length > 0 ? 'border-gray-400 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                )}
              >
                {txCategories.length === 0 ? 'All categories' : txCategories.length === 1 ? txCategories[0] : `${txCategories.length} categories`}
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {txCategoryOpen && (
                <>
                <div className="fixed inset-0 z-20" onClick={() => setTxCategoryOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px] max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setTxCategories([]); setTxCategoryOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Clear all
                  </button>
                  <div className="h-px bg-gray-100 mx-2 my-1" />
                  {ACCOUNTING_CATEGORIES.map(c => (
                    <label key={c} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={txCategories.includes(c)}
                        onChange={() => {
                          setTxCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                          if (txNeedsReview) setTxNeedsReview(false)
                        }}
                        className="rounded"
                      />
                      {c}
                    </label>
                  ))}
                </div>
                </>
              )}
            </div>
            <select
              value={txDocStatus}
              onChange={e => setTxDocStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="all">All statuses</option>
              {DOCUMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(needsReview ?? 0) > 0 && (
              <button
                onClick={() => { setTxNeedsReview(r => !r); setTxMissingDoc(false); setTxCategories([]) }}
                className={cn(
                  'text-xs font-medium px-3 py-2 rounded-lg border transition-colors',
                  txNeedsReview
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                )}
              >
                {txNeedsReview ? '✕ Needs Category' : `⚠ Needs Category (${needsReview})`}
              </button>
            )}
            {(missingDoc ?? 0) > 0 && (
              <button
                onClick={() => { setTxMissingDoc(r => !r); setTxNeedsReview(false); setTxCategories([]) }}
                className={cn(
                  'text-xs font-medium px-3 py-2 rounded-lg border transition-colors',
                  txMissingDoc
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                )}
              >
                {txMissingDoc ? '✕ Missing Doc' : `⚠ Missing Doc (${missingDoc})`}
              </button>
            )}
            {(() => {
              const totalCredit = rows.reduce((s, t) => s + t.credit, 0)
              const totalDebit = rows.reduce((s, t) => s + t.debit, 0)
              const net = totalCredit - totalDebit
              const aedNet = showAedNet ? rows.reduce((s, t) => s + (t.aed_equivalent ?? 0), 0) : null
              return (
                <div className="ml-auto flex items-center gap-4 text-xs text-gray-500 px-1">
                  <span>{rows.length} rows</span>
                  <span>Credit: <span className="font-mono font-medium text-green-700">{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  <span>Debit: <span className="font-mono font-medium text-red-700">{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  <span>Net: <span className={cn('font-mono font-medium', net >= 0 ? 'text-green-700' : 'text-red-700')}>{net >= 0 ? '+' : ''}{net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  {aedNet !== null && (
                    <span className="border-l border-gray-200 pl-4">AED Equiv: <span className={cn('font-mono font-medium', aedNet >= 0 ? 'text-green-700' : 'text-red-700')}>{aedNet >= 0 ? '+' : ''}{aedNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No transactions found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('date')}>
                    Date <SortIcon col="date" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500">Acct</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 cursor-pointer" onClick={() => toggleSort('description')}>
                    Description <SortIcon col="description" />
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('credit')}>
                    Credit <SortIcon col="credit" />
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('debit')}>
                    Debit <SortIcon col="debit" />
                  </th>
                  {showBalance && (
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('balance')}>
                      {balanceCurrency} Balance <SortIcon col="balance" />
                    </th>
                  )}
                  {showAedEquiv && (
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('amount')}>
                      AED Equiv <SortIcon col="amount" />
                    </th>
                  )}
                  {showAedBalance && (
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-500 cursor-pointer whitespace-nowrap" onClick={() => toggleSort('aed_balance')}>
                      AED Balance <SortIcon col="aed_balance" />
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 cursor-pointer" onClick={() => toggleSort('category')}>
                    Category <SortIcon col="category" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 cursor-pointer" onClick={() => toggleSort('doc_status')}>
                    Doc Status <SortIcon col="doc_status" />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 cursor-pointer" onClick={() => toggleSort('notes')}>
                    Notes <SortIcon col="notes" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(t => {
                  const isExpanded = expandedTxId === t.id
                  const colSpan = 7 + (showBalance ? 1 : 0) + (showAedEquiv ? 1 : 0) + (showAedBalance ? 1 : 0)
                  return (
                  <React.Fragment key={t.id}>
                  <tr
                    onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                    className={cn('transition-colors cursor-pointer', !t.accounting_category ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50', isExpanded && '!bg-gray-100')}
                  >
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', t.currency === 'EUR' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                        {t.currency}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[240px]">
                      <p className="truncate">{t.description}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{t.reference}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-green-700 font-medium whitespace-nowrap">
                      {t.credit > 0 ? t.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    <td className="px-3 py-2 text-right text-red-700 font-medium whitespace-nowrap">
                      {t.debit > 0 ? t.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                    </td>
                    {showBalance && (
                      <td className="px-3 py-2 text-right font-mono text-gray-600 whitespace-nowrap text-xs">
                        {t.balance !== null ? t.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                      </td>
                    )}
                    {showAedEquiv && (
                      <td className={cn('px-3 py-2 text-right font-medium whitespace-nowrap', (t.aed_equivalent ?? 0) >= 0 ? 'text-green-700' : 'text-red-700')}>
                        {t.aed_equivalent !== null
                          ? (t.aed_equivalent >= 0 ? '+' : '') + t.aed_equivalent.toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                    )}
                    {showAedBalance && (
                      <td className="px-3 py-2 text-right font-mono text-gray-600 whitespace-nowrap text-xs">
                        {t.balance !== null && t.fx_rate_to_aed
                          ? (t.balance * t.fx_rate_to_aed).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                    )}
                    <td className="px-3 py-2 min-w-[140px]" onClick={e => e.stopPropagation()}>
                      <SelectCell
                        value={t.accounting_category}
                        options={ACCOUNTING_CATEGORIES}
                        onChange={v => updateTransaction(t.id, { accounting_category: v }, t.accounting_category)}
                        placeholder="Set category"
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[110px]" onClick={e => e.stopPropagation()}>
                      <SelectCell
                        value={t.document_status}
                        options={DOCUMENT_STATUSES}
                        onChange={v => updateTransaction(t.id, { document_status: v })}
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[120px]" onClick={e => e.stopPropagation()}>
                      <TextCell
                        value={t.notes}
                        onChange={v => updateTransaction(t.id, { notes: v })}
                        placeholder="Add note"
                      />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={colSpan} className="px-4 py-3 border-b border-gray-200">
                        <div className="flex gap-8">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Full Description</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{t.description}</p>
                            <p className="text-xs text-gray-400 font-mono mt-1">{t.reference}</p>
                          </div>
                          {t.document_status === 'Available' && (
                            <div className="shrink-0 w-72">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Supporting Document</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="url"
                                  defaultValue={t.document_url ?? ''}
                                  onBlur={e => {
                                    const url = e.target.value.trim() || null
                                    if (url !== t.document_url) updateTransaction(t.id, { document_url: url })
                                  }}
                                  placeholder="Paste Google Drive link…"
                                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                                  onClick={e => e.stopPropagation()}
                                />
                                {t.document_url && (
                                  <a
                                    href={t.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-blue-500 hover:text-blue-700 shrink-0"
                                    title="Open document"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {rows.length} transaction{rows.length !== 1 ? 's' : ''}
              {rows.some(t => t.currency !== 'AED') && (
                <span className="ml-3 text-blue-500">EUR amounts converted using monthly average rates</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Banking</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {transactions.length} transactions · {accounts.length > 0 ? accounts.join(' · ') : 'No accounts yet'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'upload', label: 'Upload', badge: 0, count: null },
          { key: 'aed', label: 'AED Transactions', badge: aedNeedsReviewCount, count: transactions.filter(t => t.currency === 'AED').length },
          { key: 'eur', label: 'EUR Transactions', badge: eurNeedsReviewCount, count: transactions.filter(t => t.currency === 'EUR').length },
          { key: 'expenses', label: 'Expense Ledger', badge: 0, count: null },
          { key: 'income', label: 'Income Ledger', badge: 0, count: null },
          { key: 'shareholder', label: 'Shareholder Account', badge: 0, count: null },
          { key: 'trial-balance', label: 'Trial Balance', badge: 0, count: null },
        ] as { key: Tab; label: string; badge: number; count: number | null }[]).map(({ key, label, badge, count }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5',
              tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
            {count !== null && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                {count}
              </span>
            )}
            {badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Upload tab ─────────────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div className="max-w-xl">
          <p className="text-sm text-gray-500 mb-5">
            Download your statement from Emirates NBD Online Banking as an Excel file (.xlsx), then upload it here.
            Transactions already in the system are skipped — safe to upload the same file twice.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleUpload(f)
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl px-8 py-12 text-center cursor-pointer transition-colors',
              dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              uploading && 'pointer-events-none opacity-60'
            )}
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Importing…' : 'Drop .xlsx file here or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">AED account · EUR account · both accepted</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
            />
          </div>

          {/* Result */}
          {uploadResult && (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-xl px-5 py-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Import complete</p>
                {uploadResult.format === 'master' ? (
                  <>
                    <p className="text-xs text-green-600 mt-0.5">
                      Master spreadsheet — <strong>{uploadResult.imported as number}</strong> of {uploadResult.total as number} transactions imported with full categorisation ({uploadResult.categorized as number} categorised)
                    </p>
                    {(uploadResult.skippedRows as number) > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {uploadResult.skippedRows as number} rows skipped (blank rows, missing reference/description) — check terminal for details
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-green-600 mt-0.5">
                      Account {uploadResult.account as string} ({uploadResult.currency as string}) —&nbsp;
                      <strong>{uploadResult.imported as number}</strong> new transaction{(uploadResult.imported as number) !== 1 ? 's' : ''} imported
                      {(uploadResult.skipped as number) > 0 && `, ${uploadResult.skipped as number} already existed`}
                    </p>
                    {(uploadResult.autoCategorized as number) > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {uploadResult.autoCategorized as number} auto-categorised · {uploadResult.needsReview as number} need review
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}

          {/* Auto-categorisation rules */}
          {rules.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Saved Categorisation Rules</p>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Pattern</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Category</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Type</th>
                      <th className="px-4 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rules.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-2 font-mono text-gray-700">{r.pattern}</td>
                        <td className="px-4 py-2 text-gray-700">{r.accounting_category}</td>
                        <td className="px-4 py-2 text-gray-400">{r.transaction_type ?? '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleDeleteRule(r.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
                  Rules are applied automatically when importing new bank statements.
                </p>
              </div>
            </div>
          )}

          {/* FX Rates reference */}
          {fxRates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">EUR → AED Monthly Rates</p>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Month</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-500">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fxRates.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">
                          {new Date(r.year, r.month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-700">{r.rate_to_aed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
                  Monthly average rates. Missing a month? Contact your admin to add it.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AED Transactions tab ────────────────────────────────────────────── */}
      {tab === 'aed' && (
        <TxTable
          rows={aedTxFiltered}
          showFilters
          showBalance
          balanceCurrency="AED"
          showAedEquiv={false}
          availableAccounts={aedAccounts}
          needsReview={aedNeedsReviewCount}
          missingDoc={aedMissingDocCount}
        />
      )}

      {/* ── EUR Transactions tab ────────────────────────────────────────────── */}
      {tab === 'eur' && (
        <TxTable
          rows={eurTxFiltered}
          showFilters
          showBalance
          balanceCurrency="EUR"
          showAedEquiv={false}
          showAedBalance
          showAedNet
          availableAccounts={eurAccounts}
          needsReview={eurNeedsReviewCount}
          missingDoc={eurMissingDocCount}
        />
      )}

      {/* ── Expense Ledger tab ──────────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            All debit (outgoing) transactions, excluding own-account transfers and shareholder movements.
          </p>
          <TxTable rows={expenseTx} />
        </div>
      )}

      {/* ── Income Ledger tab ───────────────────────────────────────────────── */}
      {tab === 'income' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            All credit (incoming) transactions, excluding own-account transfers and shareholder movements.
          </p>
          <TxTable rows={incomeTx} />
        </div>
      )}

      {/* ── Shareholder Account tab ─────────────────────────────────────────── */}
      {tab === 'shareholder' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">
            Transactions categorised as Shareholder's Current Account, Director Personal Expenses, Shareholder Funding, or Salary Advances.
          </p>
          <TxTable rows={shareholderTx} />
        </div>
      )}

      {/* ── Trial Balance tab ───────────────────────────────────────────────── */}
      {tab === 'trial-balance' && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">MORECREATIVE FZCO – {tbYear} PROVISIONAL TRIAL BALANCE</p>
            <div className="flex items-center gap-1">
              {[2025, 2026, 2027].map(y => (
                <button
                  key={y}
                  onClick={() => setTbYear(y)}
                  className={cn('px-2.5 py-0.5 rounded text-xs font-medium transition-colors', tbYear === y ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-700')}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5">Working draft. Opening balances from audited 31 Dec {tbYear - 1} accounts + bank-coded movements.</p>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Account</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Debit (AED)</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Credit (AED)</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">

                {/* Opening balances — 2025 = closing/year-end, 2026 = opening position */}
                {(tbYear === 2025 || tbYear === 2026) && (<>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {tbYear === 2025 ? 'Year-End Balances – 31 Dec 2025' : 'Opening Balances – 1 Jan 2026'}
                  </td>
                </tr>
                {openingBalances.map(ob => (
                  <tr key={ob.id} className="hover:bg-gray-50 group">
                    {editingOb?.id === ob.id ? (
                      <>
                        <td className="px-5 py-2 text-sm text-gray-700">{ob.account_name}</td>
                        <td className="px-5 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={obDraft.debit_aed}
                            onChange={e => setObDraft(d => ({ ...d, debit_aed: e.target.value }))}
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-28 text-right focus:outline-none"
                          />
                        </td>
                        <td className="px-5 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={obDraft.credit_aed}
                            onChange={e => setObDraft(d => ({ ...d, credit_aed: e.target.value }))}
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-28 text-right focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={saveOpeningBalance} disabled={obSaving} className="text-green-600 hover:text-green-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingOb(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 text-sm text-gray-700">{ob.account_name}</td>
                        <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                          {ob.debit_aed > 0 ? ob.debit_aed.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                          {ob.credit_aed > 0 ? ob.credit_aed.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => { setEditingOb(ob); setObDraft({ debit_aed: String(ob.debit_aed), credit_aed: String(ob.credit_aed) }) }}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                </>)}

                {/* P&L Movements */}
                {trialBalance.expenseMap.size > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{tbYear} P&L Movements</td>
                    </tr>
                    {Array.from(trialBalance.expenseMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([cat, { debit, credit }]) => (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 text-sm text-gray-700">{cat}</td>
                        <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                          {debit > 0 ? debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                          {credit > 0 ? credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                )}

                {/* Income Movements */}
                {trialBalance.incomeCredit > 0 && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">2026 Income Movements</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-sm text-gray-700">Client receipts</td>
                      <td className="px-5 py-2.5 text-right text-sm font-mono text-gray-700" />
                      <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                        {trialBalance.incomeCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                {/* Shareholder Movements */}
                {(trialBalance.shareholderDebit > 0 || trialBalance.shareholderCredit > 0) && (
                  <>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">2026 Shareholder Current Account Movements</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-sm text-gray-700">Shareholder current account movements</td>
                      <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                        {trialBalance.shareholderDebit > 0 ? trialBalance.shareholderDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                      </td>
                      <td className="px-5 py-2.5 text-right text-sm text-gray-700 font-mono">
                        {trialBalance.shareholderCredit > 0 ? trialBalance.shareholderCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                {/* Totals */}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">Totals</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900 font-mono border-t border-b-2 border-gray-300">
                    {(() => {
                      const obDebit = (tbYear === 2025 || tbYear === 2026) ? openingBalances.reduce((s, b) => s + b.debit_aed, 0) : 0
                      const expDebit = Array.from(trialBalance.expenseMap.values()).reduce((s, v) => s + v.debit, 0)
                      return (obDebit + expDebit + trialBalance.shareholderDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    })()}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900 font-mono border-t border-b-2 border-gray-300">
                    {(() => {
                      const obCredit = (tbYear === 2025 || tbYear === 2026) ? openingBalances.reduce((s, b) => s + b.credit_aed, 0) : 0
                      const expCredit = Array.from(trialBalance.expenseMap.values()).reduce((s, v) => s + v.credit, 0)
                      return (obCredit + expCredit + trialBalance.incomeCredit + trialBalance.shareholderCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    })()}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
            <p className="px-5 py-3 text-[10px] text-gray-400 border-t border-gray-100">
              Working schedule only. Final audit entries will also include bank reconciliation, year-end EUR retranslation, receivables/payables/accruals and auditor adjustments.
            </p>
          </div>
        </div>
      )}

      {/* ── Remember This? bar ──────────────────────────────────────────────── */}
      {rememberPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-amber-200 shadow-lg px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-start gap-4">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-0.5">Remember this categorisation?</p>
              <p className="text-xs text-gray-500 mb-2 truncate">
                You categorised <span className="font-mono text-gray-700">{shortDesc(rememberPrompt.description, 60)}</span> as <strong>{rememberPrompt.category}</strong>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">Pattern:</span>
                <input
                  value={rememberPattern}
                  onChange={e => setRememberPattern(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-amber-400 w-60"
                  placeholder="Keyword to match against description…"
                />
                <span className="text-xs text-gray-400">→</span>
                <span className="text-xs font-medium text-gray-700">{rememberPrompt.category}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveRule}
                disabled={ruleSaving || !rememberPattern.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {ruleSaving ? 'Saving…' : 'Save rule'}
              </button>
              <button
                onClick={() => setRememberPrompt(null)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
