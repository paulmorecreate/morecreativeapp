import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MeetingsClient } from './client'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profiles }, { data: authData }, { data: token }] = await Promise.all([
    supabase.from('user_profiles').select('id, email, first_name, surname, color').order('first_name'),
    adminSupabase.auth.admin.listUsers(),
    adminSupabase.from('google_calendar_tokens').select('connected_email').eq('id', '00000000-0000-0000-0000-000000000001').single(),
  ])

  const now = new Date()
  const lockedIds = new Set(
    (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > now)
      .map(u => u.id)
  )

  const activeProfiles = (profiles ?? []).filter(p => !lockedIds.has(p.id))

  return (
    <MeetingsClient
      currentUserEmail={user?.email ?? ''}
      teamMembers={activeProfiles}
      connectedEmail={token?.connected_email ?? null}
    />
  )
}
