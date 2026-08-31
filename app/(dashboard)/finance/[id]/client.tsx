'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Invoice, InvoiceLineItem, InvoiceSettings } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const InvoicePDFDownload = dynamic(
  () => import('@/components/invoice-pdf-download').then(m => m.InvoicePDFDownload),
  { ssr: false, loading: () => <Button disabled>Download PDF</Button> }
)

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$' }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-700',
  received: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}

function fmt(currency: string, amount: number) {
  const sym = CURRENCY_SYMBOL[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Props = {
  invoice: Invoice & { project: { id: string; name: string } | null }
  lineItems: InvoiceLineItem[]
  settings: InvoiceSettings
  projects: { id: string; name: string }[]
  returnTo?: string
}

export function InvoiceDetailClient({ invoice, lineItems: initialLineItems, settings, projects, returnTo }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    invoice_number: invoice.invoice_number,
    project_id: invoice.project_id ?? '',
    currency: invoice.currency,
    apply_vat: invoice.apply_vat,
    status: invoice.status,
    issue_date: invoice.issue_date ?? '',
    due_date: invoice.due_date ?? '',
    billed_to_name: invoice.billed_to_name ?? '',
    billed_to_company: invoice.billed_to_company ?? '',
    billed_to_address: invoice.billed_to_address ?? '',
    amount_paid: invoice.amount_paid,
    notes: invoice.notes ?? '',
  })

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(initialLineItems)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const currency = form.currency
  const subtotal = lineItems.reduce((s, l) => s + l.rate * l.qty, 0)
  const tax = form.apply_vat ? subtotal * 0.05 : 0
  const total = subtotal + tax
  const amountDue = total - form.amount_paid

  const pdfInvoice: Invoice = { ...invoice, ...form, amount_paid: Number(form.amount_paid) }

  async function handleSave() {
    setSaving(true)
    await supabase.from('invoices').update({
      invoice_number: form.invoice_number,
      project_id: form.project_id || null,
      currency: form.currency,
      apply_vat: form.apply_vat,
      status: form.status,
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      billed_to_name: form.billed_to_name || null,
      billed_to_company: form.billed_to_company || null,
      billed_to_address: form.billed_to_address || null,
      amount_paid: Number(form.amount_paid),
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', invoice.id)

    // Upsert line items: delete removed, upsert existing/new
    const { data: existing } = await supabase
      .from('invoice_line_items')
      .select('id')
      .eq('invoice_id', invoice.id)

    const existingIds = (existing ?? []).map(r => r.id)
    const currentIds = lineItems.filter(l => !l.id.startsWith('new-')).map(l => l.id)
    const toDelete = existingIds.filter(id => !currentIds.includes(id))

    if (toDelete.length) {
      await supabase.from('invoice_line_items').delete().in('id', toDelete)
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i]
      if (item.id.startsWith('new-')) {
        await supabase.from('invoice_line_items').insert({
          invoice_id: invoice.id,
          description: item.description,
          rate: item.rate,
          qty: item.qty,
          sort_order: i,
        })
      } else {
        await supabase.from('invoice_line_items').update({
          description: item.description,
          rate: item.rate,
          qty: item.qty,
          sort_order: i,
        }).eq('id', item.id)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  function backUrl() {
    if (returnTo) return returnTo
    return form.project_id ? `/projects/${form.project_id}?tab=finance` : '/finance'
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    router.push(returnTo ?? (invoice.project_id ? `/projects/${invoice.project_id}?tab=finance` : '/finance'))
  }

  async function handleSaveAndClose() {
    await handleSave()
    router.push(backUrl())
  }

  function addLineItem() {
    setLineItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      invoice_id: invoice.id,
      description: '',
      rate: 0,
      qty: 1,
      sort_order: prev.length,
      created_at: '',
    }])
  }

  function updateLineItem(idx: number, field: keyof InvoiceLineItem, value: string | number) {
    setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function removeLineItem(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(backUrl())} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{form.invoice_number}</h1>
          <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[form.status])}>
            {form.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* PDF download */}
          <InvoicePDFDownload
            invoice={pdfInvoice}
            lineItems={lineItems}
            settings={settings}
            fileName={`${form.invoice_number}.pdf`}
          />
          <Button variant="secondary" onClick={handleSaveAndClose} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Close'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Invoice meta */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Invoice Number</label>
              <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Project</label>
              <Select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">— No project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Currency</label>
              <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'AED' | 'EUR' | 'USD' }))}>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="AED">AED — UAE Dirham</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Invoice['status'] }))}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Issue Date</label>
              <Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Due Date</label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="apply_vat"
                checked={form.apply_vat}
                onChange={e => setForm(f => ({ ...f, apply_vat: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 accent-gray-900"
              />
              <label htmlFor="apply_vat" className="text-sm text-gray-700 cursor-pointer">Apply UAE VAT (5%)</label>
            </div>
          </div>

          {form.status === 'partial' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800">Partial Payment</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-amber-700">Amount Received ({currency})</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_paid}
                    onChange={e => setForm(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-amber-700">Still Outstanding ({currency})</label>
                  <div className="h-9 flex items-center px-3 rounded-lg bg-white border border-amber-200 text-sm font-semibold text-amber-800">
                    {fmt(currency, Math.max(0, total - form.amount_paid))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Billed To */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Billed To</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Contact Name</label>
              <Input value={form.billed_to_name} onChange={e => setForm(f => ({ ...f, billed_to_name: e.target.value }))} placeholder="Kim Feenstra" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Company</label>
              <Input value={form.billed_to_company} onChange={e => setForm(f => ({ ...f, billed_to_company: e.target.value }))} placeholder="K2IM Holding" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-600">Address</label>
              <Textarea
                value={form.billed_to_address}
                onChange={e => setForm(f => ({ ...f, billed_to_address: e.target.value }))}
                placeholder={"Melbournestraat 45\nLijnden\nNetherlands"}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
            <Button variant="secondary" onClick={addLineItem}>
              <Plus className="w-3.5 h-3.5" />
              Add Line
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No line items yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_120px_80px_100px_32px] gap-2 text-xs font-semibold text-gray-500 px-1">
                <span>Description</span>
                <span>Rate ({currency})</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              {lineItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_120px_80px_100px_32px] gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={e => updateLineItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.rate}
                    onChange={e => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.qty}
                    onChange={e => updateLineItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                    className="text-center"
                  />
                  <div className="text-sm text-right text-gray-700 font-medium pr-1">
                    {fmt(currency, item.rate * item.qty)}
                  </div>
                  <button
                    onClick={() => removeLineItem(idx)}
                    className="text-gray-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-gray-100 pt-4 flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(currency, subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax {form.apply_vat ? '(UAE VAT 5%)' : ''}</span>
                <span>{fmt(currency, tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                <span>Total</span>
                <span>{fmt(currency, total)}</span>
              </div>
              {form.status !== 'partial' && (
                <div className="flex justify-between text-gray-600 items-center gap-2">
                  <span className="shrink-0">Amount Paid</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_paid}
                    onChange={e => setForm(f => ({ ...f, amount_paid: parseFloat(e.target.value) || 0 }))}
                    className="w-28 text-right"
                  />
                </div>
              )}
              {form.status === 'partial' && form.amount_paid > 0 && (
                <div className="flex justify-between text-amber-700 items-center gap-2">
                  <span className="shrink-0">Amount Paid</span>
                  <span className="font-medium">{fmt(currency, form.amount_paid)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-blue-700 border-t border-gray-100 pt-1.5">
                <span>Amount Due ({currency})</span>
                <span>{fmt(currency, amountDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <Textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes for this invoice…"
            rows={3}
          />
          <p className="text-xs text-gray-400">Bank details are added automatically to the PDF from Invoice Settings in Admin.</p>
        </div>

        {/* Danger */}
        <div className="flex justify-end pb-4">
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Delete invoice
          </button>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Invoice">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete invoice <strong>{form.invoice_number}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
