'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Pencil, Plus } from 'lucide-react'
import { Event } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const statusOpts = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const typeOpts = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'carpet', label: 'Red Carpet' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'photoshoot', label: 'Photoshoot' },
  { value: 'cover', label: 'Magazine Cover' },
  { value: 'collaboration', label: 'Collaboration' },
]

const priorityOpts = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

type TalentDetail = {
  id: string
  carpet_date: string | null
  hotel: string | null
  dress: string | null
  jewelry: string | null
  agent_contact: string | null
  talent: { id: string; name: string; category: string | null; status: string | null } | null
}

type Opportunity = {
  id: string
  type: string | null
  status: string | null
  talent: { name: string } | null
  brand: { name: string } | null
}

type SimpleRecord = { id: string; name: string }

type Props = {
  event: Event
  talentDetails: TalentDetail[]
  opportunities: Opportunity[]
  talents: SimpleRecord[]
  brands: SimpleRecord[]
}

export function EventDetailClient({ event, talentDetails, opportunities, talents, brands }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [oppOpen, setOppOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [oppForm, setOppForm] = useState({
    talent_id: '', brand_id: '', type: '',
    status: 'prospect', priority: 'medium', estimated_value: '',
    follow_up: '', notes: '',
  })
  const [form, setForm] = useState({
    name: event.name ?? '',
    location: event.location ?? '',
    start_date: event.start_date ?? '',
    end_date: event.end_date ?? '',
    notes: event.notes ?? '',
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function oppField(k: keyof typeof oppForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setOppForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleOppSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').insert({
      event_id: event.id,
      talent_id: oppForm.talent_id || null,
      brand_id: oppForm.brand_id || null,
      type: oppForm.type || null,
      status: oppForm.status,
      priority: oppForm.priority,
      estimated_value: oppForm.estimated_value ? parseFloat(oppForm.estimated_value) : null,
      follow_up: oppForm.follow_up || null,
      notes: oppForm.notes || null,
    })
    setSaving(false)
    setOppOpen(false)
    setOppForm({ talent_id: '', brand_id: '', type: '', status: 'prospect', priority: 'medium', estimated_value: '', follow_up: '', notes: '' })
    router.refresh()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('events').update({
      name: form.name || null,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || null,
    }).eq('id', event.id)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Events
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{event.name}</h1>
            <div className="flex items-center gap-4 mt-1.5">
              {event.location && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> {event.location}
                </span>
              )}
              {(event.start_date || event.end_date) && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(event.start_date)}{event.end_date ? ` – ${formatDate(event.end_date)}` : ''}
                </span>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {event.notes && (
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.notes}</p>
            </div>
          </div>
        )}

        <div className={event.notes ? 'col-span-2' : 'col-span-3'}>
          <div className="bg-white rounded-xl border border-gray-200 mb-5">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Talent Schedule</h2>
              <span className="text-xs text-gray-400">{talentDetails.length} talents</span>
            </div>
            {!talentDetails.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No talent details added yet.</p>
            )}
            {talentDetails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Talent</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Carpet</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Hotel</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Dress</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Jewelry</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {talentDetails.map(detail => (
                      <tr key={detail.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Link href={`/talents/${detail.talent?.id}`} className="font-medium text-gray-900 hover:text-black">
                            {detail.talent?.name ?? '—'}
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge value={detail.talent?.category} />
                            <Badge value={detail.talent?.status} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.carpet_date ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.hotel ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.dress ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.jewelry ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.agent_contact ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{opportunities.length}</span>
                <Button variant="secondary" onClick={() => setOppOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked to this event.</p>
              )}
              {opportunities.map(opp => (
                <div key={opp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {opp.talent?.name ?? '—'} × {opp.brand?.name ?? '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 capitalize">{opp.type ?? '—'}</div>
                  </div>
                  <Badge value={opp.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={oppOpen} onClose={() => setOppOpen(false)} title="Add Opportunity">
        <form onSubmit={handleOppSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select value={oppForm.talent_id} onChange={oppField('talent_id')} options={talents.map(t => ({ value: t.id, label: t.name }))} placeholder="Select talent…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select value={oppForm.brand_id} onChange={oppField('brand_id')} options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="Select brand…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Type</label>
            <Select value={oppForm.type} onChange={oppField('type')} options={typeOpts} placeholder="Select type…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={oppForm.status} onChange={oppField('status')} options={statusOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Priority</label>
              <Select value={oppForm.priority} onChange={oppField('priority')} options={priorityOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Value (€)</label>
              <Input type="number" value={oppForm.estimated_value} onChange={oppField('estimated_value')} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up</label>
            <Input value={oppForm.follow_up} onChange={oppField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={oppForm.notes} onChange={oppField('notes')} rows={2} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOppOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit Event">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Event Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Location</label>
            <Input value={form.location} onChange={field('location')} placeholder="City, Country" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start Date</label>
              <Input type="date" value={form.start_date} onChange={field('start_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <Input type="date" value={form.end_date} onChange={field('end_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
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
