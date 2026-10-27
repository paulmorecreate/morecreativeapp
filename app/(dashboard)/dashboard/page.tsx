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

type ProjectTalentRow = {
  id: string
  created_at: string
  talent: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

type BrandTalentRow = {
  id: string
  created_at: string
  talent: { id: string; name: string } | null
  project_brand: {
    id: string
    brand: { id: string; name: string } | null
    project: { id: string; name: string } | null
  } | null
}

type UnifiedActivity = {
  key: string
  chip: string
  chipColor: string
  title: string
  subtitle: string
  context: string | null  // project/brand name — rendered prominently after the subtitle
  href: string | null
  at: string
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

function buildActivityFeed(
  auditRows: ActivityRow[],
  projectTalentRows: ProjectTalentRow[],
  brandTalentRows: BrandTalentRow[],
): UnifiedActivity[] {
  const items: UnifiedActivity[] = []

  // For each talent that has a project/brand assignment, record its timestamp.
  // If the audit_activity entry for that talent falls within 5 min of the assignment,
  // suppress the bare audit entry — the richer assignment entry covers it.
  const talentAssignmentAt = new Map<string, number>()
  for (const row of projectTalentRows) {
    if (!row.talent?.id) continue
    const t = new Date(row.created_at).getTime()
    const existing = talentAssignmentAt.get(row.talent.id)
    if (!existing || t > existing) talentAssignmentAt.set(row.talent.id, t)
  }
  for (const row of brandTalentRows) {
    if (!row.talent?.id) continue
    const t = new Date(row.created_at).getTime()
    const existing = talentAssignmentAt.get(row.talent.id)
    if (!existing || t > existing) talentAssignmentAt.set(row.talent.id, t)
  }

  for (const row of auditRows) {
    const wasUpdated =
      row.updated_by &&
      row.updated_at &&
      new Date(row.updated_at).getTime() > new Date(row.created_at).getTime() + 5000
    const at = wasUpdated ? row.updated_at! : row.created_at
    const verb = wasUpdated ? 'Updated' : 'Added'
    const by = wasUpdated ? row.updated_by : row.created_by
    const byLabel = by ? ` by ${by.split('@')[0]}` : ''

    // Suppress talent-created entries that are already covered by a project assignment row
    if (row.entity_type === 'talent' && !wasUpdated) {
      const assignedAt = talentAssignmentAt.get(row.id)
      if (assignedAt && Math.abs(new Date(at).getTime() - assignedAt) < 5 * 60 * 1000) continue
    }

    items.push({
      key: `audit-${row.entity_type}-${row.id}`,
      chip: row.entity_type,
      chipColor: ENTITY_COLOR[row.entity_type] ?? 'bg-gray-100 text-gray-600',
      title: row.record_name ?? '—',
      subtitle: `${verb}${byLabel}`,
      context: null,
      href: ENTITY_HREF[row.entity_type]?.(row.id) ?? null,
      at,
    })
  }

  for (const row of projectTalentRows) {
    if (!row.talent?.name) continue
    const projectName = row.project?.name ?? null
    const projectId = row.project?.id
    items.push({
      key: `pt-${row.id}`,
      chip: 'pool',
      chipColor: 'bg-emerald-100 text-emerald-700',
      title: row.talent.name,
      subtitle: 'Added to Talent Pool',
      context: projectName,
      href: projectId ? `/projects/${projectId}` : `/talents/${row.talent.id}`,
      at: row.created_at,
    })
  }

  for (const row of brandTalentRows) {
    if (!row.talent?.name) continue
    const brandName = row.project_brand?.brand?.name ?? null
    const projectName = row.project_brand?.project?.name ?? null
    const projectId = row.project_brand?.project?.id
    items.push({
      key: `pbt-${row.id}`,
      chip: 'show',
      chipColor: 'bg-violet-100 text-violet-700',
      title: row.talent.name,
      subtitle: brandName ? `Added to ${brandName}` : 'Added to show',
      context: projectName,
      href: projectId ? `/projects/${projectId}` : `/talents/${row.talent.id}`,
      at: row.created_at,
    })
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10)
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
    { data: auditActivity },
    { data: projectTalents },
    { data: brandTalents },
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
      .limit(30),
    supabase.from('project_talents')
      .select('id, created_at, talent:talents(id, name), project:events(id, name)')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('project_brand_talents')
      .select('id, created_at, talent:talents(id, name), project_brand:project_brands(id, brand:brands(id, name), project:events(id, name))')
      .order('created_at', { ascending: false })
      .limit(15),
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

  const activityFeed = buildActivityFeed(
    (auditActivity ?? []) as ActivityRow[],
    (projectTalents ?? []) as unknown as ProjectTalentRow[],
    (brandTalents ?? []) as unknown as BrandTalentRow[],
  )

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
            {activityFeed.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No activity yet.</p>
            ) : (
              activityFeed.map(item => {
                const inner = (
                  <div className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5', item.chipColor)}>
                        {item.chip}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {item.subtitle}
                          {item.context && (
                            <><span className="mx-1 text-gray-300">·</span><span className="font-medium text-gray-600">{item.context}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(item.at)}</span>
                  </div>
                )
                return item.href ? (
                  <Link key={item.key} href={item.href}>{inner}</Link>
                ) : (
                  <div key={item.key}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
