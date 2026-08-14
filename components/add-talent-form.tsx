'use client'

import { useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'

type SimpleAgent = { id: string; name: string; agent_type: string | null }
type SimpleStylist = { id: string; name: string }
type SimplePerson = { id: string; name: string; type: string | null }

export type AddTalentFormProps = {
  talentCategories: { id: string; name: string }[]
  talentLevels: { id: string; name: string }[]
  allAgents: SimpleAgent[]
  agentTypes: { id: string; name: string }[]
  allStylists: SimpleStylist[]
  allPeople: SimplePerson[]
  existingNames: string[]
  onSuccess: (newTalentId: string) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function MultiSelectList<T extends { id: string; name: string }>({
  items, selected: sel, onToggle, emptyMsg, labelFn,
}: {
  items: T[]; selected: string[]; onToggle: (id: string) => void; emptyMsg: string; labelFn?: (item: T) => string
}) {
  const [q, setQ] = useState('')
  if (items.length === 0) return <p className="text-xs text-gray-400 py-2">{emptyMsg}</p>
  const visible = q ? items.filter(item => (labelFn ? labelFn(item) : item.name).toLowerCase().includes(q.toLowerCase())) : items
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black/10 bg-white"
        />
      </div>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
        {visible.length === 0
          ? <p className="px-3 py-2 text-xs text-gray-400">No results.</p>
          : visible.map(item => {
              const isSelected = sel.includes(item.id)
              return (
                <button key={item.id} type="button" onClick={() => onToggle(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSelected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <span>{labelFn ? labelFn(item) : item.name}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
      </div>
      {sel.length > 0 && <p className="text-xs text-gray-400">{sel.length} selected</p>}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', ig_link: '', tiktok_link: '', ig_followers: '', tiktok_followers: '',
  category: '', talent_level: '', country: '', notes: '', email: '', phone: '',
}

export function AddTalentForm({
  talentCategories, talentLevels, allAgents, agentTypes, allStylists, allPeople,
  existingNames, onSuccess, onCancel, submitLabel = 'Create & Link',
}: AddTalentFormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [agentMode, setAgentMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')
  const [newAgentPhone, setNewAgentPhone] = useState('')

  const [stylistMode, setStylistMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([])
  const [newStylistName, setNewStylistName] = useState('')

  const [personMode, setPersonMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonType, setNewPersonType] = useState('')

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  const categoryOpts = talentCategories.map(c => ({ value: c.name, label: c.name }))
  const levelOpts = talentLevels.map(l => ({ value: l.name, label: l.name }))
  const agentTypeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))
  const nameExists = form.name.trim() !== '' &&
    existingNames.some(n => n.trim().toLowerCase() === form.name.trim().toLowerCase())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nameExists) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const by = user?.email ?? null

    const { data: newTalent } = await supabase.from('talents').insert({
      name: form.name,
      ig_link: form.ig_link || null,
      tiktok_link: form.tiktok_link || null,
      ig_followers: form.ig_followers || null,
      tiktok_followers: form.tiktok_followers || null,
      category: form.category || null,
      talent_level: form.talent_level || null,
      country: form.country || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
      created_by: by,
    }).select('id').single()

    if (newTalent) {
      if (agentMode === 'existing' && selectedAgentIds.length > 0) {
        await supabase.from('talent_agents').insert(
          selectedAgentIds.map(agent_id => ({ talent_id: newTalent.id, agent_id }))
        )
      } else if (agentMode === 'new' && newAgentName) {
        const { data: agent } = await supabase.from('agents')
          .insert({ name: newAgentName, agent_type: newAgentType || null, email: newAgentEmail || null, phone: newAgentPhone || null })
          .select('id').single()
        if (agent) await supabase.from('talent_agents').insert({ talent_id: newTalent.id, agent_id: agent.id })
      }
      if (stylistMode === 'existing' && selectedStylistIds.length > 0) {
        await supabase.from('talent_stylists').insert(
          selectedStylistIds.map(stylist_id => ({ talent_id: newTalent.id, stylist_id }))
        )
      } else if (stylistMode === 'new' && newStylistName) {
        const { data: stylist } = await supabase.from('stylists')
          .insert({ name: newStylistName }).select('id').single()
        if (stylist) await supabase.from('talent_stylists').insert({ talent_id: newTalent.id, stylist_id: stylist.id })
      }
      if (personMode === 'existing' && selectedPersonIds.length > 0) {
        await supabase.from('talent_people').insert(
          selectedPersonIds.map(person_id => ({ talent_id: newTalent.id, person_id }))
        )
      } else if (personMode === 'new' && newPersonName) {
        const { data: person } = await supabase.from('people')
          .insert({ name: newPersonName, type: newPersonType || null }).select('id').single()
        if (person) await supabase.from('talent_people').insert({ talent_id: newTalent.id, person_id: person.id })
      }

      await onSuccess(newTalent.id)
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700">Name *</label>
        <Input value={form.name} onChange={field('name')} required placeholder="Full name" autoFocus />
        {nameExists && <p className="text-xs text-red-500 mt-1">A talent with this name already exists.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Category</label>
          <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Talent Level</label>
          <Select value={form.talent_level} onChange={field('talent_level')} options={levelOpts} placeholder="Select…" />
        </div>
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

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <label className="text-xs font-medium text-gray-700">Agent</label>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => { setAgentMode(agentMode === 'existing' ? '' : 'existing'); setSelectedAgentIds([]); setNewAgentName(''); setNewAgentType('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${agentMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Select existing
          </button>
          <button type="button"
            onClick={() => { setAgentMode(agentMode === 'new' ? '' : 'new'); setSelectedAgentIds([]); setNewAgentName(''); setNewAgentType('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${agentMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Add new agent
          </button>
        </div>
        {agentMode === 'existing' && (
          <MultiSelectList
            items={allAgents}
            selected={selectedAgentIds}
            onToggle={id => setSelectedAgentIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])}
            emptyMsg="No agents in directory yet."
            labelFn={a => a.name + (a.agent_type ? ` · ${a.agent_type}` : '')}
          />
        )}
        {agentMode === 'new' && (
          <div className="space-y-2">
            <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Full name *" />
            <Select value={newAgentType} onChange={e => setNewAgentType(e.target.value)} options={agentTypeOpts} placeholder="Agent type (optional)…" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="email" value={newAgentEmail} onChange={e => setNewAgentEmail(e.target.value)} placeholder="Email (optional)" />
              <Input value={newAgentPhone} onChange={e => setNewAgentPhone(e.target.value)} placeholder="Phone (optional)" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <label className="text-xs font-medium text-gray-700">Stylist</label>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => { setStylistMode(stylistMode === 'existing' ? '' : 'existing'); setSelectedStylistIds([]); setNewStylistName('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${stylistMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Select existing
          </button>
          <button type="button"
            onClick={() => { setStylistMode(stylistMode === 'new' ? '' : 'new'); setSelectedStylistIds([]); setNewStylistName('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${stylistMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Add new stylist
          </button>
        </div>
        {stylistMode === 'existing' && (
          <MultiSelectList
            items={allStylists}
            selected={selectedStylistIds}
            onToggle={id => setSelectedStylistIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])}
            emptyMsg="No stylists in directory yet."
          />
        )}
        {stylistMode === 'new' && (
          <Input value={newStylistName} onChange={e => setNewStylistName(e.target.value)} placeholder="Full name *" />
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-gray-100">
        <label className="text-xs font-medium text-gray-700">People</label>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => { setPersonMode(personMode === 'existing' ? '' : 'existing'); setSelectedPersonIds([]); setNewPersonName(''); setNewPersonType('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${personMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Select existing
          </button>
          <button type="button"
            onClick={() => { setPersonMode(personMode === 'new' ? '' : 'new'); setSelectedPersonIds([]); setNewPersonName(''); setNewPersonType('') }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${personMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Add new person
          </button>
        </div>
        {personMode === 'existing' && (
          <MultiSelectList
            items={allPeople}
            selected={selectedPersonIds}
            onToggle={id => setSelectedPersonIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])}
            emptyMsg="No people in directory yet."
            labelFn={p => p.name + (p.type ? ` · ${p.type}` : '')}
          />
        )}
        {personMode === 'new' && (
          <div className="space-y-2">
            <Input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Full name *" />
            <Input value={newPersonType} onChange={e => setNewPersonType(e.target.value)} placeholder="Type (optional, e.g. PR, Journalist…)" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700">Notes</label>
        <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any notes…" />
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Back</Button>
        <Button type="submit" disabled={saving || nameExists || !form.name.trim()} className="flex-1">
          {saving ? 'Creating…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
