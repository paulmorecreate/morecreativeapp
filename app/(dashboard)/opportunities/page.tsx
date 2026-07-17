import { createClient } from '@/lib/supabase/server'
import { OpportunitiesClient } from './client'

export default async function OpportunitiesPage() {
  const supabase = await createClient()

  const [{ data: opportunities }, { data: talents }, { data: brands }, { data: events }] = await Promise.all([
    supabase.from('opportunities')
      .select('*, talent:talents(id,name), brand:brands(id,name), event:events(id,name)')
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('events').select('id, name').order('name'),
  ])

  return (
    <OpportunitiesClient
      opportunities={opportunities ?? []}
      talents={talents ?? []}
      brands={brands ?? []}
      events={events ?? []}
    />
  )
}
