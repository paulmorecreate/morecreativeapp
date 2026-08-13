import { createClient } from '@/lib/supabase/server'
import { AgenciesClient } from './client'

export default async function AgenciesPage() {
  const supabase = await createClient()
  const [{ data: agencies }, { data: agents }, { data: userProfiles }] = await Promise.all([
    supabase.from('agencies').select('*, agents(id)').order('name'),
    supabase.from('agents').select('*, agency:agencies(id, name)').order('name'),
    supabase.from('user_profiles').select('id, email, color, first_name, surname').order('email'),
  ])

  return <AgenciesClient agencies={(agencies ?? []) as any} agents={(agents ?? []) as any} userProfiles={userProfiles ?? []} />
}
