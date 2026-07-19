'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { Opportunity, Conversation, Talent, Brand, Event } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

const channelOpts = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
]

const convoStatusOpts = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

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
  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
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

  function convoField(k: keyof typeof convoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  function editConvoField(k: keyof typeof editConvoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleLogConvo(e: React.FormEvent) {
    e.preventDefault()
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').insert({
      entity_type: 'opportunity',
      entity_id: opp.id,
      channel: convoForm.channel || null,
      content: convoForm.content || null,
      follow_up: convoForm.follow_up || null,
      status: convoForm.status,
    })
    setConvoSaving(false)
    setLogConvoOpen(false)
    setConvoForm({ channel: 'note', content: '', follow_up: '', status: 'open' })
    router.refresh()
  }

  function openEditConvo(c: Conversation) {
    setEditConvoForm({ channel: c.channel ?? 'note', content: c.content ?? '', follow_up: c.follow_up ?? '', status: c.status ?? 'open' })
    setEditConvo(c)
  }

  async function handleEditConvo(e: React.FormEvent) {
    e.preventDefault()
    if (!editConvo) return
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').update({
      channel: editConvoForm.channel || null,
      content: editConvoForm.content || null,
      follow_up: editConvoForm.follow_up || null,
      status: editConvoForm.status,
    }).eq('id', editConvo.id)
    setConvoSaving(false)
    setEditConvo(null)
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
                <Link href={`/projects/${opp.event.id}`} className="flex items-center justify-between text-sm text-gray-700 hover:text-gray-900 group">
                  <span>{opp.event.name}</span>
                  <span className="text-xs text-gray-300 group-hover:text-gray-500">Project →</span>
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
              <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {conversations.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged for this opportunity.</p>
              )}
              {conversations.map(c => (
                <div key={c.id} className="px-5 py-3 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge value={c.status} />
                      <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                    </div>
                    <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={logConvoOpen} onClose={() => setLogConvoOpen(false)} title="Log Conversation">
        <form onSubmit={handleLogConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={convoForm.channel} onChange={convoField('channel')} options={channelOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={convoForm.status} onChange={convoField('status')} options={convoStatusOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content</label>
            <Textarea value={convoForm.content} onChange={convoField('content')} rows={3} placeholder="What was discussed / what happened?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={convoForm.follow_up} onChange={convoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLogConvoOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Log It'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editConvo} onClose={() => setEditConvo(null)} title="Edit Conversation">
        <form onSubmit={handleEditConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={editConvoForm.channel} onChange={editConvoField('channel')} options={channelOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={editConvoForm.status} onChange={editConvoField('status')} options={convoStatusOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content</label>
            <Textarea value={editConvoForm.content} onChange={editConvoField('content')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={editConvoForm.follow_up} onChange={editConvoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditConvo(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

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
