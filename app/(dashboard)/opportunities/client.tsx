'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Pencil } from 'lucide-react'
import { Opportunity } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type SimpleRecord = { id: string; name: string }

const statusOpts = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const typeOpts = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'carpet', label: 'Red Carpet' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'photoshoot', label: 'Photoshoot' },
  { value: 'cover', label: 'Magazine Cover' },
  { value: 'collaboration', label: 'Collaboration' },
]

const priorityOpts = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

interface Props {
  opportunities: Opportunity[]
  talents: SimpleRecord[]
  brands: SimpleRecord[]
  events: SimpleRecord[]
}

export function OpportunitiesClient({ opportunities, talents, brands, events }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    talent_id: '', brand_id: '', event_id: '', type: '',
    status: 'prospect', priority: 'medium', estimated_value: '',
    follow_up: '', notes: '',
  })
  const [editForm, setEditForm] = useState({
    talent_id: '', brand_id: '', event_id: '', type: '',
    status: 'prospect', priority: 'medium', estimated_value: '',
    follow_up: '', notes: '',
  })

  function openEdit(opp: Opportunity) {
    setEditForm({
      talent_id: opp.talent_id ?? '',
      brand_id: opp.brand_id ?? '',
      event_id: opp.event_id ?? '',
      type: opp.type ?? '',
      status: opp.status ?? 'prospect',
      priority: opp.priority ?? 'medium',
      estimated_value: opp.estimated_value != null ? String(opp.estimated_value) : '',
      follow_up: opp.follow_up ?? '',
      notes: opp.notes ?? '',
    })
    setEditOpp(opp)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editOpp) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({
      talent_id: editForm.talent_id || null,
      brand_id: editForm.brand_id || null,
      event_id: editForm.event_id || null,
      type: editForm.type || null,
      status: editForm.status,
      priority: editForm.priority,
      estimated_value: editForm.estimated_value ? parseFloat(editForm.estimated_value) : null,
      follow_up: editForm.follow_up || null,
      notes: editForm.notes || null,
    }).eq('id', editOpp.id)
    setSaving(false)
    setEditOpp(null)
    router.refresh()
  }

  function editField(k: keyof typeof editForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditForm(f => ({ ...f, [k]: e.target.value }))
  }

  const filtered = opportunities.filter(o => {
    const talentName = (o.talent as { name: string } | null)?.name ?? ''
    const brandName = (o.brand as { name: string } | null)?.name ?? ''
    const q = search.toLowerCase()
    const matchSearch = !search || talentName.toLowerCase().includes(q) || brandName.toLowerCase().includes(q)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload: Record<string, unknown> = {
      talent_id: form.talent_id || null,
      brand_id: form.brand_id || null,
      event_id: form.event_id || null,
      type: form.type || null,
      status: form.status,
      priority: form.priority,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      follow_up: form.follow_up || null,
      notes: form.notes || null,
    }
    await supabase.from('opportunities').insert(payload)
    setSaving(false)
    setOpen(false)
    setForm({ talent_id: '', brand_id: '', event_id: '', type: '', status: 'prospect', priority: 'medium', estimated_value: '', follow_up: '', notes: '' })
    router.refresh()
  }

  const totalValue = filtered.reduce((s, o) => s + (o.estimated_value ?? 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} shown · {totalValue > 0 ? `${formatCurrency(totalValue)} pipeline` : 'no value tracked'}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Opportunity
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search talent or brand…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All statuses</option>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Talent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Brand</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Event</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Priority</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Value</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || statusFilter ? 'No results.' : 'No opportunities yet.'}
                </td>
              </tr>
            )}
            {filtered.map(opp => (
              <tr key={opp.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/opportunities/${opp.id}`)}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {(opp.talent as { name: string } | null)?.name ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {(opp.brand as { name: string } | null)?.name ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {(opp.event as { name: string } | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs capitalize">{opp.type?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-4 py-3"><Badge value={opp.status} /></td>
                <td className="px-4 py-3"><Badge value={opp.priority} /></td>
                <td className="px-4 py-3 text-right text-gray-600 font-medium">
                  {opp.estimated_value ? formatCurrency(opp.estimated_value) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => { e.stopPropagation(); openEdit(opp) }}>
                  <button className="text-gray-300 hover:text-gray-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Opportunity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select
                value={form.talent_id}
                onChange={field('talent_id')}
                options={talents.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select talent…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select
                value={form.brand_id}
                onChange={field('brand_id')}
                options={brands.map(b => ({ value: b.id, label: b.name }))}
                placeholder="Select brand…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Event</label>
              <Select
                value={form.event_id}
                onChange={field('event_id')}
                options={events.map(e => ({ value: e.id, label: e.name }))}
                placeholder="Select event…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select value={form.type} onChange={field('type')} options={typeOpts} placeholder="Select type…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={form.status} onChange={field('status')} options={statusOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Priority</label>
              <Select value={form.priority} onChange={field('priority')} options={priorityOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Value (€)</label>
              <Input type="number" value={form.estimated_value} onChange={field('estimated_value')} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up</label>
            <Input value={form.follow_up} onChange={field('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Context, details…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editOpp} onClose={() => setEditOpp(null)} title="Edit Opportunity">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select value={editForm.talent_id} onChange={editField('talent_id')} options={talents.map(t => ({ value: t.id, label: t.name }))} placeholder="Select talent…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select value={editForm.brand_id} onChange={editField('brand_id')} options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="Select brand…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Event</label>
              <Select value={editForm.event_id} onChange={editField('event_id')} options={events.map(e => ({ value: e.id, label: e.name }))} placeholder="Select event…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select value={editForm.type} onChange={editField('type')} options={typeOpts} placeholder="Select type…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={editForm.status} onChange={editField('status')} options={statusOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Priority</label>
              <Select value={editForm.priority} onChange={editField('priority')} options={priorityOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Value (€)</label>
              <Input type="number" value={editForm.estimated_value} onChange={editField('estimated_value')} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up</label>
            <Input value={editForm.follow_up} onChange={editField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={editForm.notes} onChange={editField('notes')} rows={2} placeholder="Context, details…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpp(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
