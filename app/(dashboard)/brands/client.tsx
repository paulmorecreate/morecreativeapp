'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight } from 'lucide-react'
import { Brand, Industry } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

type BrandWithContacts = Brand & {
  contacts: { id: string; name: string | null; is_primary: boolean }[]
}

const statusOpts = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const categoryOpts = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'dressing', label: 'Dressing' },
  { value: 'main', label: 'Main' },
  { value: 'prospect', label: 'Prospect' },
]

const COUNTRIES = [
  'Australia','Austria','Belgium','Brazil','Canada','China','Denmark','Finland',
  'France','Germany','Greece','India','Ireland','Italy','Japan','Mexico',
  'Netherlands','New Zealand','Norway','Poland','Portugal','Russia','Saudi Arabia',
  'South Korea','Spain','Sweden','Switzerland','Turkey','UAE','UK','USA',
].map(c => ({ value: c, label: c }))

export function BrandsClient({ brands, industries }: { brands: BrandWithContacts[]; industries: Industry[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', link: '', tiktok_link: '', category: '',
    status: 'prospect', industry: '', country: '', notes: '',
  })

  const filtered = brands.filter(b => {
    const primaryContact = b.contacts?.find(c => c.is_primary)?.name ?? ''
    const q = search.toLowerCase()
    const matchSearch = !search ||
      b.name.toLowerCase().includes(q) ||
      primaryContact.toLowerCase().includes(q)
    const matchCat = !categoryFilter || b.category === categoryFilter
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchSearch && matchCat && matchStatus
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
    await supabase.from('brands').insert(payload)
    setSaving(false)
    setOpen(false)
    setForm({ name: '', link: '', tiktok_link: '', category: '', status: 'prospect', industry: '', country: '', notes: '' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">{brands.length} total</p>
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white text-gray-700"
        >
          <option value="">All statuses</option>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Contact</th>
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
                  {search || categoryFilter || statusFilter ? 'No results match your filters.' : 'No brands yet.'}
                </td>
              </tr>
            )}
            {filtered.map(brand => {
              const primaryContact = brand.contacts?.find(c => c.is_primary)
              return (
                <tr key={brand.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/brands/${brand.id}`} className="font-medium text-gray-900 hover:text-black">
                      {brand.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><Badge value={brand.category} /></td>
                  <td className="px-4 py-3"><Badge value={brand.status} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {primaryContact ? (
                      <span>{primaryContact.name}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{brand.ig_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{brand.tiktok_followers ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {brand.link ? (
                        <a href={brand.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="Instagram / Website">
                          <ExternalLink className="w-3 h-3" /> IG
                        </a>
                      ) : <span className="text-xs text-gray-200">IG</span>}
                      {brand.tiktok_link ? (
                        <a href={brand.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700" title="TikTok">
                          <ExternalLink className="w-3 h-3" /> TK
                        </a>
                      ) : <span className="text-xs text-gray-200">TK</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/brands/${brand.id}`} className="text-gray-300 hover:text-gray-500">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Brand">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Brand name" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram / Website</label>
              <Input value={form.link} onChange={field('link')} type="url" placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok</label>
              <Input value={form.tiktok_link} onChange={field('tiktok_link')} type="url" placeholder="https://tiktok.com/@…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Industry</label>
              <Select value={form.industry} onChange={field('industry')} options={industries.map(i => ({ value: i.name, label: i.name }))} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Status update, situation…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Brand'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
