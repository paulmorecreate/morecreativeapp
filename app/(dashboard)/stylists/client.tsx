'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Trash2, ChevronUp, ChevronDown, Check, Minus, FileDown } from 'lucide-react'
import { Stylist } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

export function StylistsClient({ stylists }: { stylists: Stylist[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', based: '', email: '', phone: '', url: '', notes: '' })

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportingList, setExportingList] = useState(false)

  const q = search.toLowerCase()
  const filtered = stylists.filter(s =>
    !search ||
    s.name.toLowerCase().includes(q) ||
    (s.based ?? '').toLowerCase().includes(q) ||
    (s.email ?? '').toLowerCase().includes(q)
  )

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
    else if (sortKey === 'based') { av = a.based ?? ''; bv = b.based ?? '' }
    else if (sortKey === 'email') { av = a.email ?? ''; bv = b.email ?? '' }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const allSelected = sorted.length > 0 && sorted.every(s => selected.has(s.id))
  const someSelected = sorted.some(s => selected.has(s.id))

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map(s => s.id)))
  }

  async function handleExportList() {
    setExportingList(true)
    try {
      const [{ pdf }, { ListReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/list-report-pdf'),
      ])
      const rows = sorted.filter(s => selected.has(s.id)).map(s => [
        s.name,
        s.based ?? '',
        s.email ?? '',
        s.phone ?? '',
      ])
      const columns = [
        { header: 'Name', width: '28%' },
        { header: 'Based', width: '22%' },
        { header: 'Email', width: '30%' },
        { header: 'Phone', width: '20%' },
      ]
      const blob = await pdf(<ListReportDocument title="Stylists" columns={columns} rows={rows} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'stylists-list.pdf'; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingList(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('stylists').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('stylists').insert({
      name: form.name,
      based: form.based || null,
      email: form.email || null,
      phone: form.phone || null,
      url: form.url || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ name: '', based: '', email: '', phone: '', url: '', notes: '' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stylists</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sorted.length} of {stylists.length}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Stylist
        </Button>
      </div>

      <div className="relative flex-1 max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search stylists…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
        />
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
              {([['name','Name'],['based','Based'],['email','Email']] as const).map(([col, label]) => (
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
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search ? 'No results.' : 'No stylists yet.'}
                </td>
              </tr>
            )}
            {sorted.map(s => {
              const isSelected = selected.has(s.id)
              return (
                <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-blue-50/30' : ''}`}>
                  <td className="pl-4 pr-2 py-3">
                    <button
                      onClick={() => toggleSelect(s.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-500 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/stylists/${s.id}`} className="font-medium text-gray-900 hover:text-black">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.based ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.email ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/stylists/${s.id}`} className="text-gray-300 hover:text-gray-500">
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
          <button onClick={handleExportList} disabled={exportingList}
            className="inline-flex items-center gap-1.5 text-sm bg-white text-gray-900 rounded-lg px-3 py-1.5 hover:bg-gray-100 font-medium transition-colors disabled:opacity-60">
            <FileDown className="w-3.5 h-3.5" />
            {exportingList ? 'Generating…' : 'Export List'}
          </button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Stylist">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Based</label>
            <Input value={form.based} onChange={field('based')} placeholder="City, Country" />
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Website / Instagram</label>
            <Input value={form.url} onChange={field('url')} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Stylist'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Stylist">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
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
