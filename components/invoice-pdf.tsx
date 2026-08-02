import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { Invoice, InvoiceSettings, InvoiceLineItem } from '@/lib/supabase/types'

const BLUE = '#4a90a4'
const LIGHT_GRAY = '#f5f5f5'
const BORDER = '#e0e0e0'

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 50, paddingLeft: 50, paddingRight: 50, fontSize: 9, fontFamily: 'Helvetica', color: '#222222', backgroundColor: '#ffffff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  logoBlock: { flexDirection: 'column', gap: 4 },
  logoImg: { width: 60, height: 60, objectFit: 'contain' },
  logoName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#333', marginTop: 4 },
  companyBlock: { alignItems: 'flex-end' },
  companyText: { fontSize: 9, color: '#444', textAlign: 'right', lineHeight: 1.5 },

  // Info row
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-start' },
  billedToBlock: { flex: 1 },
  billedToLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  billedToText: { fontSize: 9, color: '#222', lineHeight: 1.5 },
  datesBlock: { flex: 1, paddingLeft: 20 },
  datesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  datesValue: { fontSize: 9, color: '#222', marginBottom: 10 },
  invoiceNumBlock: { flex: 1, paddingLeft: 20 },
  amountBlock: { flex: 1.5, alignItems: 'flex-end' },
  amountLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#111' },

  // Divider
  divider: { borderBottomWidth: 1.5, borderBottomColor: BLUE, marginBottom: 16 },

  // Line items table
  tableHeader: { flexDirection: 'row', backgroundColor: LIGHT_GRAY, borderTopWidth: 0.5, borderTopColor: BORDER, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingVertical: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingVertical: 7 },
  colDesc: { flex: 4, paddingHorizontal: 8 },
  colRate: { flex: 1.5, paddingHorizontal: 8, textAlign: 'right' },
  colQty: { width: 40, paddingHorizontal: 8, textAlign: 'center' },
  colTotal: { flex: 1.5, paddingHorizontal: 8, textAlign: 'right' },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 12, marginBottom: 20 },
  totalsRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: '#555' },
  totalsValue: { fontSize: 9, color: '#222' },
  totalsDivider: { width: 220, borderBottomWidth: 0.5, borderBottomColor: BORDER, marginVertical: 4 },
  amountDueRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 3 },
  amountDueLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE },
  amountDueValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE },

  // Notes / bank details
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 8.5, color: '#444', lineHeight: 1.6 },
})

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$' }

function fmt(currency: string, amount: number) {
  const sym = CURRENCY_SYMBOL[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function InvoiceDocument({
  invoice,
  lineItems,
  settings,
}: {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
  settings: InvoiceSettings
}) {
  const currency = invoice.currency
  const subtotal = lineItems.reduce((s, l) => s + l.rate * l.qty, 0)
  const tax = invoice.apply_vat ? subtotal * 0.05 : 0
  const total = subtotal + tax
  const amountDue = total - invoice.amount_paid

  const billedToLines = [
    invoice.billed_to_name,
    invoice.billed_to_company,
    invoice.billed_to_address,
  ].filter(Boolean).join('\n')

  const companyLines = [
    settings.company_name,
    settings.company_phone,
    settings.company_address,
    settings.company_vat_number ? `VAT Number ${settings.company_vat_number}` : null,
  ].filter(Boolean).join('\n')

  const bankDetails = [
    'BANK DETAILS',
    settings.bank_account_holder ? `Account Holder Name : ${settings.bank_account_holder}` : null,
    settings.bank_name ? `Bank Name : ${settings.bank_name}` : null,
    settings.bank_account_number ? `Account Number : ${settings.bank_account_number}` : null,
    settings.bank_iban ? `IBAN : ${settings.bank_iban}` : null,
    settings.bank_swift ? `SWIFT/BIC: ${settings.bank_swift}` : null,
  ].filter(Boolean).join('\n')

  const notesText = [bankDetails, invoice.notes].filter(Boolean).join('\n\n')

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <Image src="/mc-logo.jpg" style={s.logoImg} />
            <Text style={s.logoName}>MORECREATIVE FZCO</Text>
          </View>
          <View style={s.companyBlock}>
            <Text style={s.companyText}>{companyLines}</Text>
          </View>
        </View>

        {/* Info row */}
        <View style={s.infoRow}>
          <View style={s.billedToBlock}>
            <Text style={s.billedToLabel}>Billed To</Text>
            <Text style={s.billedToText}>{billedToLines || '—'}</Text>
          </View>
          <View style={s.datesBlock}>
            <Text style={s.datesLabel}>Date of Issue</Text>
            <Text style={s.datesValue}>{fmtDate(invoice.issue_date)}</Text>
            <Text style={s.datesLabel}>Due Date</Text>
            <Text style={s.datesValue}>{fmtDate(invoice.due_date)}</Text>
          </View>
          <View style={s.invoiceNumBlock}>
            <Text style={s.datesLabel}>Invoice Number</Text>
            <Text style={s.datesValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={s.amountBlock}>
            <Text style={s.amountLabel}>Amount Due ({currency})</Text>
            <Text style={s.amountValue}>{fmt(currency, amountDue)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Line items table */}
        <View style={s.tableHeader}>
          <View style={s.colDesc}><Text style={s.tableHeaderText}>Description</Text></View>
          <View style={s.colRate}><Text style={s.tableHeaderText}>Rate</Text></View>
          <View style={s.colQty}><Text style={s.tableHeaderText}>Qty</Text></View>
          <View style={s.colTotal}><Text style={s.tableHeaderText}>Line Total</Text></View>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <View style={s.colDesc}><Text>{item.description}</Text></View>
            <View style={s.colRate}><Text style={{ textAlign: 'right' }}>{fmt(currency, item.rate)}</Text></View>
            <View style={s.colQty}><Text style={{ textAlign: 'center' }}>{item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toString()}</Text></View>
            <View style={s.colTotal}><Text style={{ textAlign: 'right' }}>{fmt(currency, item.rate * item.qty)}</Text></View>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Tax{invoice.apply_vat ? ' (UAE VAT 5%)' : ''}</Text>
            <Text style={s.totalsValue}>{tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.totalsDivider} />
          <View style={s.totalsRow}>
            <Text style={{ ...s.totalsLabel, fontFamily: 'Helvetica-Bold' }}>Total</Text>
            <Text style={{ ...s.totalsValue, fontFamily: 'Helvetica-Bold' }}>{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Amount Paid</Text>
            <Text style={s.totalsValue}>{invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={s.totalsDivider} />
          <View style={s.amountDueRow}>
            <Text style={s.amountDueLabel}>Amount Due ({currency})</Text>
            <Text style={s.amountDueValue}>{fmt(currency, amountDue)}</Text>
          </View>
        </View>

        {/* Notes / bank details */}
        {notesText ? (
          <View>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{notesText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
