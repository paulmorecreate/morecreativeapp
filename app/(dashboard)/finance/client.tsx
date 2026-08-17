'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, Trash2, X, ExternalLink, Pencil, ChevronUp, ChevronDown } from 'lucide-react'
import { Invoice, PurchaseInvoice, CurrencyRate, AnnualExpense } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$', GBP: '£' }

const SALE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
}

const PO_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
}

function fmtAed(amount: number) {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAmount(currency: string, amount: number) {
  const sym = CURRENCY_SYMBOL[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function invoiceTotal(inv: Invoice & { line_items?: { rate: number; qty: number }[] }) {
  const subtotal = (inv.line_items ?? []).reduce((s, l) => s + l.rate * l.qty, 0)
  return subtotal + (inv.apply_vat ? subtotal * 0.05 : 0)
}

function rateToAed(currency: string, rates: CurrencyRate[]): number {
  if (currency === 'AED') return 1
  return rates.find(r => r.currency === currency)?.rate_to_aed ?? 1
}

type InvoiceRow = Invoice & { project: { id: string; name: string } | null; line_items?: { rate: number; qty: number }[] }
type PurchaseInvoiceRow = PurchaseInvoice & { project: { id: string; name: string } | null }

type Props = {
  invoices: InvoiceRow[]
  purchaseInvoices: PurchaseInvoiceRow[]
  currencyRates: CurrencyRate[]
  annualExpenses: AnnualExpense[]
  initialTab: 'sales' | 'purchase' | 'annual'
}

const ANNUAL_CATEGORIES = ['Licence', 'Office', 'Insurance', 'Visa', 'Other']

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function AnnualStatusBadge({ dueDate }: { dueDate: string | null }) {
  const days = daysUntil(dueDate)
  if (days === null) return <span className="text-gray-300 text-xs">—</span>
  if (days < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Overdue</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Due Soon</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">OK</span>
}

const SALE_STATUS_FILTERS = ['all', 'draft', 'sent', 'paid'] as const
const PO_STATUS_FILTERS = ['all', 'pending', 'partial', 'paid'] as const

function SummaryBar({ paid, pending }: { paid: number; pending: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3.5">
        <p className="text-xs font-medium text-green-600 mb-0.5">Total Paid</p>
        <p className="text-lg font-semibold text-green-800">{fmtAed(paid)}</p>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3.5">
        <p className="text-xs font-medium text-amber-600 mb-0.5">Total Pending</p>
        <p className="text-lg font-semibold text-amber-800">{fmtAed(pending)}</p>
      </div>
    </div>
  )
}

const EMPTY_ANNUAL_FORM = { item: '', category: 'Licence', amount_aed: '', due_date: '', notes: '', document_url: '' }

export function FinanceClient({ invoices, purchaseInvoices, currencyRates, annualExpenses: initialAnnualExpenses, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'sales' | 'purchase' | 'annual'>(initialTab)
  const [saleFilter, setSaleFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all')
  const [poFilter, setPoFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all')
  const [saleDueFrom, setSaleDueFrom] = useState('')
  const [saleDueTo, setSaleDueTo] = useState('')
  const [poDueFrom, setPoDueFrom] = useState('')
  const [poDueTo, setPoDueTo] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<InvoiceRow | null>(null)
  const [deletePoTarget, setDeletePoTarget] = useState<PurchaseInvoiceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Annual expenses state
  const [annualExpenses, setAnnualExpenses] = useState<AnnualExpense[]>(initialAnnualExpenses)
  const [annualForm, setAnnualForm] = useState(EMPTY_ANNUAL_FORM)
  const [annualModalOpen, setAnnualModalOpen] = useState(false)
  const [editingAnnual, setEditingAnnual] = useState<AnnualExpense | null>(null)
  const [annualSaving, setAnnualSaving] = useState(false)
  const [deleteAnnualTarget, setDeleteAnnualTarget] = useState<AnnualExpense | null>(null)
  const [annualDeleting, setAnnualDeleting] = useState(false)
  const [annualSortCol, setAnnualSortCol] = useState<'item' | 'category' | 'due_date' | 'amount_aed'>('due_date')
  const [annualSortDir, setAnnualSortDir] = useState<'asc' | 'desc'>('asc')

  // Sales summaries (all invoices, no date filter applied to summary)
  const saleSummary = useMemo(() => {
    let paid = 0, pending = 0
    for (const inv of invoices) {
      const fx = rateToAed(inv.currency, currencyRates)
      const total = invoiceTotal(inv) * fx
      if (inv.status === 'paid') paid += total
      else pending += total
    }
    return { paid, pending }
  }, [invoices, currencyRates])

  // Purchase summaries (all invoices, no date filter applied to summary)
  const poSummary = useMemo(() => {
    let paid = 0, pending = 0
    for (const inv of purchaseInvoices) {
      const aed = inv.gross_amount * inv.fx_rate
      if (inv.status === 'paid') paid += aed
      else pending += aed
    }
    return { paid, pending }
  }, [purchaseInvoices])

  // Annual expenses summary
  const annualSummary = useMemo(() => {
    const total = annualExpenses.reduce((s, e) => s + e.amount_aed, 0)
    const overdue = annualExpenses.filter(e => (daysUntil(e.due_date) ?? 1) < 0).length
    const dueSoon = annualExpenses.filter(e => { const d = daysUntil(e.due_date); return d !== null && d >= 0 && d <= 30 }).length
    return { total, overdue, dueSoon }
  }, [annualExpenses])

  // Annual expenses sorted
  const sortedAnnualExpenses = useMemo(() => {
    return [...annualExpenses].sort((a, b) => {
      let cmp = 0
      if (annualSortCol === 'item') cmp = a.item.localeCompare(b.item)
      else if (annualSortCol === 'category') cmp = a.category.localeCompare(b.category)
      else if (annualSortCol === 'amount_aed') cmp = a.amount_aed - b.amount_aed
      else {
        // due_date: nulls last regardless of direction
        if (!a.due_date && !b.due_date) cmp = 0
        else if (!a.due_date) return 1
        else if (!b.due_date) return -1
        else cmp = a.due_date.localeCompare(b.due_date)
      }
      return annualSortDir === 'asc' ? cmp : -cmp
    })
  }, [annualExpenses, annualSortCol, annualSortDir])

  function toggleAnnualSort(col: typeof annualSortCol) {
    if (annualSortCol === col) setAnnualSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setAnnualSortCol(col); setAnnualSortDir('asc') }
  }

  // Filtered sales invoices
  const filteredSales = useMemo(() => {
    return invoices.filter(inv => {
      if (saleFilter !== 'all' && inv.status !== saleFilter) return false
      if (saleDueFrom && (inv.due_date ?? '') < saleDueFrom) return false
      if (saleDueTo && (inv.due_date ?? '') > saleDueTo) return false
      return true
    })
  }, [invoices, saleFilter, saleDueFrom, saleDueTo])

  // Filtered purchase invoices
  const filteredPo = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      if (poFilter !== 'all' && inv.status !== poFilter) return false
      if (poDueFrom && (inv.due_date ?? '') < poDueFrom) return false
      if (poDueTo && (inv.due_date ?? '') > poDueTo) return false
      return true
    })
  }, [purchaseInvoices, poFilter, poDueFrom, poDueTo])

  async function handleNewSalesInvoice() {
    setCreating(true)
    const supabase = createClient()
    const year = new Date().getFullYear()
    const { data: last } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    let seq = 1
    if (last?.invoice_number) {
      const parts = last.invoice_number.split('-')
      seq = (parseInt(parts[1] ?? '0', 10) || 0) + 1
    }
    const invoice_number = `${year}-${String(seq).padStart(4, '0')}`

    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({ invoice_number, status: 'draft' })
      .select()
      .single()

    setCreating(false)
    if (!error && inv) router.push(`/finance/${inv.id}`)
  }

  async function handleNewPurchaseInvoice() {
    setCreating(true)
    const supabase = createClient()
    const { data: inv, error } = await supabase
      .from('purchase_invoices')
      .insert({ supplier: '', invoice_number: '', status: 'pending', currency: 'AED', net_amount: 0, vat_rate: 0, vat_amount: 0, gross_amount: 0, fx_rate: 1 })
      .select()
      .single()
    setCreating(false)
    if (!error && inv) router.push(`/finance/purchase/${inv.id}`)
  }

  function openNewAnnual() {
    setEditingAnnual(null)
    setAnnualForm(EMPTY_ANNUAL_FORM)
    setAnnualModalOpen(true)
  }

  function openEditAnnual(exp: AnnualExpense) {
    setEditingAnnual(exp)
    setAnnualForm({
      item: exp.item,
      category: exp.category,
      amount_aed: String(exp.amount_aed),
      due_date: exp.due_date ?? '',
      notes: exp.notes ?? '',
      document_url: exp.document_url ?? '',
    })
    setAnnualModalOpen(true)
  }

  async function handleSaveAnnual(e: React.FormEvent) {
    e.preventDefault()
    if (!annualForm.item.trim()) return
    setAnnualSaving(true)
    const supabase = createClient()
    const payload = {
      item: annualForm.item.trim(),
      category: annualForm.category,
      amount_aed: parseFloat(annualForm.amount_aed) || 0,
      due_date: annualForm.due_date || null,
      notes: annualForm.notes.trim() || null,
      document_url: annualForm.document_url.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (editingAnnual) {
      const { data } = await supabase.from('annual_expenses').update(payload).eq('id', editingAnnual.id).select().single()
      if (data) setAnnualExpenses(prev => prev.map(e => e.id === editingAnnual.id ? data as AnnualExpense : e))
    } else {
      const { data } = await supabase.from('annual_expenses').insert(payload).select().single()
      if (data) setAnnualExpenses(prev => [...prev, data as AnnualExpense].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')))
    }
    setAnnualSaving(false)
    setAnnualModalOpen(false)
  }

  async function handleDeleteAnnual() {
    if (!deleteAnnualTarget) return
    setAnnualDeleting(true)
    const supabase = createClient()
    await supabase.from('annual_expenses').delete().eq('id', deleteAnnualTarget.id)
    setAnnualExpenses(prev => prev.filter(e => e.id !== deleteAnnualTarget.id))
    setAnnualDeleting(false)
    setDeleteAnnualTarget(null)
  }

  async function handleConfirmDeleteSale() {
    if (!deleteSaleTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('invoices').delete().eq('id', deleteSaleTarget.id)
    setDeleting(false)
    setDeleteSaleTarget(null)
    router.refresh()
  }

  async function handleConfirmDeletePo() {
    if (!deletePoTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('purchase_invoices').delete().eq('id', deletePoTarget.id)
    setDeleting(false)
    setDeletePoTarget(null)
    router.refresh()
  }

  const saleDateFiltered = saleDueFrom || saleDueTo
  const poDDateFiltered = poDueFrom || poDueTo

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invoices across all projects</p>
        </div>
        {tab === 'sales' ? (
          <Button onClick={handleNewSalesInvoice} disabled={creating}>
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'New Sales Invoice'}
          </Button>
        ) : tab === 'purchase' ? (
          <Button onClick={handleNewPurchaseInvoice} disabled={creating}>
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'New Purchase Invoice'}
          </Button>
        ) : (
          <Button onClick={openNewAnnual}>
            <Plus className="w-3.5 h-3.5" />
            Add Expense
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['sales', 'purchase', 'annual'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'sales' ? 'Sales Invoices' : t === 'purchase' ? 'Purchase Invoices' : 'Annual Expenses'}
          </button>
        ))}
      </div>

      {/* Sales Invoices tab */}
      {tab === 'sales' && (
        <>
          <SummaryBar paid={saleSummary.paid} pending={saleSummary.pending} />

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex gap-2">
              {SALE_STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setSaleFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all',
                    saleFilter === s
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400 font-medium">Due date</span>
              <Input
                type="date"
                value={saleDueFrom}
                onChange={e => setSaleDueFrom(e.target.value)}
                className="w-36 text-xs py-1.5"
                placeholder="From"
              />
              <span className="text-xs text-gray-400">→</span>
              <Input
                type="date"
                value={saleDueTo}
                onChange={e => setSaleDueTo(e.target.value)}
                className="w-36 text-xs py-1.5"
                placeholder="To"
              />
              {saleDateFiltered && (
                <button
                  onClick={() => { setSaleDueFrom(''); setSaleDueTo('') }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No sales invoices match these filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Billed To</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Project</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Issue Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSales.map(inv => (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/finance/${inv.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                      <td className="px-5 py-3 text-gray-700">
                        <div>{inv.billed_to_name ?? <span className="text-gray-300">—</span>}</div>
                        {inv.billed_to_company && <div className="text-xs text-gray-400">{inv.billed_to_company}</div>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {inv.project ? (
                          <Link href={`/projects/${inv.project.id}`} onClick={e => e.stopPropagation()} className="hover:text-gray-900 transition-colors">
                            {inv.project.name}
                          </Link>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(inv.issue_date)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(inv.due_date)}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatAmount(inv.currency, invoiceTotal(inv))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', SALE_STATUS_STYLES[inv.status] ?? '')}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteSaleTarget(inv) }}
                          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Purchase Invoices tab */}
      {tab === 'purchase' && (
        <>
          <SummaryBar paid={poSummary.paid} pending={poSummary.pending} />

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex gap-2">
              {PO_STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setPoFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all',
                    poFilter === s
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-400 font-medium">Due date</span>
              <Input
                type="date"
                value={poDueFrom}
                onChange={e => setPoDueFrom(e.target.value)}
                className="w-36 text-xs py-1.5"
                placeholder="From"
              />
              <span className="text-xs text-gray-400">→</span>
              <Input
                type="date"
                value={poDueTo}
                onChange={e => setPoDueTo(e.target.value)}
                className="w-36 text-xs py-1.5"
                placeholder="To"
              />
              {poDDateFiltered && (
                <button
                  onClick={() => { setPoDueFrom(''); setPoDueTo('') }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredPo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No purchase invoices match these filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Supplier</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Project</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Issue Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Gross Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPo.map(inv => (
                    <tr
                      key={inv.id}
                      onClick={() => router.push(`/finance/purchase/${inv.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {inv.invoice_number || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{inv.supplier || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {inv.project ? (
                          <Link href={`/projects/${inv.project.id}`} onClick={e => e.stopPropagation()} className="hover:text-gray-900 transition-colors">
                            {inv.project.name}
                          </Link>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(inv.issue_date)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(inv.due_date)}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatAmount(inv.currency, inv.gross_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', PO_STATUS_STYLES[inv.status] ?? '')}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setDeletePoTarget(inv) }}
                          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Annual Expenses tab */}
      {tab === 'annual' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="col-span-1 bg-white border border-gray-200 rounded-xl px-5 py-3.5">
              <p className="text-xs font-medium text-gray-400 mb-0.5">Total Annual</p>
              <p className="text-lg font-semibold text-gray-900">{fmtAed(annualSummary.total)}</p>
            </div>
            <div className={cn('rounded-xl px-5 py-3.5', annualSummary.overdue > 0 ? 'bg-red-50 border border-red-100' : 'bg-white border border-gray-200')}>
              <p className={cn('text-xs font-medium mb-0.5', annualSummary.overdue > 0 ? 'text-red-600' : 'text-gray-400')}>Overdue</p>
              <p className={cn('text-lg font-semibold', annualSummary.overdue > 0 ? 'text-red-800' : 'text-gray-400')}>{annualSummary.overdue}</p>
            </div>
            <div className={cn('rounded-xl px-5 py-3.5', annualSummary.dueSoon > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-white border border-gray-200')}>
              <p className={cn('text-xs font-medium mb-0.5', annualSummary.dueSoon > 0 ? 'text-amber-600' : 'text-gray-400')}>Due Within 30 Days</p>
              <p className={cn('text-lg font-semibold', annualSummary.dueSoon > 0 ? 'text-amber-800' : 'text-gray-400')}>{annualSummary.dueSoon}</p>
            </div>
          </div>

          {annualExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No annual expenses yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {([
                      { col: 'item', label: 'Item', align: 'left' },
                      { col: 'category', label: 'Category', align: 'left' },
                      { col: 'due_date', label: 'Due Date', align: 'left' },
                      { col: null, label: 'Days', align: 'center' },
                      { col: 'amount_aed', label: 'Amount (AED)', align: 'right' },
                      { col: null, label: 'Status', align: 'left' },
                      { col: null, label: 'Document', align: 'left' },
                      { col: null, label: 'Notes', align: 'left' },
                    ] as { col: typeof annualSortCol | null; label: string; align: string }[]).map(({ col, label, align }) => (
                      <th
                        key={label}
                        className={cn(
                          'px-5 py-3 text-xs font-semibold text-gray-500',
                          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                          col ? 'cursor-pointer select-none hover:text-gray-800 transition-colors' : ''
                        )}
                        onClick={col ? () => toggleAnnualSort(col) : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {col && annualSortCol === col && (
                            annualSortDir === 'asc'
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedAnnualExpenses.map(exp => {
                    const days = daysUntil(exp.due_date)
                    return (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3 font-medium text-gray-900">{exp.item}</td>
                        <td className="px-5 py-3 text-gray-500">{exp.category}</td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(exp.due_date)}</td>
                        <td className="px-5 py-3 text-center text-gray-500">
                          {days !== null ? (
                            <span className={cn('text-xs font-medium', days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-gray-400')}>
                              {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {exp.amount_aed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3"><AnnualStatusBadge dueDate={exp.due_date} /></td>
                        <td className="px-5 py-3">
                          {exp.document_url ? (
                            <a
                              href={exp.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs max-w-[160px] truncate">{exp.notes || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => openEditAnnual(exp)} className="text-gray-300 hover:text-gray-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteAnnualTarget(exp)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500">Total</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                      {annualSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Annual Expense modal */}
      <Modal
        open={annualModalOpen}
        onClose={() => setAnnualModalOpen(false)}
        title={editingAnnual ? 'Edit Expense' : 'Add Annual Expense'}
      >
        <form onSubmit={handleSaveAnnual} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Item *</label>
            <Input
              value={annualForm.item}
              onChange={e => setAnnualForm(f => ({ ...f, item: e.target.value }))}
              placeholder="e.g. Licence Renewal"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select
                value={annualForm.category}
                onChange={e => setAnnualForm(f => ({ ...f, category: e.target.value }))}
                options={ANNUAL_CATEGORIES.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Amount (AED)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={annualForm.amount_aed}
                onChange={e => setAnnualForm(f => ({ ...f, amount_aed: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Due Date</label>
            <Input
              type="date"
              value={annualForm.due_date}
              onChange={e => setAnnualForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Document Link</label>
            <Input
              value={annualForm.document_url}
              onChange={e => setAnnualForm(f => ({ ...f, document_url: e.target.value }))}
              placeholder="https://drive.google.com/…"
              type="url"
            />
            <p className="text-xs text-gray-400">Paste the Google Drive link for the related document (e.g. licence certificate).</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea
              value={annualForm.notes}
              onChange={e => setAnnualForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes…"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAnnualModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={annualSaving} className="flex-1">
              {annualSaving ? 'Saving…' : editingAnnual ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete annual expense modal */}
      <Modal open={!!deleteAnnualTarget} onClose={() => setDeleteAnnualTarget(null)} title="Delete expense?">
        {deleteAnnualTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-medium text-red-800">{deleteAnnualTarget.item}</p>
              <p className="text-sm text-red-600 mt-0.5">AED {deleteAnnualTarget.amount_aed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <p className="text-sm text-gray-600">This will permanently delete this expense. This cannot be undone.</p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setDeleteAnnualTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleDeleteAnnual}
                disabled={annualDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {annualDeleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete sales invoice modal */}
      <Modal open={!!deleteSaleTarget} onClose={() => setDeleteSaleTarget(null)} title="Delete sales invoice?">
        {deleteSaleTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-medium text-red-800">{deleteSaleTarget.invoice_number}</p>
              <p className="text-sm text-red-600 mt-0.5">
                {deleteSaleTarget.billed_to_name ?? 'No recipient'}
                {deleteSaleTarget.billed_to_company ? ` · ${deleteSaleTarget.billed_to_company}` : ''}
              </p>
            </div>
            <p className="text-sm text-gray-600">This will permanently delete the invoice and all its line items. This cannot be undone.</p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setDeleteSaleTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmDeleteSale}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete purchase invoice modal */}
      <Modal open={!!deletePoTarget} onClose={() => setDeletePoTarget(null)} title="Delete purchase invoice?">
        {deletePoTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-medium text-red-800">
                {deletePoTarget.supplier || 'No supplier'}
              </p>
              {deletePoTarget.invoice_number && (
                <p className="text-sm text-red-600 mt-0.5">{deletePoTarget.invoice_number}</p>
              )}
              {deletePoTarget.gross_amount > 0 && (
                <p className="text-sm text-red-600 mt-0.5">{formatAmount(deletePoTarget.currency, deletePoTarget.gross_amount)}</p>
              )}
            </div>
            <p className="text-sm text-gray-600">This will permanently delete the purchase invoice. This cannot be undone.</p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setDeletePoTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmDeletePo}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
