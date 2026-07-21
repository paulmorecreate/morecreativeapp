'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Agency, AgentType } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'

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
}

export function AgencyDetailClient({ agency, agents, allAgents, agentTypes }: Props) {
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
    await supabase.from('agencies').update({
      name: form.name || null,
      website: form.website || null,
      country: form.country || null,
      notes: form.notes || null,
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
        <div className="col-span-1">
          {agency.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{agency.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Agents</h2>
              <button
                onClick={() => { resetLink(); setLinkOpen(true) }}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
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
        </div>
      </div>

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
