'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight, Trash2, ChevronUp, ChevronDown, Check, Minus, FileDown, FolderInput } from 'lucide-react'
import { Talent, TalentCategory, TalentLevel } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'

type TalentRow = Talent & {
  talent_agents: { id: string; agent: { id: string; name: string } | null }[]
}

type SimpleAgent = { id: string; name: string; agent_type: string | null }
type SimpleStylist = { id: string; name: string }
type SimplePerson = { id: string; name: string; type: string | null }
type SimpleProjectBrand = { id: string; brand: { id: string; name: string } | null }
type SimpleProject = { id: string; name: string; project_brands: SimpleProjectBrand[] }

type Props = {
  talents: TalentRow[]
  talentCategories: TalentCategory[]
  allAgents: SimpleAgent[]
  agentTypes: { id: string; name: string }[]
  talentLevels: TalentLevel[]
  allStylists: SimpleStylist[]
  allPeople: SimplePerson[]
  allProjects: SimpleProject[]
}

function SearchableProjectPicker({ projects, selected, onSelect }: {
  projects: SimpleProject[]; selected: string; onSelect: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const visible = q ? projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase())) : projects
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects…"
          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black/10 bg-white" />
      </div>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto">
        {visible.length === 0
          ? <p className="px-3 py-2 text-xs text-gray-400">No results.</p>
          : visible.map(p => (
            <button key={p.id} type="button" onClick={() => onSelect(p.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${selected === p.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
              <span>{p.name}</span>
              {selected === p.id && <Check className="w-3 h-3 shrink-0" />}
            </button>
          ))}
      </div>
    </div>
  )
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
      {sel.length > 0 && (
        <p className="text-xs text-gray-400">{sel.length} selected</p>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', ig_link: '', tiktok_link: '', ig_followers: '', tiktok_followers: '',
  category: '', talent_level: '', country: '', notes: '', email: '', phone: '',
}

function parseFollowers(s: string | null): number {
  if (!s) return NaN
  const lower = s.trim().toLowerCase().replace(/,/g, '')
  const num = parseFloat(lower)
  if (isNaN(num)) return NaN
  if (lower.endsWith('b')) return num * 1_000_000_000
  if (lower.endsWith('m')) return num * 1_000_000
  if (lower.endsWith('k')) return num * 1_000
  return num
}

export function TalentsClient({ talents, talentCategories, allAgents, agentTypes, talentLevels, allStylists, allPeople, allProjects }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Multi-select & export
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [reportTitle, setReportTitle] = useState('')
  const [talentTypes, setTalentTypes] = useState<Record<string, 'Placement' | 'Organic'>>({})
  const [generating, setGenerating] = useState(false)
  const [exportingList, setExportingList] = useState(false)

  async function handleExportList() {
    setExportingList(true)
    try {
      const [{ pdf }, { ListReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/list-report-pdf'),
      ])
      const rows = sorted.filter(t => selected.has(t.id)).map(t => [
        t.name,
        t.ig_link ?? '',
        t.category ?? '',
        t.talent_level ?? '',
        t.ig_followers ?? '',
      ])
      const columns = [
        { header: 'Name', width: '25%' },
        { header: 'Instagram', width: '35%', link: true },
        { header: 'Category', width: '16%' },
        { header: 'Level', width: '12%' },
        { header: 'IG Followers', width: '12%' },
      ]
      const blob = await pdf(<ListReportDocument title="Talents" columns={columns} rows={rows} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'talents-list.pdf'; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingList(false)
    }
  }

  // Add to Project
  const [addToProjectOpen, setAddToProjectOpen] = useState(false)
  const [addToProjectId, setAddToProjectId] = useState('')
  const [addToProjectDests, setAddToProjectDests] = useState<Set<string>>(new Set())
  const [addToProjectSaving, setAddToProjectSaving] = useState(false)
  const [loadingLinks, setLoadingLinks] = useState(false)
  // existingLinks: 'project' → Set<talentId>, project_brand_id → Set<talentId>
  const [existingLinks, setExistingLinks] = useState<Map<string, Set<string>>>(new Map())

  const selectedProjectBrands = allProjects.find(p => p.id === addToProjectId)?.project_brands ?? []

  async function selectProject(id: string) {
    setAddToProjectId(id)
    setAddToProjectDests(new Set())
    setExistingLinks(new Map())
    setLoadingLinks(true)
    const supabase = createClient()
    const talentIds = [...selected]
    const pbIds = (allProjects.find(p => p.id === id)?.project_brands ?? []).map(pb => pb.id)
    const [ptRes, pbtRes] = await Promise.all([
      supabase.from('project_talents').select('talent_id').eq('project_id', id).in('talent_id', talentIds),
      pbIds.length > 0
        ? supabase.from('project_brand_talents').select('talent_id, project_brand_id').in('project_brand_id', pbIds).in('talent_id', talentIds)
        : { data: [] as { talent_id: string; project_brand_id: string }[] },
    ])
    const map = new Map<string, Set<string>>()
    map.set('project', new Set((ptRes.data ?? []).map(r => r.talent_id)))
    for (const row of (pbtRes.data ?? [])) {
      if (!map.has(row.project_brand_id)) map.set(row.project_brand_id, new Set())
      map.get(row.project_brand_id)!.add(row.talent_id)
    }
    setExistingLinks(map)
    setLoadingLinks(false)
  }

  function toggleDest(dest: string) {
    setAddToProjectDests(prev => {
      const next = new Set(prev)
      if (next.has(dest)) next.delete(dest)
      else next.add(dest)
      return next
    })
  }

  async function handleAddToProject() {
    if (!addToProjectId || addToProjectDests.size === 0) return
    setAddToProjectSaving(true)
    const supabase = createClient()
    const talentIds = [...selected]
    await Promise.all([...addToProjectDests].map(dest => {
      const already = existingLinks.get(dest) ?? new Set()
      const newTalents = talentIds.filter(id => !already.has(id))
      if (newTalents.length === 0) return Promise.resolve()
      if (dest === 'project') {
        return supabase.from('project_talents').insert(newTalents.map(talent_id => ({ project_id: addToProjectId, talent_id })))
      }
      return supabase.from('project_brand_talents').insert(
        newTalents.map(talent_id => ({ project_brand_id: dest, talent_id, accepted: false, status: 'In Conversation' }))
      )
    }))
    setAddToProjectSaving(false)
    setAddToProjectOpen(false)
    setAddToProjectId('')
    setAddToProjectDests(new Set())
    setExistingLinks(new Map())
    router.refresh()
  }

  // Agent selection
  const [agentMode, setAgentMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')
  const [newAgentPhone, setNewAgentPhone] = useState('')

  // Stylist selection
  const [stylistMode, setStylistMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([])
  const [newStylistName, setNewStylistName] = useState('')

  // People selection
  const [personMode, setPersonMode] = useState<'' | 'existing' | 'new'>('')
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonType, setNewPersonType] = useState('')

  const categoryOpts = talentCategories.map(c => ({ value: c.name, label: c.name }))
  const talentNameExists = form.name.trim() !== '' && talents.some(t => t.name.trim().toLowerCase() === form.name.trim().toLowerCase())
  const levelOpts = talentLevels.map(l => ({ value: l.name, label: l.name }))
  const agentTypeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))

  const q = search.toLowerCase()
  const filtered = talents.filter(t => {
    const agentName = t.talent_agents?.[0]?.agent?.name ?? ''
    const matchSearch = !search ||
      t.name.toLowerCase().includes(q) ||
      agentName.toLowerCase().includes(q)
    const matchCat = !categoryFilter || t.category === categoryFilter
    return matchSearch && matchCat
  })

  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />
  }
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'ig_followers' || sortKey === 'tiktok_followers') {
      const an = parseFollowers(a[sortKey])
      const bn = parseFollowers(b[sortKey])
      if (isNaN(an) && isNaN(bn)) return 0
      if (isNaN(an)) return 1
      if (isNaN(bn)) return -1
      return sortDir === 'asc' ? an - bn : bn - an
    }
    let av = '', bv = ''
    if (sortKey === 'name') { av = a.name; bv = b.name }
    else if (sortKey === 'talent_level') { av = a.talent_level ?? ''; bv = b.talent_level ?? '' }
    else if (sortKey === 'category') { av = a.category ?? ''; bv = b.category ?? '' }
    else if (sortKey === 'agent') {
      av = a.talent_agents?.map(ta => ta.agent?.name).filter(Boolean).join(', ') ?? ''
      bv = b.talent_agents?.map(ta => ta.agent?.name).filter(Boolean).join(', ') ?? ''
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const allSelected = sorted.length > 0 && sorted.every(t => selected.has(t.id))
  const someSelected = sorted.some(t => selected.has(t.id))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sorted.map(t => t.id)))
  }

  function openExport() {
    const init: Record<string, 'Placement' | 'Organic'> = {}
    selected.forEach(id => { init[id] = 'Placement' })
    setTalentTypes(init)
    setReportTitle('')
    setExportOpen(true)
  }

  async function handleGeneratePDF() {
    setGenerating(true)
    try {
      const [{ pdf }, { TalentReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/talent-report-pdf'),
      ])
      const rows = sorted.filter(t => selected.has(t.id)).map(t => ({
        name: t.name,
        link: t.ig_link ?? t.tiktok_link ?? '',
        type: talentTypes[t.id] ?? 'Placement',
      }))
      const blob = await pdf(
        <TalentReportDocument title={reportTitle || 'Talent Report'} rows={rows} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(reportTitle || 'talent-report').replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setExportOpen(false)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('talents').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function resetModal() {
    setForm(EMPTY_FORM)
    setAgentMode(''); setSelectedAgentIds([]); setNewAgentName(''); setNewAgentType(''); setNewAgentEmail(''); setNewAgentPhone('')
    setStylistMode(''); setSelectedStylistIds([]); setNewStylistName('')
    setPersonMode(''); setSelectedPersonIds([]); setNewPersonName(''); setNewPersonType('')
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
      talent_level: form.talent_level || null,
      country: form.country || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }).select('id').single()

    if (newTalent) {
      // Agents
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
      // Stylists
      if (stylistMode === 'existing' && selectedStylistIds.length > 0) {
        await supabase.from('talent_stylists').insert(
          selectedStylistIds.map(stylist_id => ({ talent_id: newTalent.id, stylist_id }))
        )
      } else if (stylistMode === 'new' && newStylistName) {
        const { data: stylist } = await supabase.from('stylists')
          .insert({ name: newStylistName })
          .select('id').single()
        if (stylist) await supabase.from('talent_stylists').insert({ talent_id: newTalent.id, stylist_id: stylist.id })
      }
      // People
      if (personMode === 'existing' && selectedPersonIds.length > 0) {
        await supabase.from('talent_people').insert(
          selectedPersonIds.map(person_id => ({ talent_id: newTalent.id, person_id }))
        )
      } else if (personMode === 'new' && newPersonName) {
        const { data: person } = await supabase.from('people')
          .insert({ name: newPersonName, type: newPersonType || null })
          .select('id').single()
        if (person) await supabase.from('talent_people').insert({ talent_id: newTalent.id, person_id: person.id })
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
          <p className="text-sm text-gray-500 mt-0.5">{sorted.length} of {talents.length}</p>
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
              <th className="pl-4 pr-2 py-3 w-8">
                <button
                  onClick={toggleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    allSelected ? 'bg-gray-900 border-gray-900' : someSelected ? 'border-gray-400 bg-white' : 'border-gray-300 hover:border-gray-500 bg-white'
                  }`}
                >
                  {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  {someSelected && !allSelected && <Minus className="w-2.5 h-2.5 text-gray-500" />}
                </button>
              </th>
              <th onClick={() => toggleSort('name')} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                Name<SortIcon col="name" />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Links</th>
              {([['talent_level','Level'],['category','Cat'],['agent','Agent'],['ig_followers','IG Followers'],['tiktok_followers','TK Followers']] as [string,string][]).map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                  {label}<SortIcon col={col} />
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || categoryFilter ? 'No results match your filters.' : 'No talents yet.'}
                </td>
              </tr>
            )}
            {sorted.map(talent => {
              const agentNames = talent.talent_agents?.map(ta => ta.agent?.name).filter(Boolean).join(', ') ?? ''
              const isSelected = selected.has(talent.id)
              return (
                <tr key={talent.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-blue-50/30' : ''}`}>
                  <td className="pl-4 pr-2 py-3">
                    <button
                      onClick={() => toggleSelect(talent.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-500 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/talents/${talent.id}`} className="font-medium text-gray-900 hover:text-black">{talent.name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {talent.ig_link
                        ? <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="Instagram"><ExternalLink className="w-3 h-3" /> IG</a>
                        : <span className="text-xs text-gray-200">IG</span>}
                      {talent.tiktok_link
                        ? <a href={talent.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="TikTok"><ExternalLink className="w-3 h-3" /> TK</a>
                        : <span className="text-xs text-gray-200">TK</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{talent.talent_level ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3"><Badge value={talent.category} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                    {agentNames ? <span className="block truncate" title={agentNames}>{agentNames}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{talent.ig_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{talent.tiktok_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setDeleteTarget({ id: talent.id, name: talent.name })} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/talents/${talent.id}`} className="text-gray-300 hover:text-gray-500">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-xl px-4 py-2.5 shadow-xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button onClick={() => setSelected(new Set())} className="text-sm text-white/60 hover:text-white transition-colors">Clear</button>
          <button onClick={() => { setAddToProjectId(''); setAddToProjectDests(new Set()); setExistingLinks(new Map()); setAddToProjectOpen(true) }}
            className="inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
            <FolderInput className="w-3.5 h-3.5" />
            Add to Project
          </button>
          <button onClick={handleExportList} disabled={exportingList}
            className="inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-60">
            <FileDown className="w-3.5 h-3.5" />
            {exportingList ? 'Generating…' : 'Export List'}
          </button>
          <button onClick={openExport} className="inline-flex items-center gap-1.5 text-sm bg-white text-gray-900 rounded-lg px-3 py-1.5 hover:bg-gray-100 font-medium transition-colors">
            <FileDown className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      )}

      {/* Add to Project modal */}
      <Modal open={addToProjectOpen} onClose={() => setAddToProjectOpen(false)} title={`Add ${selected.size} Talent${selected.size !== 1 ? 's' : ''} to Project`}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Project</label>
            <SearchableProjectPicker projects={allProjects} selected={addToProjectId} onSelect={selectProject} />
          </div>
          {addToProjectId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Add under <span className="text-gray-400 font-normal">(select one or more)</span></label>
              {loadingLinks ? (
                <p className="text-xs text-gray-400 py-2">Checking existing links…</p>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                  {[{ id: 'project', label: 'Project level', italic: false }, ...selectedProjectBrands.map(pb => ({ id: pb.id, label: pb.brand?.name ?? 'Unknown Brand', italic: false }))].map(({ id, label }) => {
                    const already = existingLinks.get(id) ?? new Set()
                    const totalSel = selected.size
                    const alreadyCount = already.size
                    const allAdded = alreadyCount >= totalSel
                    const someAdded = alreadyCount > 0 && !allAdded
                    const isChecked = addToProjectDests.has(id)
                    return (
                      <button key={id} type="button" onClick={() => !allAdded && toggleDest(id)} disabled={allAdded}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors disabled:cursor-not-allowed ${isChecked ? 'bg-gray-900 text-white' : allAdded ? 'bg-gray-50 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                        <span className={id === 'project' ? 'font-medium' : ''}>{label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {allAdded && <span className="text-xs text-gray-300">All already added</span>}
                          {someAdded && <span className={`text-xs ${isChecked ? 'text-white/60' : 'text-gray-400'}`}>{alreadyCount}/{totalSel} already added</span>}
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {!loadingLinks && selectedProjectBrands.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No brands linked to this project yet.</p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddToProjectOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleAddToProject} disabled={addToProjectSaving || addToProjectDests.size === 0} className="flex-1">
              {addToProjectSaving ? 'Adding…' : 'Add to Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export modal */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Talent Report">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Report Title</label>
            <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="e.g. CANNES 2026" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">{selected.size} Talent{selected.size !== 1 ? 's' : ''}</label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {sorted.filter(t => selected.has(t.id)).map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-800 truncate mr-3">{t.name}</span>
                  <select
                    value={talentTypes[t.id] ?? 'Placement'}
                    onChange={e => setTalentTypes(prev => ({ ...prev, [t.id]: e.target.value as 'Placement' | 'Organic' }))}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black/10 bg-white shrink-0"
                  >
                    <option value="Placement">Placement</option>
                    <option value="Organic">Organic</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setExportOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleGeneratePDF} disabled={generating} className="flex-1">
              <FileDown className="w-3.5 h-3.5" />
              {generating ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Talent modal */}
      <Modal open={open} onClose={() => { setOpen(false); resetModal() }} title="Add Talent">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
            {talentNameExists && <p className="text-xs text-red-500 mt-1">A talent with this name already exists.</p>}
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

          {/* Agent */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-700">Agent</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAgentMode(agentMode === 'existing' ? '' : 'existing'); setSelectedAgentIds([]); setNewAgentName(''); setNewAgentType('') }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${agentMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                Select existing
              </button>
              <button type="button" onClick={() => { setAgentMode(agentMode === 'new' ? '' : 'new'); setSelectedAgentIds([]); setNewAgentName(''); setNewAgentType('') }}
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

          {/* Stylist */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-700">Stylist</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStylistMode(stylistMode === 'existing' ? '' : 'existing'); setSelectedStylistIds([]); setNewStylistName('') }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${stylistMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                Select existing
              </button>
              <button type="button" onClick={() => { setStylistMode(stylistMode === 'new' ? '' : 'new'); setSelectedStylistIds([]); setNewStylistName('') }}
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

          {/* People */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-700">People</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPersonMode(personMode === 'existing' ? '' : 'existing'); setSelectedPersonIds([]); setNewPersonName(''); setNewPersonType('') }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${personMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                Select existing
              </button>
              <button type="button" onClick={() => { setPersonMode(personMode === 'new' ? '' : 'new'); setSelectedPersonIds([]); setNewPersonName(''); setNewPersonType('') }}
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
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); resetModal() }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || talentNameExists} className="flex-1">{saving ? 'Saving…' : 'Add Talent'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Talent">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
