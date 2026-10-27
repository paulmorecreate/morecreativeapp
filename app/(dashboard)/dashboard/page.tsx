import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Users, Briefcase, Calendar, ExternalLink } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { TodoWidget } from '@/components/todo-widget'
import { DashboardMeetingsStrip } from '@/components/dashboard-meetings-strip'

type ActivityRow = {
  entity_type: string
  id: string
  record_name: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string | null
}

const ENTITY_HREF: Record<string, (id: string) => string> = {
  talent: id => `/talents/${id}`,
  brand: id => `/brands/${id}`,
  agency: id => `/agencies/${id}`,
  agent: id => `/agents/${id}`,
  stylist: id => `/stylists/${id}`,
  photographer: id => `/photographers/${id}`,
  person: id => `/people/${id}`,
  project: id => `/projects/${id}`,
  opportunity: id => `/opportunities/${id}`,
}

function activityAction(row: ActivityRow): { verb: string; by: string; at: string } {
  const wasUpdated = row.updated_by &&
    row.updated_at &&
    new Date(row.updated_at).getTime() > new Date(row.created_at).getTime() + 5000

  if (wasUpdated) {
    return {
      verb: 'Updated',
      by: row.updated_by!.split('@')[0],
      at: row.updated_at!,
    }
  }
  return {
    verb: 'Added',
    by: (row.created_by ?? 'unknown').split('@')[0],
    at: row.created_at,
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const ENTITY_COLOR: Record<string, string> = {
  talent: 'bg-purple-100 text-purple-700',
  brand: 'bg-blue-100 text-blue-700',
  project: 'bg-teal-100 text-teal-700',
  opportunity: 'bg-amber-100 text-amber-700',
  agency: 'bg-indigo-100 text-indigo-700',
  agent: 'bg-indigo-100 text-indigo-700',
  stylist: 'bg-pink-100 text-pink-700',
  photographer: 'bg-orange-100 text-orange-700',
  person: 'bg-gray-100 text-gray-600',
  'schedule event': 'bg-green-100 text-green-700',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [
    { data: { user } },
    { count: talentCount },
    { count: brandCount },
    { count: projectCount },
    { data: upcomingProjects },
    { data: todos },
    { data: userProfiles },
    { data: authData },
    { data: recentActivity },
    { data: calendarToken },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('talents').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
    supabase.from('events')
      .select('*')
      .neq('status', 'completed')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date')
      .limit(6),
    supabase.from('todos')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('user_profiles').select('*'),
    adminSupabase.auth.admin.listUsers(),
    supabase.from('audit_activity')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(10),
    adminSupabase.from('google_calendar_tokens')
      .select('connected_email')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single(),
  ])

  const now = new Date()
  const lockedIds = new Set(
    (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > now)
      .map(u => u.id)
  )
  const activeProfiles = (userProfiles ?? []).filter((p: any) => !lockedIds.has(p.id))

  const currentProfile = activeProfiles.find((p: any) => p.id === user?.id)
  const firstName = currentProfile?.first_name ?? null

  const stats = [
    { label: 'Talents', value: talentCount ?? 0, icon: Users, href: '/talents', color: 'text-purple-600' },
    { label: 'Brands', value: brandCount ?? 0, icon: Briefcase, href: '/brands', color: 'text-blue-600' },
    { label: 'Active Projects', value: projectCount ?? 0, icon: Calendar, href: '/projects', color: 'text-teal-600' },
  ]

  const connectedEmail = calendarToken?.connected_email ?? null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back{firstName ? `, ${firstName}` : ''}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* To Do */}
      <TodoWidget todos={todos ?? []} userProfiles={activeProfiles} />

      {/* Meetings + Projects (left) / Recent Activity (right) */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left column: Meetings stacked on Upcoming Projects */}
        <div className="flex flex-col gap-6 h-full">
          <DashboardMeetingsStrip connectedEmail={connectedEmail} />

          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Upcoming Projects</h2>
              <Link href="/projects" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
            </div>
            <div className="divide-y divide-gray-50 overflow-y-auto">
              {!upcomingProjects?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No upcoming projects.</p>
              )}
              {upcomingProjects?.map(event => (
                <Link key={event.id} href={`/projects/${event.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
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
        </div>

        {/* Right column: Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(!recentActivity || recentActivity.length === 0) ? (
              <p className="px-5 py-4 text-sm text-gray-400">No activity yet.</p>
            ) : (
              (recentActivity as ActivityRow[]).map(row => {
                const { verb, by, at } = activityAction(row)
                const href = ENTITY_HREF[row.entity_type]?.(row.id)
                const chip = ENTITY_COLOR[row.entity_type] ?? 'bg-gray-100 text-gray-600'
                const inner = (
                  <div className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5', chip)}>
                        {row.entity_type}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{row.record_name ?? '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{verb} by {by}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(at)}</span>
                  </div>
                )
                return href ? (
                  <Link key={`${row.entity_type}-${row.id}`} href={href}>{inner}</Link>
                ) : (
                  <div key={`${row.entity_type}-${row.id}`}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
