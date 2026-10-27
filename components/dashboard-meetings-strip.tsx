'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Video, Loader2, WifiOff } from 'lucide-react'

type CalendarEvent = {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  hangoutLink?: string
  recurringEventId?: string
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function evStart(ev: CalendarEvent): Date {
  return new Date(ev.start.dateTime ?? ev.start.date ?? '')
}

export function DashboardMeetingsStrip({ connectedEmail }: { connectedEmail: string | null }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!connectedEmail) { setLoading(false); return }
    const now = new Date()
    const todayStart = startOfDay(now)
    const end = addDays(now, 180)
    fetch(`/api/meetings?start=${todayStart.toISOString()}&end=${end.toISOString()}`)
      .then(r => r.json())
      .then(data => {
        const sorted = (data.events ?? [] as CalendarEvent[])
          .filter((ev: CalendarEvent) => evStart(ev) >= todayStart)
          .sort((a: CalendarEvent, b: CalendarEvent) => evStart(a).getTime() - evStart(b).getTime())
        const seen = new Set<string>()
        const deduped = sorted.filter((ev: CalendarEvent) => {
          if (!ev.recurringEventId) return true
          if (seen.has(ev.recurringEventId)) return false
          seen.add(ev.recurringEventId)
          return true
        })
        setEvents(deduped.slice(0, 5))
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [connectedEmail])

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h2>
        <Link href="/meetings" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
      </div>
      <div className="divide-y divide-gray-50">
        {!connectedEmail ? (
          <div className="px-5 py-4 flex items-center gap-2 text-xs text-amber-600">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Google Calendar not connected. <Link href="/meetings" className="underline hover:text-amber-800">Connect →</Link></span>
          </div>
        ) : loading ? (
          <div className="px-5 py-4 flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No upcoming meetings.</p>
        ) : (
          events.map(ev => {
            const start = evStart(ev)
            const isToday = start.toDateString() === new Date().toDateString()
            const isTomorrow = start.toDateString() === addDays(new Date(), 1).toDateString()
            const dateStr = isToday ? 'Today'
              : isTomorrow ? 'Tomorrow'
              : start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
            const timeStr = ev.start.dateTime ? fmtTime(ev.start.dateTime) : 'All day'
            return (
              <div key={ev.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 shrink-0 w-20">{dateStr}</span>
                  <span className="text-xs font-medium text-gray-500 shrink-0 w-10">{timeStr}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{ev.summary}</span>
                </div>
                {ev.hangoutLink && (
                  <a
                    href={ev.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    <Video className="w-3.5 h-3.5" /> Join
                  </a>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
