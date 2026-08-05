'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { Invoice } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$' }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
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
type Props = { invoices: InvoiceRow[] }

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid'] as const

export function FinanceClient({ invoices }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  async function handleNewInvoice() {
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

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('invoices').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invoices across all projects</p>
        </div>
        <Button onClick={handleNewInvoice} disabled={creating}>
          <Plus className="w-3.5 h-3.5" />
          {creating ? 'Creating…' : 'New Invoice'}
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-5">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all',
              filter === s
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No invoices yet.</p>
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
              {filtered.map(inv => (
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
                      <Link
                        href={`/projects/${inv.project.id}`}
                        onClick={e => e.stopPropagation()}
                        className="hover:text-gray-900 transition-colors"
                      >
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
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[inv.status] ?? '')}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(inv) }}
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

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete invoice?">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-medium text-red-800">{deleteTarget.invoice_number}</p>
              <p className="text-sm text-red-600 mt-0.5">
                {deleteTarget.billed_to_name ?? 'No recipient'}
                {deleteTarget.billed_to_company ? ` · ${deleteTarget.billed_to_company}` : ''}
              </p>
              {invoiceTotal(deleteTarget) > 0 && (
                <p className="text-sm text-red-600 mt-0.5">
                  {formatAmount(deleteTarget.currency, invoiceTotal(deleteTarget))}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              This will permanently delete the invoice and all its line items. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmDelete}
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
