'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Video, Plus, X, ExternalLink, Trash2, ChevronLeft, ChevronRight, Loader2, Wifi, WifiOff, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type View = 'month' | 'week' | 'schedule'

type TeamMember = {
  id: string
  email: string
  first_name: string | null
  surname: string | null
  color: string | null
}

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

type WeekEntry = {
  event: CalendarEvent
  startCol: number
  endCol: number
  lane: number
  startsThisWeek: boolean
  endsThisWeek: boolean
}

type Props = {
  currentUserEmail: string
  teamMembers: TeamMember[]
  connectedEmail: string | null
}

// ── Date utilities ────────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function getMonthGrid(y: number, m: number): Date[] {
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const last = new Date(y, m + 1, 0)
  const totalDays = Math.ceil((last.getDate() + first.getDay()) / 7) * 7
  return Array.from({ length: totalDays }, (_, i) => addDays(start, i))
}
function getWeekDays(d: Date): Date[] {
  const s = new Date(d); s.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}
function evStart(ev: CalendarEvent): Date {
  return new Date(ev.start.dateTime ?? ev.start.date ?? '')
}
function evEnd(ev: CalendarEvent): Date {
  const d = new Date(ev.end.dateTime ?? ev.end.date ?? '')
  if (!ev.end.dateTime) d.setDate(d.getDate() - 1) // all-day end is exclusive
  return d
}
function occursOn(ev: CalendarEvent, day: Date): boolean {
  const s = startOfDay(evStart(ev))
  const e = startOfDay(evEnd(ev))
  const d = startOfDay(day)
  return d >= s && d <= e
}
function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function dayLabel(d: Date): string {
  if (d.getDate() === 1) return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  return String(d.getDate())
}
function memberName(m: TeamMember) {
  return [m.first_name, m.surname].filter(Boolean).join(' ') || m.email
}

// ── Layout constants ──────────────────────────────────────────────────────────

const MAX_LANES = 3
const EVENT_H = 20
const EVENT_GAP = 2
const DAY_NUM_H = 30
const CELL_MIN_H = DAY_NUM_H + MAX_LANES * (EVENT_H + EVENT_GAP) + 20
const HOUR_H = 56
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function layoutWeekEvents(weekDays: Date[], events: CalendarEvent[]): WeekEntry[] {
  const weekStart = startOfDay(weekDays[0])
  const weekEnd = startOfDay(addDays(weekDays[6], 1))

  const intersecting = events.filter(ev => {
    const s = startOfDay(evStart(ev))
    const e = startOfDay(evEnd(ev))
    return s < weekEnd && e >= weekStart
  }).sort((a, b) => {
    const as = startOfDay(evStart(a)), bs = startOfDay(evStart(b))
    if (as < bs) return -1
    if (as > bs) return 1
    const ad = startOfDay(evEnd(a)).getTime() - as.getTime()
    const bd = startOfDay(evEnd(b)).getTime() - bs.getTime()
    return bd - ad // longer events first
  })

  const laneEnds: number[] = []
  return intersecting.map(ev => {
    const s = startOfDay(evStart(ev))
    const e = startOfDay(evEnd(ev))
    const startCol = Math.max(0, Math.round((s.getTime() - weekStart.getTime()) / 86400000))
    const endCol = Math.min(6, Math.round((e.getTime() - weekStart.getTime()) / 86400000))

    let lane = 0
    while (lane < laneEnds.length && (laneEnds[lane] ?? -1) >= startCol) lane++
    laneEnds[lane] = endCol

    return {
      event: ev,
      startCol,
      endCol,
      lane,
      startsThisWeek: s >= weekStart,
      endsThisWeek: e < weekEnd,
    }
  })
}

// ── Event colors ──────────────────────────────────────────────────────────────

const EV_COLORS = [
  { bar: 'bg-blue-500 hover:bg-blue-600', solid: 'bg-blue-500' },
  { bar: 'bg-indigo-500 hover:bg-indigo-600', solid: 'bg-indigo-500' },
  { bar: 'bg-violet-500 hover:bg-violet-600', solid: 'bg-violet-500' },
  { bar: 'bg-emerald-500 hover:bg-emerald-600', solid: 'bg-emerald-500' },
  { bar: 'bg-rose-500 hover:bg-rose-600', solid: 'bg-rose-500' },
]
function evColor(ev: CalendarEvent) {
  const h = [...ev.id].reduce((a, c) => a + c.charCodeAt(0), 0)
  return EV_COLORS[h % EV_COLORS.length]
}

