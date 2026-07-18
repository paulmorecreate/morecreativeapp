'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle, Pencil, Search } from 'lucide-react'
import { Conversation } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const channelOpts = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
]

const entityTypeOpts = [
  { value: 'talent', label: 'Talent' },
  { value: 'brand', label: 'Brand' },
  { value: 'opportunity', label: 'Opportunity' },
]

const statusOpts = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

export function ConversationsClient({ conversations, entityNames }: { conversations: Conversation[]; entityNames: Record<string, string> }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [form, setForm] = useState({
    entity_type: 'brand', entity_id: '', channel: 'note',
    content: '', follow_up: '', status: 'open',
  })

  const filtered = conversations.filter(c => {
    const matchStatus = !statusFilter || c.status === statusFilter
    if (!matchStatus) return false
    if (!search) return true
    const q = search.toLowerCase()
    const entityName = entityNames[c.entity_id] ?? ''
    return (
      c.content?.toLowerCase().includes(q) ||
      c.follow_up?.toLowerCase().includes(q) ||
      entityName.toLowerCase().includes(q) ||
      c.channel?.toLowerCase().includes(q)
    )
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function editConvoField(k: keyof typeof editConvoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  function openEditConvo(c: Conversation) {
    setEditConvoForm({ channel: c.channel ?? 'note', content: c.content ?? '', follow_up: c.follow_up ?? '', status: c.status ?? 'open' })
    setEditConvo(c)
  }

  async function handleEditConvo(e: React.FormEvent) {
    e.preventDefault()
    if (!editConvo) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').update({
      channel: editConvoForm.channel || null,
      content: editConvoForm.content || null,
      follow_up: editConvoForm.follow_up || null,
      status: editConvoForm.status,
    }).eq('id', editConvo.id)
    setSaving(false)
    setEditConvo(null)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').insert({
      entity_type: form.entity_type,
      entity_id: form.entity_id || '00000000-0000-0000-0000-000000000000',
      channel: form.channel || null,
      content: form.content || null,
      follow_up: form.follow_up || null,
      status: form.status,
    })
    setSaving(false)
    setOpen(false)
    setForm({ entity_type: 'brand', entity_id: '', channel: 'note', content: '', follow_up: '', status: 'open' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Conversations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {statusFilter || 'total'}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Log Conversation
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-2">
          {['open', 'resolved', ''].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === s
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No conversations.</div>
        )}
        {filtered.map(c => {
          const entityName = entityNames[c.entity_id]
          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  {entityName && (
                    <p className="text-xs font-medium text-gray-500 mb-1.5 capitalize">
                      {c.entity_type === 'opportunity' ? '⟳ Opportunity · ' : ''}{entityName}
                    </p>
                  )}
                  {c.content && <p className="text-sm text-gray-800">{c.content}</p>}
                  {c.follow_up && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <span>↳ Follow up:</span> {c.follow_up}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge value={c.status} />
                  <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!editConvo} onClose={() => setEditConvo(null)} title="Edit Conversation">
        <form onSubmit={handleEditConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={editConvoForm.channel} onChange={editConvoField('channel')} options={channelOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={editConvoForm.status} onChange={editConvoField('status')} options={statusOpts} />
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
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Conversation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Related To</label>
              <Select value={form.entity_type} onChange={field('entity_type')} options={entityTypeOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={form.channel} onChange={field('channel')} options={channelOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content</label>
            <Textarea value={form.content} onChange={field('content')} rows={3} placeholder="What was discussed / what happened?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={form.follow_up} onChange={field('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select value={form.status} onChange={field('status')} options={statusOpts} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Log It'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
