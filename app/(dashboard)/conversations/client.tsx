'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle } from 'lucide-react'
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

export function ConversationsClient({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('open')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entity_type: 'brand', entity_id: '', channel: 'note',
    content: '', follow_up: '', status: 'open',
  })

  const filtered = conversations.filter(c =>
    !statusFilter || c.status === statusFilter
  )

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
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

      <div className="flex gap-2 mb-5">
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

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No conversations.</div>
        )}
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400 capitalize">{c.entity_type}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                </div>
                {c.content && <p className="text-sm text-gray-800">{c.content}</p>}
                {c.follow_up && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <span>↳ Follow up:</span> {c.follow_up}
                  </p>
                )}
              </div>
              <Badge value={c.status} />
            </div>
          </div>
        ))}
      </div>

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
