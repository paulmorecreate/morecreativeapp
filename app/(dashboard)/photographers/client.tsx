'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Photographer } from '@/lib/supabase/types'

type UserProfile = { id: string; email: string; color: string | null; first_name: string | null; surname: string | null }
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

type PhotographerWithContacts = Photographer & {
  photographer_contacts: { id: string; name: string | null; is_primary: boolean }[]
}

const SPECIALTY_OPTS = [
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Portrait', label: 'Portrait' },
  { value: 'Press / Editorial', label: 'Press / Editorial' },
  { value: 'Celebrity', label: 'Celebrity' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Documentary', label: 'Documentary' },
  { value: 'Red Carpet', label: 'Red Carpet' },
]

export function PhotographersClient({ photographers, userProfiles }: { photographers: PhotographerWithContacts[]; userProfiles: UserProfile[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const colorMap = new Map(userProfiles.map(p => [p.email, p.color]))
  const profileNameMap = new Map(userProfiles.map(p => [p.email, p.first_name || p.email.split('@')[0]]))
  function profileName(p: UserProfile) { return p.first_name || p.email.split('@')[0] }

  function formatLastUpdated(row: { updated_by: string | null; updated_at: string; created_by: string | null; created_at: string }) {
    const hasExplicitUpdate = !!row.updated_by
    const dateStr = hasExplicitUpdate ? row.updated_at : row.created_at
    const email = row.updated_by ?? row.created_by
    const d = new Date(dateStr)
    const date = `${d.getDate()}-${d.toLocaleString('en', { month: 'short' })}-${d.getFullYear()}`
    const person = email ? (profileNameMap.get(email) ?? email.split('@')[0]) : null
    const color = email ? (colorMap.get(email) ?? null) : null
    return { date, person, color }
  }

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', specialty: '', based: '', ig_link: '', website: '', notes: '' })

  const q = search.toLowerCase()
  const usedEmails = new Set(photographers.map(p => p.updated_by ?? p.created_by).filter(Boolean) as string[])
  const filterableProfiles = userProfiles.filter(p => usedEmails.has(p.email))
  const filtered = photographers.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      (p.specialty ?? '').toLowerCase().includes(q) ||
      (p.based ?? '').toLowerCase().includes(q) ||
      p.photographer_contacts?.some(c => (c.name ?? '').toLowerCase().includes(q))
    const matchUser = !userFilter || (p.updated_by ?? p.created_by) === userFilter
    return matchSearch && matchUser
  })

  const nameExists = form.name.trim() !== '' &&
    photographers.some(p => p.name.trim().toLowerCase() === form.name.trim().toLowerCase())

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('photographers').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('photographers').insert({
      name: form.name,
      specialty: form.specialty || null,
      based: form.based || null,
      ig_link: form.ig_link || null,
      website: form.website || null,
      notes: form.notes || null,
      created_by: user?.email ?? null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ name: '', specialty: '', based: '', ig_link: '', website: '', notes: '' })
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
    if (sortKey === 'last_updated') {
      const ad = new Date(a.updated_by ? a.updated_at : a.created_at).getTime()
      const bd = new Date(b.updated_by ? b.updated_at : b.created_at).getTime()
      return sortDir === 'asc' ? ad - bd : bd - ad
    }
    let av = '', bv = ''
    if (sortKey === 'name') { av = a.name; bv = b.name }
    else if (sortKey === 'specialty') { av = a.specialty ?? ''; bv = b.specialty ?? '' }
    else if (sortKey === 'based') { av = a.based ?? ''; bv = b.based ?? '' }
    else if (sortKey === 'contact') {
      av = a.photographer_contacts?.find(c => c.is_primary)?.name ?? ''
      bv = b.photographer_contacts?.find(c => c.is_primary)?.name ?? ''
    }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Photographers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sorted.length} of {photographers.length}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Photographer
        </Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search photographers…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
        {filterableProfiles.length > 0 && (
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
          >
            <option value="">All users</option>
            {filterableProfiles.map(p => <option key={p.email} value={p.email}>{profileName(p)}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {([['name','Name'],['specialty','Specialty'],['based','Based'],['contact','Primary Contact']] as const).map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                  {label}<SortIcon col={col} />
                </th>
              ))}
              <th onClick={() => toggleSort('last_updated')} className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap">
                Last Updated<SortIcon col="last_updated" />
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search ? 'No results.' : 'No photographers yet.'}
                </td>
              </tr>
            )}
            {sorted.map(p => {
              const primary = p.photographer_contacts?.find(c => c.is_primary)
              const { date: lastUpdatedDate, person: lastUpdatedPerson, color: lastUpdatedColor } = formatLastUpdated(p)
              return (
                <tr
                  key={p.id}
                  className="transition-colors group hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3">
                    <Link href={`/photographers/${p.id}`} className="font-medium text-gray-900 hover:text-black">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.specialty ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.based ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{primary?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-gray-800"
                      style={lastUpdatedColor ? { backgroundColor: lastUpdatedColor } : undefined}
                    >
                      {lastUpdatedDate}
                      {lastUpdatedPerson && <span className="opacity-70"> ({lastUpdatedPerson})</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/photographers/${p.id}`} className="text-gray-300 hover:text-gray-500">
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

      <Modal open={open} onClose={() => setOpen(false)} title="Add Photographer">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
            {nameExists && <p className="text-xs text-red-500 mt-1">A photographer with this name already exists.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Specialty</label>
              <Select value={form.specialty} onChange={field('specialty')} options={SPECIALTY_OPTS} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Based</label>
              <Input value={form.based} onChange={field('based')} placeholder="City, Country" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram URL</label>
              <Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Website / Portfolio</label>
              <Input value={form.website} onChange={field('website')} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || nameExists} className="flex-1">{saving ? 'Saving…' : 'Add Photographer'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Photographer">
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
