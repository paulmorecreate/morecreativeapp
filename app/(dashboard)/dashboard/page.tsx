import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Briefcase, Calendar, TrendingUp, MessageCircle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: talentCount },
    { count: brandCount },
    { count: eventCount },
    { count: oppCount },
    { data: recentOpps },
    { data: openConvos },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase.from('talents').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).neq('status', 'completed').neq('status', 'cancelled'),
    supabase.from('opportunities')
      .select('*, talent:talents(name), brand:brands(name), event:events(name)')
      .in('priority', ['high'])
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('conversations')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('events')
      .select('*')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date')
      .limit(4),
  ])

  const stats = [
    { label: 'Talents', value: talentCount ?? 0, icon: Users, href: '/talents', color: 'text-purple-600' },
    { label: 'Brands', value: brandCount ?? 0, icon: Briefcase, href: '/brands', color: 'text-blue-600' },
    { label: 'Events', value: eventCount ?? 0, icon: Calendar, href: '/events', color: 'text-teal-600' },
    { label: 'Open Opps', value: oppCount ?? 0, icon: TrendingUp, href: '/opportunities', color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* High Priority Opportunities */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">High Priority Opportunities</h2>
            <Link href="/opportunities" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentOpps?.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No high priority opportunities.</p>
            )}
            {recentOpps?.map(opp => (
              <Link key={opp.id} href={`/opportunities/${opp.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {(opp.talent as { name: string } | null)?.name ?? '—'} × {(opp.brand as { name: string } | null)?.name ?? '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{opp.type ?? 'No type'} · {(opp.event as { name: string } | null)?.name ?? 'No event'}</div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {opp.estimated_value && <span className="text-xs text-gray-500">{formatCurrency(opp.estimated_value)}</span>}
                  <Badge value={opp.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/events" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!upcomingEvents?.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No upcoming events.</p>
            )}
            {upcomingEvents?.map(event => (
              <Link key={event.id} href={`/events/${event.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{event.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{event.location ?? '—'}</div>
                </div>
                <div className="text-xs text-gray-500 shrink-0 ml-3">
                  {formatDate(event.start_date)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Open Conversations */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Open Follow-ups</h2>
            <Link href="/conversations" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!openConvos?.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No open conversations.</p>
            )}
            {openConvos?.map(convo => (
              <div key={convo.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400 capitalize">{convo.channel ?? 'note'} · {convo.entity_type}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{convo.content}</p>
                {convo.follow_up && (
                  <p className="text-xs text-amber-600 mt-1">↳ {convo.follow_up}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
