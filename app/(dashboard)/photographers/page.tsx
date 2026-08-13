import { createClient } from '@/lib/supabase/server'
import { PhotographersClient } from './client'

export default async function PhotographersPage() {
  const supabase = await createClient()
  const [{ data: photographers }, { data: userProfiles }] = await Promise.all([
    supabase.from('photographers').select('*, photographer_contacts(id, name, is_primary)').order('name'),
    supabase.from('user_profiles').select('id, email, color, first_name, surname').order('email'),
  ])

  return <PhotographersClient photographers={(photographers ?? []) as any} userProfiles={userProfiles ?? []} />
}
