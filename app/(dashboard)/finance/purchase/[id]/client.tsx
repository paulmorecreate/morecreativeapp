'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { PurchaseInvoice } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$', GBP: '£' }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
}

function fmt(currency: string, amount: number) {
  const sym = CURRENCY_SYMBOL[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Props = {
  invoice: PurchaseInvoice & { project: { id: string; name: string } | null }
  projects: { id: string; name: string }[]
}

export function PurchaseInvoiceDetailClient({ invoice, projects }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    invoice_number: invoice.invoice_number,
    supplier: invoice.supplier,
    project_id: invoice.project_id ?? '',
    currency: invoice.currency,
    net_amount: invoice.net_amount,
    vat_rate: invoice.vat_rate,
    fx_rate: invoice.fx_rate,
    issue_date: invoice.issue_date ?? '',
    due_date: invoice.due_date ?? '',
    status: invoice.status,
    notes: invoice.notes ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const vatAmount = form.net_amount * (form.vat_rate / 100)
  const grossAmount = form.net_amount + vatAmount
  const grossAed = grossAmount * form.fx_rate

  function backTarget() {
    return form.project_id ? `/projects/${form.project_id}?tab=finance` : '/finance?tab=purchase'
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('purchase_invoices').update({
      invoice_number: form.invoice_number,
      supplier: form.supplier,
      project_id: form.project_id || null,
      currency: form.currency,
      net_amount: Number(form.net_amount),
      vat_rate: Number(form.vat_rate),
      vat_amount: vatAmount,
      gross_amount: grossAmount,
      fx_rate: Number(form.fx_rate),
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      status: form.status,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', invoice.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('purchase_invoices').delete().eq('id', invoice.id)
    router.push(invoice.project_id ? `/projects/${invoice.project_id}?tab=finance` : '/finance?tab=purchase')
  }

  async function handleSaveAndClose() {
    await handleSave()
    router.push(backTarget())
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(backTarget())} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            {form.supplier || <span className="text-gray-300">New Purchase Invoice</span>}
          </h1>
          {form.invoice_number && (
            <p className="text-sm text-gray-400 mt-0.5">{form.invoice_number}</p>
          )}
          <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[form.status])}>
            {form.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        {/* Invoice Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Supplier</label>
              <Input
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Invoice Number</label>
              <Input
                value={form.invoice_number}
                onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                placeholder="e.g. FATTURA/13450 or leave blank"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Project</label>
              <Select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">— No project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PurchaseInvoice['status'] }))}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
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
          </div>
        </div>

        {/* Amounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Amounts</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Currency</label>
              <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value as PurchaseInvoice['currency'] }))}>
                <option value="AED">AED — UAE Dirham</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Net Amount ({form.currency})</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.net_amount}
                onChange={e => setForm(f => ({ ...f, net_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">VAT Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.vat_rate}
                onChange={e => setForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">FX Rate to AED</label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={form.fx_rate}
                onChange={e => setForm(f => ({ ...f, fx_rate: parseFloat(e.target.value) || 1 }))}
                placeholder="1.0000"
              />
            </div>
          </div>

          {/* Computed totals */}
          <div className="border-t border-gray-100 pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Net Amount</span>
                <span>{fmt(form.currency, form.net_amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT ({form.vat_rate}%)</span>
                <span>{fmt(form.currency, vatAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                <span>Gross Amount</span>
                <span>{fmt(form.currency, grossAmount)}</span>
              </div>
              {form.currency !== 'AED' && (
                <div className="flex justify-between text-gray-500 text-xs pt-1">
                  <span>≈ AED equivalent</span>
                  <span>{fmt('AED', grossAed)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <Textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes…"
            rows={3}
          />
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

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Purchase Invoice">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete the purchase invoice from <strong>{form.supplier || 'this supplier'}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
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
