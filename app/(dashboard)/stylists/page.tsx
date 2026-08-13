import { createClient } from '@/lib/supabase/server'
import { StylistsClient } from './client'

export default async function StylistsPage() {
  const supabase = await createClient()
  const [{ data: stylists }, { data: userProfiles }] = await Promise.all([
    supabase.from('stylists').select('*').order('name'),
    supabase.from('user_profiles').select('id, email, color, first_name, surname').order('email'),
  ])

  return <StylistsClient stylists={(stylists ?? []) as any} userProfiles={userProfiles ?? []} />
}
