import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MeetingsClient } from './client'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, email, first_name, surname, color')
    .order('first_name')

  const { data: token } = await adminSupabase
    .from('google_calendar_tokens')
    .select('connected_email')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()

  return (
    <MeetingsClient
      currentUserEmail={user?.email ?? ''}
      teamMembers={profiles ?? []}
      connectedEmail={token?.connected_email ?? null}
    />
  )
}
