import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './client'

export default async function AdminPage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: industries }, { data: agentTypes }, { data: talentCategories }] = await Promise.all([
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('industries').select('*').order('name'),
    supabase.from('agent_types').select('*').order('name'),
    supabase.from('talent_categories').select('*').order('name'),
  ])

  return <AdminClient categories={categories ?? []} industries={industries ?? []} agentTypes={agentTypes ?? []} talentCategories={talentCategories ?? []} />
}
