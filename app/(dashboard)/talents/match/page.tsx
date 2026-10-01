import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TalentMatchClient } from './client'

export default async function TalentMatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_user') redirect('/talents')
  return <TalentMatchClient />
}
