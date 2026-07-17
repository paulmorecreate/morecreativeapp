'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight } from 'lucide-react'
import { Talent } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const statusOpts = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'available', label: 'Available' },
  { value: 'cancelled', label: 'Cancelled' },
]

const categoryOpts = [
  { value: 'A', label: 'A — Top Priority' },
  { value: 'B', label: 'B — Secondary' },
  { value: 'C', label: 'C — Paying' },
]

export function TalentsClient({ talents }: { talents: Talent[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', ig_link: '', category: '', status: 'prospect',
    contact: '', agency: '', country: '', notes: '',
  })

  const filtered = talents.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !search || t.name.toLowerCase().includes(q) || (t.agency ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchCat = !categoryFilter || t.category === categoryFilter
    return matchSearch && matchStatus && matchCat
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]))
    payload.name = form.name
    await supabase.from('talents').insert(payload)
    setSaving(false)
    setOpen(false)
    setForm({ name: '', ig_link: '', category: '', status: 'prospect', contact: '', agency: '', country: '', notes: '' })
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

      {/* Filters */}
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All statuses</option>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Cat</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">IG</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search || statusFilter || categoryFilter ? 'No results match your filters.' : 'No talents yet. Add the first one.'}
                </td>
              </tr>
            )}
            {filtered.map(talent => (
              <tr key={talent.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/talents/${talent.id}`} className="font-medium text-gray-900 hover:text-black">
                    {talent.name}
                  </Link>
                </td>
                <td className="px-4 py-3"><Badge value={talent.category} /></td>
                <td className="px-4 py-3"><Badge value={talent.status} /></td>
                <td className="px-4 py-3 text-gray-600">{talent.agency ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{talent.contact ?? '—'}</td>
                <td className="px-4 py-3">
                  {talent.ig_link ? (
                    <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/talents/${talent.id}`} className="text-gray-300 hover:text-gray-500">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Talent">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={form.status} onChange={field('status')} options={statusOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Instagram Link</label>
            <Input value={form.ig_link} onChange={field('ig_link')} type="url" placeholder="https://instagram.com/…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Agency</label>
              <Input value={form.agency} onChange={field('agency')} placeholder="Agency name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Input value={form.country} onChange={field('country')} placeholder="Country" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Contact Info</label>
            <Textarea value={form.contact} onChange={field('contact')} rows={2} placeholder="Agent email / WhatsApp / notes…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any notes…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Talent'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
