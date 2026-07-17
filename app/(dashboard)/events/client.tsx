'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, MapPin, ChevronRight } from 'lucide-react'
import { Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

export function EventsClient({ events }: { events: Event[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', location: '', start_date: '', end_date: '', notes: '',
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]))
    payload.name = form.name
    await supabase.from('events').insert(payload)
    setSaving(false)
    setOpen(false)
    setForm({ name: '', location: '', start_date: '', end_date: '', notes: '' })
    router.refresh()
  }

  const now = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => e.start_date && e.start_date >= now)
  const past = events.filter(e => !e.start_date || e.start_date < now)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} total · {upcoming.length} upcoming</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="grid grid-cols-2 gap-4">
            {upcoming.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Dates</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {past.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="font-medium text-gray-700 hover:text-black">{event.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{event.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(event.start_date)}{event.end_date ? ` – ${formatDate(event.end_date)}` : ''}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/events/${event.id}`} className="text-gray-300 hover:text-gray-500"><ChevronRight className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">No events yet.</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Event">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Event Name *</label>
            <Input value={form.name} onChange={field('name')} required placeholder="e.g. Cannes 2026" />
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
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Any notes…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Event'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function EventCard({ event }: { event: Event }) {
  const now = new Date().toISOString().split('T')[0]
  const isActive = event.start_date && event.end_date
    ? event.start_date <= now && event.end_date >= now
    : false

  return (
    <Link href={`/events/${event.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all block">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-teal-600" />
        </div>
        {isActive && (
          <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Live</span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
      {event.location && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3" />
          {event.location}
        </div>
      )}
      {(event.start_date || event.end_date) && (
        <div className="text-xs text-gray-400">
          {formatDate(event.start_date)}{event.end_date ? ` – ${formatDate(event.end_date)}` : ''}
        </div>
      )}
    </Link>
  )
}
