'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, ExternalLink } from 'lucide-react'
import { Opportunity, Conversation, Talent, Brand, Event } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

type SimpleRecord = { id: string; name: string }

type OppWithRelations = Opportunity & {
  talent: Talent | null
  brand: (Brand & { link?: string | null }) | null
  event: Event | null
}

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

type Props = {
  opp: OppWithRelations
  conversations: Conversation[]
  talents: SimpleRecord[]
  brands: SimpleRecord[]
  events: SimpleRecord[]
}

export function OpportunityDetailClient({ opp, conversations, talents, brands, events }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
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

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({
      talent_id: form.talent_id || null,
      brand_id: form.brand_id || null,
      event_id: form.event_id || null,
      type: form.type || null,
      status: form.status,
      priority: form.priority,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      follow_up: form.follow_up || null,
      notes: form.notes || null,
    }).eq('id', opp.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  const talentName = opp.talent?.name
  const brandName = opp.brand?.name
  const title = [talentName, brandName].filter(Boolean).join(' × ') || 'Unnamed Opportunity'

  return (
    <div>
      <div className="mb-6">
        <Link href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Opportunities
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">
              {opp.type?.replace(/_/g, ' ') ?? 'No type'}
              {opp.event && <> · {opp.event.name}</>}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Status</dt>
                <dd><Badge value={opp.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Priority</dt>
                <dd><Badge value={opp.priority} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Value</dt>
                <dd className="text-sm text-gray-900">
                  {opp.estimated_value ? formatCurrency(opp.estimated_value) : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              {opp.follow_up && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Follow-up</dt>
                  <dd className="text-sm text-gray-700">{opp.follow_up}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Links</h2>
            <div className="space-y-2">
              {opp.talent && (
                <Link href={`/talents/${opp.talent.id}`} className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 group">
                  <span>{opp.talent.name}</span>
                  <span className="text-xs text-gray-300 group-hover:text-gray-500">Talent →</span>
                </Link>
              )}
              {opp.brand && (
                <Link href={`/brands/${opp.brand.id}`} className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 group">
                  <span>{opp.brand.name}</span>
                  <span className="text-xs text-gray-300 group-hover:text-gray-500">Brand →</span>
                </Link>
              )}
              {opp.event && (
                <Link href={`/events/${opp.event.id}`} className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 group">
                  <span>{opp.event.name}</span>
                  <span className="text-xs text-gray-300 group-hover:text-gray-500">Event →</span>
                </Link>
              )}
              {!opp.talent && !opp.brand && !opp.event && (
                <p className="text-sm text-gray-300">No linked entities.</p>
              )}
            </div>
          </div>

          {opp.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{opp.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <span className="text-xs text-gray-400">{conversations.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {conversations.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged for this opportunity.</p>
              )}
              {conversations.map(c => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={c.status} />
                    <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Opportunity">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select value={form.talent_id} onChange={field('talent_id')} options={talents.map(t => ({ value: t.id, label: t.name }))} placeholder="Select talent…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select value={form.brand_id} onChange={field('brand_id')} options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="Select brand…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Event</label>
              <Select value={form.event_id} onChange={field('event_id')} options={events.map(e => ({ value: e.id, label: e.name }))} placeholder="Select event…" />
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
            <Textarea value={form.notes} onChange={field('notes')} rows={3} placeholder="Context, details…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
