'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Agent, AgentType } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

const COUNTRIES = [
  'Australia','Austria','Belgium','Brazil','Canada','China','Denmark','Finland',
  'France','Germany','Greece','India','Ireland','Italy','Japan','Mexico',
  'Netherlands','New Zealand','Norway','Poland','Portugal','Russia','Saudi Arabia',
  'South Korea','Spain','Sweden','Switzerland','Turkey','UAE','UK','USA',
].map(c => ({ value: c, label: c }))

type TalentLink = {
  id: string
  talent_id: string
  talent: { id: string; name: string; category: string | null; status: string | null } | null
}

type SimpleRecord = { id: string; name: string }
type SimpleAgency = { id: string; name: string }

type Props = {
  agent: Agent
  talentLinks: TalentLink[]
  agentTypes: AgentType[]
  allTalents: SimpleRecord[]
  agencies: SimpleAgency[]
}

export function AgentDetailClient({ agent, talentLinks, agentTypes, allTalents, agencies }: Props) {
  const router = useRouter()

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: agent.name ?? '',
    agent_type: agent.agent_type ?? '',
    agency_id: agent.agency_id ?? '',
    country: agent.country ?? '',
    email: agent.email ?? '',
    phone: agent.phone ?? '',
    website: agent.website ?? '',
    notes: agent.notes ?? '',
  })

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkTalentId, setLinkTalentId] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)

  const agencyOpts = agencies.map(a => ({ value: a.id, label: a.name }))
  const typeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))
  const currentAgency = agencies.find(a => a.id === agent.agency_id)
  const linkedTalentIds = new Set(talentLinks.map(l => l.talent_id))
  const availableTalents = allTalents.filter(t => !linkedTalentIds.has(t.id))

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('agents').update({
      name: form.name || null,
      agent_type: form.agent_type || null,
      agency_id: form.agency_id || null,
      country: form.country || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      notes: form.notes || null,
    }).eq('id', agent.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('agents').delete().eq('id', agent.id)
    router.push('/agents')
  }

  async function handleLinkTalent(e: React.FormEvent) {
    e.preventDefault()
    if (!linkTalentId) return
    setLinkSaving(true)
    const supabase = createClient()
    await supabase.from('talent_agents').insert({ agent_id: agent.id, talent_id: linkTalentId })
    setLinkSaving(false)
    setLinkOpen(false)
    setLinkTalentId('')
    router.refresh()
  }

  async function unlinkTalent(linkId: string) {
    const supabase = createClient()
    await supabase.from('talent_agents').delete().eq('id', linkId)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Agents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{agent.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {agent.agent_type && <span className="text-sm text-gray-500">{agent.agent_type}</span>}
              {currentAgency && (
                <Link href={`/agencies/${currentAgency.id}`} className="text-sm text-gray-400 hover:text-gray-700">
                  {currentAgency.name}
                </Link>
              )}
              {agent.website && (
                <a href={agent.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
                  <ExternalLink className="w-3 h-3" /> Website
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge value={agent.agent_type} />
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
                <dt className="text-xs text-gray-400 mb-0.5">Agency</dt>
                <dd className="text-sm text-gray-900">
                  {currentAgency
                    ? <Link href={`/agencies/${currentAgency.id}`} className="hover:underline">{currentAgency.name}</Link>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Country</dt>
                <dd className="text-sm text-gray-900">{agent.country ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Email</dt>
                <dd className="text-sm text-gray-900">
                  {agent.email
                    ? <a href={`mailto:${agent.email}`} className="text-gray-700 hover:text-black">{agent.email}</a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
                <dd className="text-sm text-gray-900">{agent.phone ?? <span className="text-gray-300">—</span>}</dd>
              </div>
            </dl>
          </div>

          {agent.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{agent.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Talents</h2>
              <button onClick={() => { setLinkTalentId(''); setLinkOpen(true) }} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Link Talent
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {talentLinks.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No talents linked yet.</p>}
              {talentLinks.map(link => (
                <div key={link.id} className="px-5 py-3 group flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Link href={`/talents/${link.talent?.id}`} className="text-sm font-medium text-gray-900 hover:text-black">
                      {link.talent?.name ?? '—'}
                    </Link>
                    <Badge value={link.talent?.category} />
                    <Badge value={link.talent?.status} />
                  </div>
                  <button onClick={() => unlinkTalent(link.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove link">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Link Talent Modal */}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Link Talent">
        <form onSubmit={handleLinkTalent} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Talent</label>
            <Select value={linkTalentId} onChange={e => setLinkTalentId(e.target.value)} options={availableTalents.map(t => ({ value: t.id, label: t.name }))} placeholder="Select talent…" />
          </div>
          {availableTalents.length === 0 && <p className="text-sm text-gray-400">All talents are already linked to this agent.</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLinkOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={linkSaving || !linkTalentId} className="flex-1">{linkSaving ? 'Linking…' : 'Link Talent'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Agent">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agent Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Agent Type</label>
              <Select value={form.agent_type} onChange={field('agent_type')} options={typeOpts} placeholder="Select type…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={form.email} onChange={field('email')} placeholder="agent@agency.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={form.phone} onChange={field('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agency</label>
            <Select value={form.agency_id} onChange={field('agency_id')} options={agencyOpts} placeholder="Select agency (optional)…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Website</label>
            <Input value={form.website} onChange={field('website')} placeholder="https://…" />
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

      {/* Delete Confirmation */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Agent">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will permanently delete <strong>{agent.name}</strong>. Talent links will also be removed. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">
              {deleting ? 'Deleting…' : 'Delete Agent'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
