import { createClient } from '@/lib/supabase/server'
import { OpportunitiesClient } from './client'

export default async function OpportunitiesPage() {
  const supabase = await createClient()

  const [{ data: opportunities }, { data: talents }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('*, opportunity_talents(id, status, talent:talents(id, name))')
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
  ])

  return (
    <OpportunitiesClient
      opportunities={opportunities ?? []}
      talents={talents ?? []}
    />
  )
}
