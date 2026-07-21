'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight, ExternalLink, X } from 'lucide-react'
import { Agency, AgentType } from '@/lib/supabase/types'
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

type AgencyRow = Agency & {
  agents: { id: string }[]
}

type AgentEntry = { name: string; agent_type: string; country: string }

type Props = {
  agencies: AgencyRow[]
  agentTypes: AgentType[]
}

export function AgenciesClient({ agencies, agentTypes }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', website: '', country: '', notes: '' })
  const [agentEntries, setAgentEntries] = useState<AgentEntry[]>([])

  const filtered = agencies.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  )

  const typeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function agentField(i: number, k: keyof AgentEntry) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAgentEntries(entries => entries.map((entry, idx) => idx === i ? { ...entry, [k]: e.target.value } : entry))
  }

  function addAgentEntry() {
    setAgentEntries(e => [...e, { name: '', agent_type: '', country: '' }])
  }

  function removeAgentEntry(i: number) {
    setAgentEntries(e => e.filter((_, idx) => idx !== i))
  }

  function resetModal() {
    setForm({ name: '', website: '', country: '', notes: '' })
    setAgentEntries([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: newAgency } = await supabase
      .from('agencies')
      .insert({
        name: form.name,
        website: form.website || null,
        country: form.country || null,
        notes: form.notes || null,
      })
      .select('id')
      .single()

    if (newAgency && agentEntries.some(a => a.name.trim())) {
      await supabase.from('agents').insert(
        agentEntries
          .filter(a => a.name.trim())
          .map(a => ({
            name: a.name.trim(),
            agent_type: a.agent_type || null,
            country: a.country || null,
            agency_id: newAgency.id,
          }))
      )
    }

    setSaving(false)
    setOpen(false)
    resetModal()
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agencies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{agencies.length} total</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Agency
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agencies…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Country</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Website</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Agents</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search ? 'No results.' : 'No agencies yet.'}
                </td>
              </tr>
            )}
            {filtered.map(agency => (
              <tr key={agency.id} className="hover:bg-gray-50/50 transition-colors">
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
                  <Link href={`/agencies/${agency.id}`} className="text-gray-300 hover:text-gray-500">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); resetModal() }} title="Add Agency">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Agency Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="e.g. WME, CAA, Wilhelmina" />
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
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any context…" />
          </div>

          {/* Agents section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Agents</label>
              <button
                type="button"
                onClick={addAgentEntry}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
                <Plus className="w-3 h-3" /> Add agent
              </button>
            </div>
            {agentEntries.length === 0 && (
              <p className="text-xs text-gray-400">No agents added yet — click above to add one.</p>
            )}
            {agentEntries.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 pl-3 border-l-2 border-gray-100">
                <div className="flex-1 space-y-2">
                  <Input
                    value={entry.name}
                    onChange={agentField(i, 'name')}
                    placeholder="Agent name *"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={entry.agent_type} onChange={agentField(i, 'agent_type')} options={typeOpts} placeholder="Type (optional)…" />
                    <Select value={entry.country} onChange={agentField(i, 'country')} options={COUNTRIES} placeholder="Country (optional)…" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAgentEntry(i)}
                  className="mt-2 text-gray-300 hover:text-red-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); resetModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Agency'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
