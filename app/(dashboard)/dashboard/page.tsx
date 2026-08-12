import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, Briefcase, Calendar, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TodoWidget } from '@/components/todo-widget'
import { PendingAcceptances } from '@/components/pending-acceptances'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: talentCount },
    { count: brandCount },
    { count: projectCount },
    { data: upcomingProjects },
    { data: pendingRaw },
    { data: todos },
    { data: userProfiles },
  ] = await Promise.all([
    supabase.from('talents').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
    supabase.from('events')
      .select('*')
      .neq('status', 'completed')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date')
      .limit(6),
    supabase.from('project_brand_talents')
      .select('id, status, talent:talents(id, name), project_brand:project_brands(id, show_date, brand:brands(id, name), project:events(id, name, status))')
      .eq('status', 'In Conversation')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('todos')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('user_profiles').select('*'),
  ])

  // Filter out entries from completed projects
  const pending = (pendingRaw ?? []).filter((p: any) => p.project_brand?.project?.status !== 'completed')

  const stats = [
    { label: 'Talents', value: talentCount ?? 0, icon: Users, href: '/talents', color: 'text-purple-600' },
    { label: 'Brands', value: brandCount ?? 0, icon: Briefcase, href: '/brands', color: 'text-blue-600' },
    { label: 'Active Projects', value: projectCount ?? 0, icon: Calendar, href: '/projects', color: 'text-teal-600' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back.</p>
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
      <TodoWidget todos={todos ?? []} userProfiles={userProfiles ?? []} />

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Acceptances */}
        <PendingAcceptances initial={pending as any} />

        {/* Upcoming Projects */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Projects</h2>
            <Link href="/projects" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
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

    </div>
  )
}
