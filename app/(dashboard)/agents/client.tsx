'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight } from 'lucide-react'
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

type AgentWithAgency = Agent & {
  agency: { id: string; name: string } | null
}

type SimpleAgency = { id: string; name: string }

type Props = {
  agents: AgentWithAgency[]
  agentTypes: AgentType[]
  agencies: SimpleAgency[]
}

const EMPTY_FORM = { name: '', agent_type: '', agency_id: '', country: '', email: '', phone: '', notes: '' }

export function AgentsClient({ agents, agentTypes, agencies }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Inline agency creation
  const [agencyMode, setAgencyMode] = useState<'existing' | 'new'>('existing')
  const [newAgencyName, setNewAgencyName] = useState('')
  const [newAgencyCountry, setNewAgencyCountry] = useState('')

  const typeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))
  const agencyOpts = agencies.map(a => ({ value: a.id, label: a.name }))

  const q = search.toLowerCase()
  const filtered = agents.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(q) ||
      (a.agent_type ?? '').toLowerCase().includes(q) ||
      (a.agency?.name ?? '').toLowerCase().includes(q) ||
      (a.email ?? '').toLowerCase().includes(q)
    const matchType = !typeFilter || a.agent_type === typeFilter
    const matchAgency = !agencyFilter ||
      (agencyFilter === '__standalone__' ? !a.agency : a.agency?.id === agencyFilter)
    return matchSearch && matchType && matchAgency
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function resetModal() {
    setForm(EMPTY_FORM)
    setAgencyMode('existing')
    setNewAgencyName('')
    setNewAgencyCountry('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    let resolvedAgencyId = form.agency_id || null
    if (agencyMode === 'new' && newAgencyName) {
      const { data: newAgency } = await supabase
        .from('agencies')
        .insert({ name: newAgencyName, country: newAgencyCountry || null })
        .select('id')
        .single()
      resolvedAgencyId = newAgency?.id ?? null
    }

    await supabase.from('agents').insert({
      name: form.name,
      agent_type: form.agent_type || null,
      agency_id: resolvedAgencyId,
      country: form.country || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setOpen(false)
    resetModal()
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{agents.length} total</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Agent
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
        <select
          value={agencyFilter}
          onChange={e => setAgencyFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All agencies</option>
          {agencyOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value="__standalone__">Standalone (no agency)</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All types</option>
          {typeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Country</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Email</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || typeFilter || agencyFilter ? 'No results.' : 'No agents yet.'}
                </td>
              </tr>
            )}
            {filtered.map(agent => (
              <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/agents/${agent.id}`} className="font-medium text-gray-900 hover:text-black">
                    {agent.name}
                  </Link>
                </td>
                <td className="px-4 py-3"><Badge value={agent.agent_type} /></td>
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
                  <Link href={`/agents/${agent.id}`} className="text-gray-300 hover:text-gray-500">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); resetModal() }} title="Add Agent">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agent Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
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

          {/* Agency — select existing or create new */}
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
              <Select value={form.agency_id} onChange={field('agency_id')} options={agencyOpts} placeholder="Select agency (optional)…" />
            ) : (
              <div className="space-y-2 pl-3 border-l-2 border-gray-100">
                <Input value={newAgencyName} onChange={e => setNewAgencyName(e.target.value)} placeholder="New agency name *" />
                <Select value={newAgencyCountry} onChange={e => setNewAgencyCountry(e.target.value)} options={COUNTRIES} placeholder="Agency country (optional)…" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); resetModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || (agencyMode === 'new' && !newAgencyName)} className="flex-1">
              {saving ? 'Saving…' : 'Add Agent'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
