'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight, ExternalLink, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Agency, Agent } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'

type AgencyRow = Agency & { agents: { id: string }[] }
type AgentWithAgency = Agent & { agency: { id: string; name: string } | null }

// Slot used when adding agents inline during Add Agency
type AgentSlot =
  | { mode: 'existing'; agentId: string }
  | { mode: 'new'; name: string; country: string; email: string; phone: string }

type Props = {
  agencies: AgencyRow[]
  agents: AgentWithAgency[]
}

const EMPTY_AGENT_FORM = { name: '', agency_id: '', country: '', email: '', phone: '', notes: '' }

export function AgenciesClient({ agencies, agents }: Props) {
  const router = useRouter()
  const allAgents = agents.map(a => ({ id: a.id, name: a.name }))

  // ── Agency section state ──────────────────────────────────────────
  const [agencySearch, setAgencySearch] = useState('')
  const [agencyOpen, setAgencyOpen] = useState(false)
  const [agencySaving, setAgencySaving] = useState(false)
  const [agencyForm, setAgencyForm] = useState({ name: '', website: '', country: '', notes: '' })
  const [agentSlots, setAgentSlots] = useState<AgentSlot[]>([])

  const [deleteAgencyTarget, setDeleteAgencyTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletingAgency, setDeletingAgency] = useState(false)

  // ── Agent section state ───────────────────────────────────────────
  const [agentSearch, setAgentSearch] = useState('')
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentSaving, setAgentSaving] = useState(false)
  const [agentForm, setAgentForm] = useState(EMPTY_AGENT_FORM)
  const [deleteAgentTarget, setDeleteAgentTarget] = useState<{ id: string; name: string } | null>(null)
  const [deletingAgent, setDeletingAgent] = useState(false)
  const [agencyMode, setAgencyMode] = useState<'existing' | 'new'>('existing')
  const [newAgencyName, setNewAgencyName] = useState('')
  const [newAgencyCountry, setNewAgencyCountry] = useState('')

  // ── Filtering ─────────────────────────────────────────────────────
  const filteredAgencies = agencies.filter(a =>
    !agencySearch || a.name.toLowerCase().includes(agencySearch.toLowerCase())
  )

  const q = agentSearch.toLowerCase()
  const filteredAgents = agents.filter(a =>
    !agentSearch ||
    a.name.toLowerCase().includes(q) ||
    (a.agency?.name ?? '').toLowerCase().includes(q) ||
    (a.email ?? '').toLowerCase().includes(q)
  )

  const agencyOpts = agencies.map(a => ({ value: a.id, label: a.name }))

  // ── Agency slot helpers (for Add Agency inline agents) ────────────
  const selectedExistingIds = new Set(
    agentSlots.flatMap(s => (s.mode === 'existing' && s.agentId ? [s.agentId] : []))
  )

  function availableAgentsFor(currentId: string) {
    return allAgents
      .filter(a => a.id === currentId || !selectedExistingIds.has(a.id))
      .map(a => ({ value: a.id, label: a.name }))
  }

  function addSlot() {
    setAgentSlots(s => [...s, { mode: 'existing', agentId: '' }])
  }

  function removeSlot(i: number) {
    setAgentSlots(s => s.filter((_, idx) => idx !== i))
  }

  function toggleSlotMode(i: number) {
    setAgentSlots(s => s.map((slot, idx) => {
      if (idx !== i) return slot
      return slot.mode === 'existing'
        ? { mode: 'new', name: '', country: '', email: '', phone: '' }
        : { mode: 'existing', agentId: '' }
    }))
  }

  function updateExisting(i: number, agentId: string) {
    setAgentSlots(s => s.map((slot, idx) => idx === i ? { mode: 'existing', agentId } : slot))
  }

  function updateNew(i: number, k: 'name' | 'country' | 'email' | 'phone', value: string) {
    setAgentSlots(s => s.map((slot, idx) => {
      if (idx !== i || slot.mode !== 'new') return slot
      return { ...slot, [k]: value }
    }))
  }

  function resetAgencyModal() {
    setAgencyForm({ name: '', website: '', country: '', notes: '' })
    setAgentSlots([])
  }

  function resetAgentModal() {
    setAgentForm(EMPTY_AGENT_FORM)
    setAgencyMode('existing')
    setNewAgencyName('')
    setNewAgencyCountry('')
  }

  // ── Sort: Agencies ────────────────────────────────────────────────
  const [agencySortKey, setAgencySortKey] = useState('name')
  const [agencySortDir, setAgencySortDir] = useState<'asc' | 'desc'>('asc')
  function toggleAgencySort(key: string) {
    if (agencySortKey === key) setAgencySortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setAgencySortKey(key); setAgencySortDir('asc') }
  }
  function AgencySortIcon({ col }: { col: string }) {
    if (agencySortKey !== col) return null
    return agencySortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
  }
  const sortedAgencies = [...filteredAgencies].sort((a, b) => {
    if (agencySortKey === 'agents') {
      const diff = (a.agents?.length ?? 0) - (b.agents?.length ?? 0)
      return agencySortDir === 'asc' ? diff : -diff
    }
    let av = '', bv = ''
    if (agencySortKey === 'name') { av = a.name; bv = b.name }
    else if (agencySortKey === 'country') { av = a.country ?? ''; bv = b.country ?? '' }
    else if (agencySortKey === 'website') { av = a.website ?? ''; bv = b.website ?? '' }
    return agencySortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  // ── Sort: Agents ──────────────────────────────────────────────────
  const [agentSortKey, setAgentSortKey] = useState('name')
  const [agentSortDir, setAgentSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleAgentSort(key: string) {
    if (agentSortKey === key) setAgentSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setAgentSortKey(key); setAgentSortDir('asc') }
  }
  function AgentSortIcon({ col }: { col: string }) {
    if (agentSortKey !== col) return null
    return agentSortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
  }
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let av = '', bv = ''
    if (agentSortKey === 'name') { av = a.name; bv = b.name }
    else if (agentSortKey === 'agency') { av = a.agency?.name ?? ''; bv = b.agency?.name ?? '' }
    else if (agentSortKey === 'country') { av = a.country ?? ''; bv = b.country ?? '' }
    else if (agentSortKey === 'email') { av = a.email ?? ''; bv = b.email ?? '' }
    return agentSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  // ── Delete handlers ───────────────────────────────────────────────
  async function handleDeleteAgency() {
    if (!deleteAgencyTarget) return
    setDeletingAgency(true)
    const supabase = createClient()
    await supabase.from('agencies').delete().eq('id', deleteAgencyTarget.id)
    setDeletingAgency(false)
    setDeleteAgencyTarget(null)
    router.refresh()
  }

  async function handleDeleteAgent() {
    if (!deleteAgentTarget) return
    setDeletingAgent(true)
    const supabase = createClient()
    await supabase.from('agents').delete().eq('id', deleteAgentTarget.id)
    setDeletingAgent(false)
    setDeleteAgentTarget(null)
    router.refresh()
  }

  // ── Submit: Add Agency ────────────────────────────────────────────
  async function handleAgencySubmit(e: React.FormEvent) {
    e.preventDefault()
    setAgencySaving(true)
    const supabase = createClient()

    const { data: newAgency } = await supabase
      .from('agencies')
      .insert({
        name: agencyForm.name,
        website: agencyForm.website || null,
        country: agencyForm.country || null,
        notes: agencyForm.notes || null,
      })
      .select('id')
      .single()

    if (newAgency) {
      const existingToLink = agentSlots.filter(
        (s): s is { mode: 'existing'; agentId: string } => s.mode === 'existing' && !!s.agentId
      )
      const newToCreate = agentSlots.filter(
        (s): s is { mode: 'new'; name: string; country: string; email: string; phone: string } =>
          s.mode === 'new' && !!s.name.trim()
      )
      await Promise.all([
        ...existingToLink.map(s =>
          supabase.from('agents').update({ agency_id: newAgency.id }).eq('id', s.agentId)
        ),
        newToCreate.length > 0
          ? supabase.from('agents').insert(
              newToCreate.map(s => ({
                name: s.name.trim(),
                country: s.country || null,
                email: s.email || null,
                phone: s.phone || null,
                agency_id: newAgency.id,
              }))
            )
          : Promise.resolve(),
      ])
    }

    setAgencySaving(false)
    setAgencyOpen(false)
    resetAgencyModal()
    router.refresh()
  }

  // ── Submit: Add Agent ─────────────────────────────────────────────
  async function handleAgentSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAgentSaving(true)
    const supabase = createClient()

    let resolvedAgencyId = agentForm.agency_id || null
    if (agencyMode === 'new' && newAgencyName) {
      const { data: created } = await supabase
        .from('agencies')
        .insert({ name: newAgencyName, country: newAgencyCountry || null })
        .select('id')
        .single()
      resolvedAgencyId = created?.id ?? null
    }

    await supabase.from('agents').insert({
      name: agentForm.name,
      agency_id: resolvedAgencyId,
      country: agentForm.country || null,
      email: agentForm.email || null,
      phone: agentForm.phone || null,
      notes: agentForm.notes || null,
    })

    setAgentSaving(false)
    setAgentOpen(false)
    resetAgentModal()
    router.refresh()
  }

  return (
    <div>
      {/* ── AGENCIES SECTION ───────────────────────────────────────── */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1 h-6 rounded-full bg-gray-800" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Agencies</h2>
              <p className="text-xs text-gray-400">{agencies.length} total</p>
            </div>
          </div>
          <Button onClick={() => setAgencyOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Agency
          </Button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={agencySearch}
              onChange={e => setAgencySearch(e.target.value)}
              placeholder="Search agencies…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {([['name','Name'],['country','Country'],['website','Website'],['agents','Agents']] as const).map(([col, label]) => (
                  <th key={col} onClick={() => toggleAgencySort(col)} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                    {label}<AgencySortIcon col={col} />
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedAgencies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    {agencySearch ? 'No results.' : 'No agencies yet.'}
                  </td>
                </tr>
              )}
              {sortedAgencies.map(agency => (
                <tr key={agency.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/agencies/${agency.id}`} className="font-medium text-gray-900 hover:text-black">
                      {agency.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agency.country ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agency.website ? (
                      <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-black">
                        <ExternalLink className="w-3 h-3" /> {agency.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agency.agents?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteAgencyTarget({ id: agency.id, name: agency.name })}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/agencies/${agency.id}`} className="text-gray-300 hover:text-gray-500">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AGENTS SECTION ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-block w-1 h-6 rounded-full bg-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-indigo-700">Agents</h2>
              <p className="text-xs text-gray-400">{agents.length} total</p>
            </div>
          </div>
          <Button onClick={() => setAgentOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Agent
          </Button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={agentSearch}
              onChange={e => setAgentSearch(e.target.value)}
              placeholder="Search agents…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-50 bg-indigo-50/40">
                {([['name','Name'],['agency','Agency'],['country','Country'],['email','Email']] as const).map(([col, label]) => (
                  <th key={col} onClick={() => toggleAgentSort(col)} className="text-left px-4 py-3 font-medium text-indigo-400 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-indigo-600">
                    {label}<AgentSortIcon col={col} />
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedAgents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    {agentSearch ? 'No results.' : 'No agents yet.'}
                  </td>
                </tr>
              )}
              {sortedAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/agents/${agent.id}`} className="font-medium text-gray-900 hover:text-black">
                      {agent.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agent.agency
                      ? <Link href={`/agencies/${agent.agency.id}`} className="hover:text-black">{agent.agency.name}</Link>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agent.country ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {agent.email
                      ? <a href={`mailto:${agent.email}`} className="hover:text-black">{agent.email}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteAgentTarget({ id: agent.id, name: agent.name })}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/agents/${agent.id}`} className="text-gray-300 hover:text-gray-500">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Agency Modal ────────────────────────────────────────── */}
      <Modal open={agencyOpen} onClose={() => { setAgencyOpen(false); resetAgencyModal() }} title="Add Agency">
        <form onSubmit={handleAgencySubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agency Name *</label>
            <Input value={agencyForm.name} onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. WME, CAA, Wilhelmina" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Website</label>
              <Input value={agencyForm.website} onChange={e => setAgencyForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Select value={agencyForm.country} onChange={e => setAgencyForm(f => ({ ...f, country: e.target.value }))} options={COUNTRIES} placeholder="Select…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={agencyForm.notes} onChange={e => setAgencyForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any context…" />
          </div>

          {/* Inline agents */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Agents</label>
              <button type="button" onClick={addSlot} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Add agent
              </button>
            </div>
            {agentSlots.length === 0 && (
              <p className="text-xs text-gray-400">Optional — click above to add agents to this agency.</p>
            )}
            <div className="space-y-3">
              {agentSlots.map((slot, i) => (
                <div key={i} className="flex items-start gap-2 pl-3 border-l-2 border-gray-100">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{slot.mode === 'existing' ? 'Existing agent' : 'New agent'}</span>
                      <button type="button" onClick={() => toggleSlotMode(i)} className="text-xs text-gray-400 hover:text-gray-700">
                        {slot.mode === 'existing' ? '+ Create new instead' : '← Select existing'}
                      </button>
                    </div>
                    {slot.mode === 'existing' ? (
                      <Select
                        value={slot.agentId}
                        onChange={e => updateExisting(i, e.target.value)}
                        options={availableAgentsFor(slot.agentId)}
                        placeholder="Select agent…"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Input value={slot.name} onChange={e => updateNew(i, 'name', e.target.value)} placeholder="Agent name *" />
                        <Select value={slot.country} onChange={e => updateNew(i, 'country', e.target.value)} options={COUNTRIES} placeholder="Country (optional)…" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="email" value={slot.email} onChange={e => updateNew(i, 'email', e.target.value)} placeholder="Email (optional)" />
                          <Input value={slot.phone} onChange={e => updateNew(i, 'phone', e.target.value)} placeholder="Phone (optional)" />
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => removeSlot(i)} className="mt-6 text-gray-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setAgencyOpen(false); resetAgencyModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={agencySaving} className="flex-1">{agencySaving ? 'Saving…' : 'Add Agency'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Agency Modal ────────────────────────────────────── */}
      <Modal open={!!deleteAgencyTarget} onClose={() => setDeleteAgencyTarget(null)} title="Delete Agency">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <strong>{deleteAgencyTarget?.name}</strong>? Agents linked to this agency will not be deleted but will lose the agency association. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteAgencyTarget(null)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAgency}
              disabled={deletingAgency}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {deletingAgency ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Agent Modal ──────────────────────────────────────── */}
      <Modal open={!!deleteAgentTarget} onClose={() => setDeleteAgentTarget(null)} title="Delete Agent">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <strong>{deleteAgentTarget?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteAgentTarget(null)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAgent}
              disabled={deletingAgent}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {deletingAgent ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Agent Modal ─────────────────────────────────────────── */}
      <Modal open={agentOpen} onClose={() => { setAgentOpen(false); resetAgentModal() }} title="Add Agent">
        <form onSubmit={handleAgentSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agent Name *</label>
            <Input value={agentForm.name} onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))} required placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Country</label>
            <Select value={agentForm.country} onChange={e => setAgentForm(f => ({ ...f, country: e.target.value }))} options={COUNTRIES} placeholder="Select…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={agentForm.email} onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))} placeholder="agent@agency.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
            </div>
          </div>

          {/* Agency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Agency</label>
              <button
                type="button"
                onClick={() => { setAgencyMode(agencyMode === 'new' ? 'existing' : 'new'); setNewAgencyName(''); setNewAgencyCountry('') }}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                {agencyMode === 'new' ? '← Select existing' : '+ Create new agency'}
              </button>
            </div>
            {agencyMode === 'existing' ? (
              <Select value={agentForm.agency_id} onChange={e => setAgentForm(f => ({ ...f, agency_id: e.target.value }))} options={agencyOpts} placeholder="Select agency (optional)…" />
            ) : (
              <div className="space-y-2 pl-3 border-l-2 border-gray-100">
                <Input value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} placeholder="New agency name *" />
                <Select value={newAgencyCountry} onChange={e => setNewAgencyCountry(e.target.value)} options={COUNTRIES} placeholder="Agency country (optional)…" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={agentForm.notes} onChange={e => setAgentForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setAgentOpen(false); resetAgentModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={agentSaving || (agencyMode === 'new' && !newAgencyName)} className="flex-1">
              {agentSaving ? 'Saving…' : 'Add Agent'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
