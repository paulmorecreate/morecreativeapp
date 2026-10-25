import { createClient } from '@/lib/supabase/server'
import { OpportunitiesClient } from './client'

export default async function OpportunitiesPage() {
  const supabase = await createClient()

  const [{ data: opportunities }, { data: talents }, { data: mcRoles }, { data: categories }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('*, opportunity_talents(id, status, talent:talents(id, name)), converted_project:events(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('mc_roles').select('*').order('name'),
    supabase.from('project_categories').select('*').order('name'),
  ])

  return (
    <OpportunitiesClient
      opportunities={opportunities ?? []}
      talents={talents ?? []}
      mcRoles={mcRoles ?? []}
      categories={categories ?? []}
    />
  )
}
