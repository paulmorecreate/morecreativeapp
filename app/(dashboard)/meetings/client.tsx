'use client'

import { useState, useEffect, useCallback } from 'react'
import { Video, Plus, X, ExternalLink, Trash2, Calendar, Clock, Users, Loader2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TeamMember = { id: string; email: string; first_name: string | null; surname: string | null; color: string | null }

type CalendarEvent = {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { email: string; responseStatus?: string }[]
  hangoutLink?: string
  htmlLink?: string
}

type Props = {
  currentUserEmail: string
  teamMembers: TeamMember[]
  connectedEmail: string | null
}

function memberName(m: TeamMember) {
  return [m.first_name, m.surname].filter(Boolean).join(' ') || m.email
}

function formatEventDate(dt: string | undefined) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatEventTime(dt: string | undefined) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function groupEventsByDate(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const dt = ev.start.dateTime ?? ev.start.date ?? ''
    const day = dt.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(ev)
  }
  return groups
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function MeetingsClient({ currentUserEmail, teamMembers, connectedEmail }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: today,
    startTime: nowTime,
    duration: '60',
    attendees: [] as string[],
  })

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/meetings')
    const data = await res.json()
    setEvents(data.events ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  function toggleAttendee(email: string) {
    setForm(f => ({
      ...f,
      attendees: f.attendees.includes(email)
        ? f.attendees.filter(e => e !== email)
        : [...f.attendees, email],
    }))
  }

  async function handleCreate() {
    if (!form.title || !form.date || !form.startTime) return
    setSaving(true)
    setError(null)

    const [h, m] = form.startTime.split(':').map(Number)
    const start = new Date(`${form.date}T${form.startTime}:00`)
    const end = new Date(start.getTime() + Number(form.duration) * 60000)

    // Always include the connected account and current user
    const allAttendees = Array.from(new Set([
      currentUserEmail,
      ...form.attendees,
    ]))

    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: allAttendees,
        timeZone: 'Asia/Dubai',
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Failed to create meeting')
    } else {
      setShowNew(false)
      setForm({ title: '', description: '', date: today, startTime: nowTime, duration: '60', attendees: [] })
      await loadEvents()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch('/api/meetings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: deleteTarget.id }),
    })
    setDeleteTarget(null)
    setDeleting(false)
    await loadEvents()
  }

  const grouped = groupEventsByDate(events)
  const days = Object.keys(grouped).sort()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {connectedEmail ? (
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-green-500" />
                Connected as {connectedEmail}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600">
                <WifiOff className="w-3 h-3" />
                Google Calendar not connected
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!connectedEmail && (
            <a href="/api/auth/google">
              <Button variant="secondary">
                <Video className="w-4 h-4" />
                Connect Google Calendar
              </Button>
            </a>
          )}
          {connectedEmail && (
            <Button onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4" />
              New Meeting
            </Button>
          )}
        </div>
      </div>

      {/* New meeting modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">New Meeting</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Meeting title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Time</label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Duration</label>
                <select
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Attendees</label>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.email)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        form.attendees.includes(m.email) || m.email === currentUserEmail
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      )}
                      disabled={m.email === currentUserEmail}
                    >
                      {memberName(m)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">You are always included. All attendees receive a calendar invite.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add agenda or notes…"
                  rows={2}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.title}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Video className="w-3.5 h-3.5" /> Create with Meet</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Cancel Meeting</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">Cancel <span className="font-semibold">{deleteTarget.summary}</span>? All attendees will be notified.</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Keep</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Cancelling…' : 'Cancel Meeting'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!connectedEmail ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Video className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500 mb-1">Google Calendar not connected</p>
          <p className="text-xs text-gray-400 mb-5">Connect once to create Google Meet meetings for the whole team.</p>
          <a href="/api/auth/google">
            <Button>
              <Video className="w-4 h-4" />
              Connect Google Calendar
            </Button>
          </a>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-sm text-gray-400">No upcoming meetings. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {days.map(day => (
            <div key={day}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {formatDayLabel(day)}
              </p>
              <div className="space-y-2">
                {grouped[day].map(ev => {
                  const startDt = ev.start.dateTime
                  const endDt = ev.end.dateTime
                  const meetLink = ev.hangoutLink
                  return (
                    <div key={ev.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{ev.summary}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatEventTime(startDt)} – {formatEventTime(endDt)}
                            </span>
                            {ev.attendees && ev.attendees.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                {ev.attendees.length} attendee{ev.attendees.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{ev.description}</p>
                          )}
                          {ev.attendees && ev.attendees.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ev.attendees.map(a => (
                                <span key={a.email} className={cn(
                                  'px-2 py-0.5 rounded-full text-xs',
                                  a.responseStatus === 'accepted' ? 'bg-green-50 text-green-700' :
                                  a.responseStatus === 'declined' ? 'bg-red-50 text-red-600' :
                                  'bg-gray-100 text-gray-500'
                                )}>
                                  {a.email.split('@')[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {meetLink && (
                            <a
                              href={meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Video className="w-3 h-3" />
                              Join
                            </a>
                          )}
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setDeleteTarget(ev)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Cancel meeting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
