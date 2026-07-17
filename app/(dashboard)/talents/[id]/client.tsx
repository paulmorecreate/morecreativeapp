'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { Talent, Opportunity, TalentEventDetail, Conversation } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, truncate } from '@/lib/utils'

const categoryOpts = [
  { value: '', label: '—' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]

const statusOpts = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
]

type Props = {
  talent: Talent
  opportunities: (Opportunity & { brand?: { name: string } | null; event?: { name: string } | null })[]
  eventDetails: (TalentEventDetail & { event?: { name: string } | null })[]
  conversations: Conversation[]
}

export function TalentDetailClient({ talent, opportunities, eventDetails, conversations }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: talent.name ?? '',
    ig_link: talent.ig_link ?? '',
    category: talent.category ?? '',
    status: talent.status ?? 'confirmed',
    agency: talent.agency ?? '',
    country: talent.country ?? '',
    contact: talent.contact ?? '',
    notes: talent.notes ?? '',
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('talents').update({
      name: form.name || null,
      ig_link: form.ig_link || null,
      category: form.category || null,
      status: form.status || null,
      agency: form.agency || null,
      country: form.country || null,
      contact: form.contact || null,
      notes: form.notes || null,
    }).eq('id', talent.id)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const displayTalent = { ...talent, ...form }

  return (
    <div>
      <div className="mb-6">
        <Link href="/talents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Talents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{talent.name}</h1>
            {talent.ig_link && (
              <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-1">
                <ExternalLink className="w-3 h-3" />
                Instagram
              </a>
            )}
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              {[
                { label: 'Category', value: <Badge value={talent.category} /> },
                { label: 'Status', value: <Badge value={talent.status} /> },
                { label: 'Agency', value: talent.agency },
                { label: 'Country', value: talent.country },
                { label: 'Contact', value: talent.contact },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value ?? <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>

          {talent.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{talent.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <span className="text-xs text-gray-400">{opportunities?.length ?? 0}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked.</p>
              )}
              {opportunities?.map(opp => (
                <div key={opp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {opp.brand?.name ?? 'No brand'} — {opp.type ?? 'No type'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{opp.event?.name ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opp.estimated_value && <span className="text-xs text-gray-500">{formatCurrency(opp.estimated_value)}</span>}
                    <Badge value={opp.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {eventDetails && eventDetails.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Event Logistics</h2>
              </div>
              {eventDetails.map(detail => (
                <div key={detail.id} className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3">
                    {detail.event?.name ?? 'Unknown Event'}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Carpet Date', detail.carpet_date],
                      ['Hotel', detail.hotel],
                      ['Ticket', detail.ticket],
                      ['Driver', detail.driver],
                      ['Makeup', detail.makeup],
                      ['Hair', detail.hair],
                      ['Dress', detail.dress],
                      ['Jewelry', detail.jewelry],
                      ['Shoes', detail.shoes],
                      ['Content', detail.content],
                      ['Agent', detail.agent_contact],
                    ].map(([label, val]) => val ? (
                      <div key={label as string}>
                        <dt className="text-xs text-gray-400">{label}</dt>
                        <dd className="text-sm text-gray-700">{truncate(val as string, 80)}</dd>
                      </div>
                    ) : null)}
                  </div>
                  {detail.extra_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 whitespace-pre-wrap">{detail.extra_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>
              )}
              {conversations?.map(c => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={c.status} />
                    <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit Talent">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Instagram URL</label>
            <Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={form.status} onChange={field('status')} options={statusOpts} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Agency</label>
              <Input value={form.agency} onChange={field('agency')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Input value={form.country} onChange={field('country')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Contact</label>
            <Textarea value={form.contact} onChange={field('contact')} rows={2} placeholder="Agent name, phone, email…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={4} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