// ── Main component ────────────────────────────────────────────────────────────

export function MeetingsClient({ currentUserEmail, teamMembers, connectedEmail }: Props) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [view, setView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const weekScrollRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: todayStr,
    startTime: '10:00',
    duration: '60',
    attendees: [] as string[],
    externalAttendees: [] as string[],
  })
  const [externalInput, setExternalInput] = useState('')

  function getFetchRange(): { start: Date; end: Date } {
    if (view === 'month') {
      const grid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth())
      return { start: grid[0], end: addDays(grid[grid.length - 1], 1) }
    }
    if (view === 'week') {
      const days = getWeekDays(currentDate)
      return { start: days[0], end: addDays(days[6], 1) }
    }
    return { start: today, end: addDays(today, 60) }
  }

  const loadEvents = useCallback(async () => {
    if (!connectedEmail) { setLoading(false); return }
    setLoading(true)
    const { start, end } = getFetchRange()
    try {
      const res = await fetch(`/api/meetings?start=${start.toISOString()}&end=${end.toISOString()}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), connectedEmail])

  useEffect(() => { loadEvents() }, [loadEvents])

  useEffect(() => {
    if (view === 'week' && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = 7 * HOUR_H
    }
  }, [view, currentDate])

  function navigate(dir: 1 | -1) {
    setCurrentDate(d => {
      const r = new Date(d)
      if (view === 'month') r.setMonth(r.getMonth() + dir)
      else if (view === 'week') r.setDate(r.getDate() + dir * 7)
      return r
    })
  }

  function navTitle(): string {
    if (view === 'month') return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (view === 'week') {
      const days = getWeekDays(currentDate)
      const s = days[0], e = days[6]
      if (s.getMonth() === e.getMonth()) return s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
    return 'Upcoming'
  }

  function openNew(date?: string, time?: string) {
    setForm(f => ({ ...f, date: date ?? todayStr, startTime: time ?? '10:00', attendees: [], externalAttendees: [] }))
    setExternalInput('')
    setShowNew(true)
  }

  function addExternalAttendee() {
    const email = externalInput.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (form.externalAttendees.includes(email)) { setExternalInput(''); return }
    setForm(f => ({ ...f, externalAttendees: [...f.externalAttendees, email] }))
    setExternalInput('')
  }

  function removeExternalAttendee(email: string) {
    setForm(f => ({ ...f, externalAttendees: f.externalAttendees.filter(e => e !== email) }))
  }

  function toggleAttendee(email: string) {
    setForm(f => ({
      ...f,
      attendees: f.attendees.includes(email) ? f.attendees.filter(e => e !== email) : [...f.attendees, email],
    }))
  }

  async function handleCreate() {
    if (!form.title || !form.date) return
    setSaving(true)
    setError(null)
    const start = new Date(`${form.date}T${form.startTime}:00`)
    const end = new Date(start.getTime() + Number(form.duration) * 60000)
    const allAttendees = Array.from(new Set([currentUserEmail, ...form.attendees, ...form.externalAttendees]))
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
      setExternalInput('')
      setForm({ title: '', description: '', date: todayStr, startTime: '10:00', duration: '60', attendees: [], externalAttendees: [] })
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
    setSelectedEvent(null)
    await loadEvents()
  }

  const monthGrid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth())
  const weekDays = getWeekDays(currentDate)

  return (
    <div className="flex flex-col min-h-0">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          {connectedEmail
            ? <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Wifi className="w-3 h-3 text-green-500" />{connectedEmail}<a href="/api/auth/google" className="text-blue-500 hover:text-blue-700 underline ml-1">Switch account</a></p>
            : <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><WifiOff className="w-3 h-3" />Not connected</p>
          }
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {!connectedEmail && (
            <a href="/api/auth/google">
              <Button variant="secondary" size="sm"><Video className="w-3.5 h-3.5" />Connect Google Calendar</Button>
            </a>
          )}
          {connectedEmail && (
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="w-3.5 h-3.5" />New Meeting
            </Button>
          )}
        </div>
      </div>

      {!connectedEmail ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Video className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500 mb-1">Google Calendar not connected</p>
          <p className="text-xs text-gray-400 mb-5">Connect once to create Google Meet meetings for the whole team.</p>
          <a href="/api/auth/google"><Button><Video className="w-4 h-4" />Connect Google Calendar</Button></a>
        </div>
      ) : (
        <>
          {/* Calendar toolbar */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            {view !== 'schedule' && (
              <>
                <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </>
            )}
            <span className="text-base font-semibold text-gray-900 ml-1">{navTitle()}</span>
            {loading && <Loader2 className="w-4 h-4 text-gray-300 animate-spin ml-1" />}
            <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
              {(['month', 'week', 'schedule'] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                    view === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === 'month' && (
            <MonthView
              grid={monthGrid}
              currentMonth={currentDate.getMonth()}
              events={events}
              today={today}
              onDayClick={day => openNew(day.toISOString().slice(0, 10))}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'week' && (
            <WeekView
              days={weekDays}
              events={events}
              today={today}
              scrollRef={weekScrollRef}
              onEventClick={setSelectedEvent}
              onSlotClick={(day, hour) => openNew(day.toISOString().slice(0, 10), `${String(hour).padStart(2, '0')}:00`)}
            />
          )}
          {view === 'schedule' && (
            <ScheduleView events={events} today={today} onEventClick={setSelectedEvent} />
          )}
        </>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={() => { setDeleteTarget(selectedEvent); setSelectedEvent(null) }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Cancel Meeting</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
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

      {/* New meeting modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">New Meeting</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Time</label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Duration</label>
                <select
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
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
                      onClick={() => m.email !== currentUserEmail && toggleAttendee(m.email)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        (form.attendees.includes(m.email) || m.email === currentUserEmail)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      {memberName(m)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">You are always included. All attendees receive a calendar invite.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">External attendees</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={externalInput}
                    onChange={e => setExternalInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExternalAttendee() } }}
                    placeholder="email@example.com"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addExternalAttendee}
                    className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
                {form.externalAttendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.externalAttendees.map(email => (
                      <span key={email} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                        {email}
                        <button type="button" onClick={() => removeExternalAttendee(email)} className="text-blue-400 hover:text-blue-700 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Agenda or notes…" rows={2} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.title}>
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</>
                  : <><Video className="w-3.5 h-3.5" />Create with Meet</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ grid, currentMonth, events, today, onDayClick, onEventClick }: {
  grid: Date[]
  currentMonth: number
  events: CalendarEvent[]
  today: Date
  onDayClick: (day: Date) => void
  onEventClick: (ev: CalendarEvent) => void
}) {
  const weeks: Date[][] = []
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((weekDays, wi) => {
        const entries = layoutWeekEvents(weekDays, events)

        return (
          <div key={wi} className="relative border-b border-gray-100 last:border-b-0" style={{ minHeight: `${CELL_MIN_H}px` }}>
            {/* Day cell backgrounds + day numbers (absolute so they don't affect row height) */}
            <div className="grid grid-cols-7 absolute inset-0 z-0">
              {weekDays.map((day, col) => {
                const isCurrentMonth = day.getMonth() === currentMonth
                const isToday = sameDay(day, today)
                const overflow = entries.filter(e =>
                  e.startCol <= col && e.endCol >= col && e.lane >= MAX_LANES
                ).length
                return (
                  <div
                    key={col}
                    onClick={() => onDayClick(day)}
                    className={cn(
                      'h-full border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors',
                      isCurrentMonth ? 'hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100/60'
                    )}
                  >
                    <div className="flex items-center justify-center pt-1.5">
                      <span className={cn(
                        'w-7 h-7 flex items-center justify-center text-xs rounded-full font-medium',
                        isToday ? 'bg-blue-600 text-white font-semibold' : isCurrentMonth ? 'text-gray-800' : 'text-gray-300'
                      )}>
                        {dayLabel(day)}
                      </span>
                    </div>
                    {overflow > 0 && (
                      <div
                        className="text-xs text-gray-400 px-1.5 hover:text-gray-600"
                        style={{ marginTop: `${MAX_LANES * (EVENT_H + EVENT_GAP) + 2}px` }}
                      >
                        {overflow} more
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Event bars (absolute, on top of cells) */}
            {entries
              .filter(e => e.lane < MAX_LANES)
              .map(e => {
                const color = evColor(e.event)
                const isAllDay = !e.event.start.dateTime
                const top = DAY_NUM_H + e.lane * (EVENT_H + EVENT_GAP)
                const leftPct = (e.startCol / 7) * 100
                const widthPct = ((e.endCol - e.startCol + 1) / 7) * 100
                const lPad = e.startsThisWeek ? 2 : 0
                const rPad = e.endsThisWeek ? 2 : 0
                return (
                  <div
                    key={`${e.event.id}-${wi}`}
                    onClick={evt => { evt.stopPropagation(); onEventClick(e.event) }}
                    style={{
                      position: 'absolute',
                      top: `${top}px`,
                      height: `${EVENT_H}px`,
                      left: `calc(${leftPct}% + ${lPad}px)`,
                      width: `calc(${widthPct}% - ${lPad + rPad}px)`,
                    }}
                    className={cn(
                      'flex items-center text-white text-xs px-1.5 cursor-pointer z-10 overflow-hidden select-none transition-opacity hover:opacity-90',
                      color.bar,
                      e.startsThisWeek && 'rounded-l',
                      e.endsThisWeek && 'rounded-r',
                    )}
                    title={e.event.summary}
                  >
                    {e.startsThisWeek && !isAllDay && e.event.start.dateTime && (
                      <span className="font-semibold mr-1 shrink-0 text-[11px]">{fmtTime(e.event.start.dateTime)}</span>
                    )}
                    <span className="truncate">{e.event.summary}</span>
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ days, events, today, scrollRef, onEventClick, onSlotClick }: {
  days: Date[]
  events: CalendarEvent[]
  today: Date
  scrollRef: React.RefObject<HTMLDivElement | null>
  onEventClick: (ev: CalendarEvent) => void
  onSlotClick: (day: Date, hour: number) => void
}) {
  const now = new Date()
  const isCurrentWeek = days.some(d => sameDay(d, today))
  const nowTop = (now.getHours() * 60 + now.getMinutes()) * HOUR_H / 60

  function timedEventsForDay(day: Date) {
    return events.filter(ev => ev.start.dateTime && occursOn(ev, day))
      .sort((a, b) => evStart(a).getTime() - evStart(b).getTime())
  }
  function allDayEventsForDay(day: Date) {
    return events.filter(ev => !ev.start.dateTime && occursOn(ev, day))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-gray-200 shrink-0">
        <div className="py-2" />
        {days.map(day => {
          const isToday = sameDay(day, today)
          const allDay = allDayEventsForDay(day)
          return (
            <div key={day.toISOString()} className="py-2 text-center border-l border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
              <div className={cn(
                'w-9 h-9 flex items-center justify-center mx-auto mt-0.5 rounded-full text-sm font-semibold',
                isToday ? 'bg-blue-600 text-white' : 'text-gray-800'
              )}>
                {day.getDate()}
              </div>
              {allDay.length > 0 && (
                <div className="mt-1 px-1 space-y-0.5">
                  {allDay.slice(0, 2).map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={cn('text-xs text-white rounded px-1 py-0.5 truncate cursor-pointer', evColor(ev).bar)}
                    >
                      {ev.summary}
                    </div>
                  ))}
                  {allDay.length > 2 && <div className="text-xs text-gray-400">{allDay.length - 2} more</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="grid grid-cols-8 relative">
          {/* Time labels */}
          <div className="border-r border-gray-100">
            {HOURS.map(h => (
              <div key={h} style={{ height: `${HOUR_H}px` }} className="relative">
                <span className="absolute -top-2 right-2 text-xs text-gray-400 select-none">
                  {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayEvs = timedEventsForDay(day)
            const isToday = sameDay(day, today)
            return (
              <div key={day.toISOString()} className="border-l border-gray-100 relative">
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ height: `${HOUR_H}px` }}
                    className="border-b border-gray-50 hover:bg-blue-50/20 cursor-pointer transition-colors"
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}
                {isToday && isCurrentWeek && (
                  <div
                    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 -ml-1.5 shrink-0" />
                    <div className="flex-1 h-px bg-blue-500" />
                  </div>
                )}
                {dayEvs.map(ev => {
                  const s = evStart(ev)
                  const e = new Date(ev.end.dateTime ?? '')
                  const startMin = s.getHours() * 60 + s.getMinutes()
                  const endMin = Math.min(e.getHours() * 60 + e.getMinutes() || 24 * 60, 24 * 60)
                  const durationMin = Math.max(endMin - startMin, 30)
                  const topPx = startMin * HOUR_H / 60
                  const heightPx = durationMin * HOUR_H / 60
                  const color = evColor(ev)
                  return (
                    <div
                      key={ev.id}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      className={cn('absolute left-0.5 right-0.5 rounded text-white text-xs p-1 cursor-pointer overflow-hidden z-10', color.bar)}
                      onClick={evt => { evt.stopPropagation(); onEventClick(ev) }}
                    >
                      <div className="font-semibold leading-tight truncate">{ev.summary}</div>
                      {heightPx > 30 && ev.start.dateTime && (
                        <div className="opacity-80 text-[11px] mt-0.5">{fmtTime(ev.start.dateTime)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Schedule view ─────────────────────────────────────────────────────────────

function ScheduleView({ events, today, onEventClick }: {
  events: CalendarEvent[]
  today: Date
  onEventClick: (ev: CalendarEvent) => void
}) {
  const grouped: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const day = (ev.start.dateTime ?? ev.start.date ?? '').slice(0, 10)
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(ev)
  }
  const days = Object.keys(grouped).sort()

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Video className="w-12 h-12 text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">No upcoming meetings in the next 60 days.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {days.map(day => {
        const d = new Date(day + 'T00:00:00')
        const isToday = sameDay(d, today)
        const isTomorrow = sameDay(d, addDays(today, 1))
        const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
          : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

        return (
          <div key={day}>
            <div className="flex items-center gap-3 mb-2">
              <p className={cn('text-xs font-semibold uppercase tracking-widest', isToday ? 'text-blue-600' : 'text-gray-400')}>
                {label}
              </p>
              {isToday && <div className="flex-1 h-px bg-blue-200" />}
            </div>
            <div className="space-y-2">
              {grouped[day].map(ev => {
                const color = evColor(ev)
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 hover:border-gray-300 cursor-pointer transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className={cn('w-1 rounded-full self-stretch shrink-0', color.solid)} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{ev.summary}</p>
                        {ev.start.dateTime && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{fmtTime(ev.start.dateTime)} – {fmtTime(ev.end.dateTime ?? '')}
                          </p>
                        )}
                        {!ev.start.dateTime && <p className="text-xs text-gray-400 mt-0.5">All day</p>}
                        {ev.attendees && ev.attendees.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3" />{ev.attendees.length} attendee{ev.attendees.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {ev.hangoutLink && (
                      <a
                        href={ev.hangoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        <Video className="w-3 h-3" />Join
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Event detail modal ────────────────────────────────────────────────────────

function EventModal({ event: ev, onClose, onDelete }: {
  event: CalendarEvent
  onClose: () => void
  onDelete: () => void
}) {
  const color = evColor(ev)
  const startDt = ev.start.dateTime
  const endDt = ev.end.dateTime

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={cn('px-5 py-4', color.solid)}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-white leading-snug">{ev.summary}</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {startDt ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                {new Date(startDt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{fmtTime(startDt)} – {fmtTime(endDt ?? '')}
              </span>
            </div>
          ) : ev.start.date ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>
                {new Date(ev.start.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                {' · '}All day
              </span>
            </div>
          ) : null}

          {ev.attendees && ev.attendees.length > 0 && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {ev.attendees.map(a => (
                  <span
                    key={a.email}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      a.responseStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                      a.responseStatus === 'declined' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    )}
                  >
                    {a.email.split('@')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ev.description && (
            <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">{ev.description}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Cancel meeting">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {ev.htmlLink && (
              <a
                href={ev.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />Open in Calendar
              </a>
            )}
            {ev.hangoutLink && (
              <a
                href={ev.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Video className="w-3 h-3" />Join Meet
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
