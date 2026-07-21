'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight } from 'lucide-react'
import { Talent, TalentCategory } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

type TalentRow = Talent & {
  talent_contacts: { id: string; name: string | null; is_primary: boolean }[]
  talent_agents: { id: string; agent: { id: string; name: string } | null }[]
}

type SimpleAgent = { id: string; name: string; agent_type: string | null }

const COUNTRIES = [
  'Australia','Austria','Belgium','Brazil','Canada','China','Denmark','Finland',
  'France','Germany','Greece','India','Ireland','Italy','Japan','Mexico',
  'Netherlands','New Zealand','Norway','Poland','Portugal','Russia','Saudi Arabia',
  'South Korea','Spain','Sweden','Switzerland','Turkey','UAE','UK','USA',
].map(c => ({ value: c, label: c }))

type Props = {
  talents: TalentRow[]
  talentCategories: TalentCategory[]
  allAgents: SimpleAgent[]
  agentTypes: { id: string; name: string }[]
  allAgencies: { id: string; name: string }[]
}

const EMPTY_FORM = {
  name: '', ig_link: '', tiktok_link: '', ig_followers: '', tiktok_followers: '',
  category: '', country: '', notes: '', email: '', phone: '',
}

export function TalentsClient({ talents, talentCategories, allAgents, agentTypes, allAgencies }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Agent selection within Add Talent modal
  const [agentMode, setAgentMode] = useState<'' | 'existing' | 'new'>('')
  const [agentId, setAgentId] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('')
  const [newAgentAgencyId, setNewAgentAgencyId] = useState('')

  const categoryOpts = talentCategories.map(c => ({ value: c.name, label: c.name }))
  const agentTypeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))

  const q = search.toLowerCase()
  const filtered = talents.filter(t => {
    const agentName = t.talent_agents?.[0]?.agent?.name ?? ''
    const primaryContact = t.talent_contacts?.find(c => c.is_primary)?.name ?? ''
    const matchSearch = !search ||
      t.name.toLowerCase().includes(q) ||
      agentName.toLowerCase().includes(q) ||
      primaryContact.toLowerCase().includes(q)
    const matchCat = !categoryFilter || t.category === categoryFilter
    return matchSearch && matchCat
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function resetModal() {
    setForm(EMPTY_FORM)
    setAgentMode('')
    setAgentId('')
    setNewAgentName('')
    setNewAgentType('')
    setNewAgentAgencyId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: newTalent } = await supabase.from('talents').insert({
      name: form.name,
      ig_link: form.ig_link || null,
      tiktok_link: form.tiktok_link || null,
      ig_followers: form.ig_followers || null,
      tiktok_followers: form.tiktok_followers || null,
      category: form.category || null,
      country: form.country || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }).select('id').single()

    if (newTalent) {
      if (agentMode === 'existing' && agentId) {
        await supabase.from('talent_agents').insert({ talent_id: newTalent.id, agent_id: agentId })
      } else if (agentMode === 'new' && newAgentName) {
        const { data: createdAgent } = await supabase
          .from('agents')
          .insert({ name: newAgentName, agent_type: newAgentType || null, agency_id: newAgentAgencyId || null })
          .select('id')
          .single()
        if (createdAgent) {
          await supabase.from('talent_agents').insert({ talent_id: newTalent.id, agent_id: createdAgent.id })
        }
      }
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
          <h1 className="text-2xl font-semibold text-gray-900">Talents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{talents.length} total</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Talent
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search talents…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All categories</option>
          {categoryOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cat</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Agent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Primary Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">IG Followers</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">TK Followers</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Links</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || categoryFilter ? 'No results match your filters.' : 'No talents yet.'}
                </td>
              </tr>
            )}
            {filtered.map(talent => {
              const primaryContact = talent.talent_contacts?.find(c => c.is_primary)
              const agent = talent.talent_agents?.[0]?.agent
              return (
                <tr key={talent.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/talents/${talent.id}`} className="font-medium text-gray-900 hover:text-black">
                      {talent.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Badge value={talent.category} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {agent ? (
                      <Link href={`/agents/${agent.id}`} className="hover:text-black">{agent.name}</Link>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {primaryContact?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{talent.ig_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{talent.tiktok_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {talent.ig_link ? (
                        <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="Instagram">
                          <ExternalLink className="w-3 h-3" /> IG
                        </a>
                      ) : <span className="text-xs text-gray-200">IG</span>}
                      {talent.tiktok_link ? (
                        <a href={talent.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="TikTok">
                          <ExternalLink className="w-3 h-3" /> TK
                        </a>
                      ) : <span className="text-xs text-gray-200">TK</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/talents/${talent.id}`} className="text-gray-300 hover:text-gray-500">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); resetModal() }} title="Add Talent">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={form.phone} onChange={field('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram URL</label>
              <Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok URL</label>
              <Input value={form.tiktok_link} onChange={field('tiktok_link')} placeholder="https://tiktok.com/@…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">IG Followers</label>
              <Input value={form.ig_followers} onChange={field('ig_followers')} placeholder="e.g. 250K" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok Followers</label>
              <Input value={form.tiktok_followers} onChange={field('tiktok_followers')} placeholder="e.g. 1.2M" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Country</label>
            <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
          </div>

          {/* Agent */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-700">Agent</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAgentMode(agentMode === 'existing' ? '' : 'existing'); setAgentId(''); setNewAgentName(''); setNewAgentType('') }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${agentMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
              >
                Select existing
              </button>
              <button
                type="button"
                onClick={() => { setAgentMode(agentMode === 'new' ? '' : 'new'); setAgentId(''); setNewAgentName(''); setNewAgentType('') }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${agentMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
              >
                Add new agent
              </button>
            </div>
            {agentMode === 'existing' && (
              <Select
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                options={allAgents.map(a => ({ value: a.id, label: a.name + (a.agent_type ? ` · ${a.agent_type}` : '') }))}
                placeholder={allAgents.length ? 'Select agent…' : 'No agents in directory yet'}
              />
            )}
            {agentMode === 'new' && (
              <div className="space-y-2">
                <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Full name *" />
                <Select value={newAgentType} onChange={e => setNewAgentType(e.target.value)} options={agentTypeOpts} placeholder="Agent type (optional)…" />
                <Select value={newAgentAgencyId} onChange={e => setNewAgentAgencyId(e.target.value)} options={allAgencies.map(a => ({ value: a.id, label: a.name }))} placeholder="Agency (optional)…" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any notes…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); resetModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Talent'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
