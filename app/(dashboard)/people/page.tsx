import { createClient } from '@/lib/supabase/server'
import { PeopleClient } from './client'

export default async function PeoplePage() {
  const supabase = await createClient()
  const [{ data: people }, { data: userProfiles }] = await Promise.all([
    supabase.from('people').select('*').order('name'),
    supabase.from('user_profiles').select('id, email, color, first_name, surname').order('email'),
  ])

  return <PeopleClient people={people ?? []} userProfiles={userProfiles ?? []} />
}
