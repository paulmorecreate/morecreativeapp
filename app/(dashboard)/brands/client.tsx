'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight, Trash2, ChevronUp, ChevronDown, Check, Minus, FolderInput, FileDown } from 'lucide-react'
import { Brand, Industry, BrandCategory } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/constants/countries'

type BrandWithContacts = Brand & {
  contacts: { id: string; name: string | null; is_primary: boolean }[]
}

type SimpleProject = { id: string; name: string }

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
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
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

export function BrandsClient({ brands, industries, brandCategories, allProjects }: { brands: BrandWithContacts[]; industries: Industry[]; brandCategories: BrandCategory[]; allProjects: SimpleProject[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '', link: '', category: '',
    industry: '', country: '', notes: '',
  })

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [exportingList, setExportingList] = useState(false)

  async function handleExportList() {
    setExportingList(true)
    try {
      const [{ pdf }, { ListReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/list-report-pdf'),
      ])
      const rows = sorted.filter(b => selected.has(b.id)).map(b => [
        b.name,
        b.category ?? '',
        b.country ?? '',
      ])
      const columns = [
        { header: 'Name', width: '40%' },
        { header: 'Category', width: '30%' },
        { header: 'Country', width: '30%' },
      ]
      const blob = await pdf(<ListReportDocument title="Brands" columns={columns} rows={rows} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'brands-list.pdf'; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingList(false)
    }
  }

  // Add to Project
  const [addToProjectOpen, setAddToProjectOpen] = useState(false)
  const [addToProjectId, setAddToProjectId] = useState('')
  const [addToProjectSaving, setAddToProjectSaving] = useState(false)
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [alreadyLinked, setAlreadyLinked] = useState<Set<string>>(new Set())

  async function selectProject(id: string) {
    setAddToProjectId(id)
    setAlreadyLinked(new Set())
    setLoadingLinks(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('project_brands')
      .select('brand_id')
      .eq('project_id', id)
      .in('brand_id', [...selected])
    setAlreadyLinked(new Set((data ?? []).map(r => r.brand_id as string)))
    setLoadingLinks(false)
  }

  const categoryOpts = brandCategories.map(c => ({ value: c.name, label: c.name }))
  const brandNameExists = form.name.trim() !== '' && brands.some(b => b.name.trim().toLowerCase() === form.name.trim().toLowerCase())

  const filtered = brands.filter(b => {
    const primaryContact = b.contacts?.find(c => c.is_primary)?.name ?? ''
    const q = search.toLowerCase()
    const matchSearch = !search ||
      b.name.toLowerCase().includes(q) ||
      primaryContact.toLowerCase().includes(q)
    const matchCat = !categoryFilter || b.category === categoryFilter
    return matchSearch && matchCat
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('brands').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]))
    payload.name = form.name
    await supabase.from('brands').insert(payload)
    setSaving(false)
    setOpen(false)
    setForm({ name: '', link: '', category: '', industry: '', country: '', notes: '' })
    router.refresh()
  }

  async function handleAddToProject() {
    if (!addToProjectId) return
    const newBrands = [...selected].filter(id => !alreadyLinked.has(id))
    if (newBrands.length === 0) return
    setAddToProjectSaving(true)
    const supabase = createClient()
    await supabase.from('project_brands').insert(newBrands.map(brand_id => ({ project_id: addToProjectId, brand_id })))
    setAddToProjectSaving(false)
    setAddToProjectOpen(false)
    setAddToProjectId('')
    setAlreadyLinked(new Set())
    setSelected(new Set())
    router.refresh()
  }

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
    let av = '', bv = ''
    if (sortKey === 'name') { av = a.name; bv = b.name }
    else if (sortKey === 'category') { av = a.category ?? ''; bv = b.category ?? '' }
    else if (sortKey === 'contact') {
      av = a.contacts?.find(c => c.is_primary)?.name ?? ''
      bv = b.contacts?.find(c => c.is_primary)?.name ?? ''
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const allSelected = sorted.length > 0 && sorted.every(b => selected.has(b.id))
  const someSelected = sorted.some(b => selected.has(b.id))

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
    else setSelected(new Set(sorted.map(b => b.id)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sorted.length} of {brands.length}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Brand
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
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
              {(['name', 'category', 'contact'] as const).map(col => (
                <th key={col} onClick={() => toggleSort(col)} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                  {col === 'name' ? 'Name' : col === 'category' ? 'Category' : 'Contact'}<SortIcon col={col} />
                </th>
              ))}
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Link</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || categoryFilter ? 'No results match your filters.' : 'No brands yet.'}
                </td>
              </tr>
            )}
            {sorted.map(brand => {
              const primaryContact = brand.contacts?.find(c => c.is_primary)
              const isSelected = selected.has(brand.id)
              return (
                <tr key={brand.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-blue-50/30' : ''}`}>
                  <td className="pl-4 pr-2 py-3">
                    <button
                      onClick={() => toggleSelect(brand.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-500 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/brands/${brand.id}`} className="font-medium text-gray-900 hover:text-black">
                      {brand.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Badge value={brand.category} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {primaryContact ? (
                      <span>{primaryContact.name}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {brand.link ? (
                      <a href={brand.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                        <ExternalLink className="w-3 h-3" /> Website
                      </a>
                    ) : <span className="text-xs text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteTarget({ id: brand.id, name: brand.name })}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/brands/${brand.id}`} className="text-gray-300 hover:text-gray-500">
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
          <button onClick={() => { setAddToProjectId(''); setAddToProjectOpen(true) }}
            className="inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
            <FolderInput className="w-3.5 h-3.5" />
            Add to Project
          </button>
          <button onClick={handleExportList} disabled={exportingList}
            className="inline-flex items-center gap-1.5 text-sm bg-white text-gray-900 rounded-lg px-3 py-1.5 hover:bg-gray-100 font-medium transition-colors disabled:opacity-60">
            <FileDown className="w-3.5 h-3.5" />
            {exportingList ? 'Generating…' : 'Export List'}
          </button>
        </div>
      )}

      {/* Add to Project modal */}
      <Modal open={addToProjectOpen} onClose={() => setAddToProjectOpen(false)} title={`Add ${selected.size} Brand${selected.size !== 1 ? 's' : ''} to Project`}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Project</label>
            <SearchableProjectPicker projects={allProjects} selected={addToProjectId} onSelect={selectProject} />
          </div>
          {addToProjectId && !loadingLinks && alreadyLinked.size > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
              {alreadyLinked.size === selected.size
                ? 'All selected brands are already in this project.'
                : `${alreadyLinked.size} of ${selected.size} brand${alreadyLinked.size !== 1 ? 's are' : ' is'} already in this project and will be skipped.`}
            </div>
          )}
          {addToProjectId && loadingLinks && (
            <p className="text-xs text-gray-400">Checking existing links…</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddToProjectOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleAddToProject}
              disabled={addToProjectSaving || !addToProjectId || loadingLinks || alreadyLinked.size >= selected.size}
              className="flex-1">
              {addToProjectSaving ? 'Adding…' : alreadyLinked.size > 0 && alreadyLinked.size < selected.size
                ? `Add ${selected.size - alreadyLinked.size} to Project`
                : 'Add to Project'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Brand">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Brand name" />
            {brandNameExists && <p className="text-xs text-red-500 mt-1">A brand with this name already exists.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Industry</label>
              <Select value={form.industry} onChange={field('industry')} options={industries.map(i => ({ value: i.name, label: i.name }))} placeholder="Select…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Instagram / Website</label>
            <Input value={form.link} onChange={field('link')} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Country</label>
            <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Status update, situation…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || brandNameExists} className="flex-1">{saving ? 'Saving…' : 'Add Brand'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Brand">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
