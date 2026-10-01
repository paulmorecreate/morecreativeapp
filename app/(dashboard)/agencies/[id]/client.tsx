'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, AlertTriangle, MessageCircle } from 'lucide-react'
import { Agency, AgentType, Conversation } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { WhatsAppImportModal } from '@/components/whatsapp-import-modal'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'
import { AuditStamp } from '@/components/audit-stamp'

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

type AgentAtAgency = {
  id: string
  name: string
  agent_type: string | null
  country: string | null
}

type SimpleAgent = { id: string; name: string; agent_type: string | null }

type Props = {
  agency: Agency
  agents: AgentAtAgency[]
  allAgents: SimpleAgent[]
  agentTypes: AgentType[]
  conversations: Conversation[]
}

export function AgencyDetailClient({ agency, agents, allAgents, agentTypes, conversations }: Props) {
  const router = useRouter()

  // Edit
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: agency.name ?? '',
    website: agency.website ?? '',
    country: agency.country ?? '',
    notes: agency.notes ?? '',
  })

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Conversations
  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [whatsappImportOpen, setWhatsappImportOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [deleteConvo, setDeleteConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })

  // Link agent
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing')
  const [linkAgentId, setLinkAgentId] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('')
  const [newAgentCountry, setNewAgentCountry] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  const agentIdsAtAgency = new Set(agents.map(a => a.id))
  const availableAgents = allAgents.filter(a => !agentIdsAtAgency.has(a.id))
  const typeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))

  function resetLink() {
    setLinkMode('existing')
    setLinkAgentId('')
    setNewAgentName('')
    setNewAgentType('')
    setNewAgentCountry('')
  }

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('agencies').update({
      name: form.name || null,
      website: form.website || null,
      country: form.country || null,
      notes: form.notes || null,
      updated_by: user?.email ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', agency.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('agencies').delete().eq('id', agency.id)
    router.push('/agencies')
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
    await supabase.from('conversations').insert({ entity_type: 'agency', entity_id: agency.id, channel: convoForm.channel || null, content: convoForm.content || null, follow_up: convoForm.follow_up || null, status: convoForm.status })
    setConvoSaving(false); setLogConvoOpen(false); setConvoForm({ channel: 'note', content: '', follow_up: '', status: 'open' }); router.refresh()
  }
  function openEditConvo(c: Conversation) {
    setEditConvoForm({ channel: c.channel ?? 'note', content: c.content ?? '', follow_up: c.follow_up ?? '', status: c.status ?? 'open' }); setEditConvo(c)
  }
  async function handleEditConvo(e: React.FormEvent) {
    e.preventDefault()
    if (!editConvo) return
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').update({ channel: editConvoForm.channel || null, content: editConvoForm.content || null, follow_up: editConvoForm.follow_up || null, status: editConvoForm.status }).eq('id', editConvo.id)
    setConvoSaving(false); setEditConvo(null); router.refresh()
  }
  async function handleDeleteConvo() {
    if (!deleteConvo) return
    await createClient().from('conversations').delete().eq('id', deleteConvo.id)
    setDeleteConvo(null); router.refresh()
  }

  async function handleLinkAgent(e: React.FormEvent) {
    e.preventDefault()
    setLinkSaving(true)
    const supabase = createClient()
    if (linkMode === 'new') {
      await supabase.from('agents').insert({
        name: newAgentName,
        agent_type: newAgentType || null,
        country: newAgentCountry || null,
        agency_id: agency.id,
      })
    } else {
      if (!linkAgentId) { setLinkSaving(false); return }
      await supabase.from('agents').update({ agency_id: agency.id }).eq('id', linkAgentId)
    }
    setLinkSaving(false)
    setLinkOpen(false)
    resetLink()
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/agencies" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Agencies
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{agency.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {agency.country && <span className="text-sm text-gray-500">{agency.country}</span>}
              {agency.website && (
                <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
                  <ExternalLink className="w-3 h-3" /> {agency.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Country</dt>
                <dd className="text-sm text-gray-900">{agency.country ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Website</dt>
                <dd className="text-sm">
                  {agency.website
                    ? <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-900 hover:text-black">{agency.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 text-gray-400" /></a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
            </dl>
            {agency.notes && <><div className="border-t border-gray-100 my-4" /><p className="text-sm text-gray-700 whitespace-pre-wrap">{agency.notes}</p></>}
          </div>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Agents</h2>
              <button onClick={() => { resetLink(); setLinkOpen(true) }} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Add Agent
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {agents.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No agents linked yet. Use the button above or assign from the agent's own page.</p>
              )}
              {agents.map(agent => (
                <Link key={agent.id} href={`/agents/${agent.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                  <Badge value={agent.agent_type} />
                  {agent.country && <span className="text-xs text-gray-400">{agent.country}</span>}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => setWhatsappImportOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><MessageCircle className="w-3 h-3" /> Import WhatsApp</button>
                <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><Plus className="w-3 h-3" /> Log</button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations?.length && <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>}
              {conversations?.map(c => (
                <div key={c.id} className="px-5 py-3 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge value={c.status} />
                      <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => setDeleteConvo(c)} className="text-gray-200 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AuditStamp createdBy={agency.created_by} createdAt={agency.created_at} updatedBy={agency.updated_by} updatedAt={agency.updated_at} />

      {/* Log Conversation Modal */}
      <Modal open={logConvoOpen} onClose={() => setLogConvoOpen(false)} title="Log Conversation">
        <form onSubmit={handleLogConvo} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Channel</label>
            <Select value={convoForm.channel} onChange={convoField('channel')} options={channelOpts} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={convoForm.content} onChange={convoField('content')} rows={4} placeholder="What was discussed?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={convoForm.follow_up} onChange={convoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select value={convoForm.status} onChange={convoField('status')} options={convoStatusOpts} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLogConvoOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Conversation Modal */}
      <Modal open={!!editConvo} onClose={() => setEditConvo(null)} title="Edit Conversation">
        <form onSubmit={handleEditConvo} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Channel</label>
            <Select value={editConvoForm.channel} onChange={editConvoField('channel')} options={channelOpts} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={editConvoForm.content} onChange={editConvoField('content')} rows={4} placeholder="What was discussed?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={editConvoForm.follow_up} onChange={editConvoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select value={editConvoForm.status} onChange={editConvoField('status')} options={convoStatusOpts} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditConvo(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Conversation Modal */}
      <Modal open={!!deleteConvo} onClose={() => setDeleteConvo(null)} title="Delete Conversation">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This will permanently delete this conversation entry. This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteConvo(null)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDeleteConvo} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">Delete</Button>
          </div>
        </div>
      </Modal>

      <WhatsAppImportModal open={whatsappImportOpen} onClose={() => setWhatsappImportOpen(false)} entityType="agency" entityId={agency.id} />

      {/* Link / Add Agent Modal */}
      <Modal open={linkOpen} onClose={() => { setLinkOpen(false); resetLink() }} title="Add Agent to Agency">
        <form onSubmit={handleLinkAgent} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                {linkMode === 'existing' ? 'Existing Agent' : 'New Agent'}
              </label>
              <button
                type="button"
                onClick={() => { setLinkMode(linkMode === 'new' ? 'existing' : 'new'); setLinkAgentId(''); setNewAgentName('') }}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                {linkMode === 'new' ? '← Select existing' : '+ Create new agent'}
              </button>
            </div>

            {linkMode === 'existing' ? (
              <>
                <Select
                  value={linkAgentId}
                  onChange={e => setLinkAgentId(e.target.value)}
                  options={availableAgents.map(a => ({ value: a.id, label: a.name + (a.agent_type ? ` · ${a.agent_type}` : '') }))}
                  placeholder={availableAgents.length ? 'Select agent…' : 'No agents available'}
                />
                {availableAgents.length === 0 && (
                  <p className="text-xs text-gray-400">All agents are already at this agency.</p>
                )}
                <p className="text-xs text-gray-400">If the agent is already at another agency, they will be moved here.</p>
              </>
            ) : (
              <div className="space-y-3 pl-3 border-l-2 border-gray-100">
                <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Full name *" required={linkMode === 'new'} />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newAgentType} onChange={e => setNewAgentType(e.target.value)} options={typeOpts} placeholder="Type (optional)…" />
                  <Select value={newAgentCountry} onChange={e => setNewAgentCountry(e.target.value)} options={COUNTRIES} placeholder="Country (optional)…" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setLinkOpen(false); resetLink() }} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={linkSaving || (linkMode === 'existing' ? !linkAgentId : !newAgentName)}
              className="flex-1"
            >
              {linkSaving ? 'Saving…' : linkMode === 'new' ? 'Add Agent' : 'Link Agent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Agency">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agency Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Website</label>
              <Input value={form.website} onChange={field('website')} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Agency">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will permanently delete <strong>{agency.name}</strong>. Agents at this agency will not be deleted — they will simply lose the agency association. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">
              {deleting ? 'Deleting…' : 'Delete Agency'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
