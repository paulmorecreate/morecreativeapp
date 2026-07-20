'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { Stylist } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

type StylistWithContacts = Stylist & {
  stylist_contacts: { id: string; name: string | null; is_primary: boolean }[]
}

const SPECIALTY_OPTS = [
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Celebrity', label: 'Celebrity' },
  { value: 'Editorial', label: 'Editorial' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Personal Styling', label: 'Personal Styling' },
  { value: 'Red Carpet', label: 'Red Carpet' },
]

export function StylistsClient({ stylists }: { stylists: StylistWithContacts[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', specialty: '', based: '', ig_link: '', website: '', notes: '' })

  const q = search.toLowerCase()
  const filtered = stylists.filter(s =>
    !search ||
    s.name.toLowerCase().includes(q) ||
    (s.specialty ?? '').toLowerCase().includes(q) ||
    (s.based ?? '').toLowerCase().includes(q) ||
    s.stylist_contacts?.some(c => (c.name ?? '').toLowerCase().includes(q))
  )

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('stylists').insert({
      name: form.name,
      specialty: form.specialty || null,
      based: form.based || null,
      ig_link: form.ig_link || null,
      website: form.website || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ name: '', specialty: '', based: '', ig_link: '', website: '', notes: '' })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stylists</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stylists.length} total</p>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Specialty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Based</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Primary Contact</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  {search ? 'No results.' : 'No stylists yet.'}
                </td>
              </tr>
            )}
            {filtered.map(s => {
              const primary = s.stylist_contacts?.find(c => c.is_primary)
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/stylists/${s.id}`} className="font-medium text-gray-900 hover:text-black">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.specialty ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.based ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{primary?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/stylists/${s.id}`} className="text-gray-300 hover:text-gray-500">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Stylist">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="Full name" />
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
              <label className="text-xs font-medium text-gray-700">Website</label>
              <Input value={form.website} onChange={field('website')} placeholder="https://…" />
            </div>
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
    </div>
  )
}
