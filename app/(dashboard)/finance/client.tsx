'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { Invoice, PurchaseInvoice } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
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

type InvoiceRow = Invoice & { project: { id: string; name: string } | null; line_items?: { rate: number; qty: number }[] }
type PurchaseInvoiceRow = PurchaseInvoice & { project: { id: string; name: string } | null }

type Props = {
  invoices: InvoiceRow[]
  purchaseInvoices: PurchaseInvoiceRow[]
  initialTab: 'sales' | 'purchase'
}

const SALE_STATUS_FILTERS = ['all', 'draft', 'sent', 'paid'] as const
const PO_STATUS_FILTERS = ['all', 'pending', 'partial', 'paid'] as const

export function FinanceClient({ invoices, purchaseInvoices, initialTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'sales' | 'purchase'>(initialTab)
  const [saleFilter, setSaleFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all')
  const [poFilter, setPoFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all')
  const [creating, setCreating] = useState(false)
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<InvoiceRow | null>(null)
  const [deletePoTarget, setDeletePoTarget] = useState<PurchaseInvoiceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredSales = saleFilter === 'all' ? invoices : invoices.filter(i => i.status === saleFilter)
  const filteredPo = poFilter === 'all' ? purchaseInvoices : purchaseInvoices.filter(i => i.status === poFilter)

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
        ) : (
          <Button onClick={handleNewPurchaseInvoice} disabled={creating}>
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'New Purchase Invoice'}
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['sales', 'purchase'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'sales' ? 'Sales Invoices' : 'Purchase Invoices'}
          </button>
        ))}
      </div>

      {/* Sales Invoices tab */}
      {tab === 'sales' && (
        <>
          <div className="flex gap-2 mb-5">
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

          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No sales invoices yet.</p>
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
          <div className="flex gap-2 mb-5">
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

          {filteredPo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No purchase invoices yet.</p>
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
