import { createClient } from '@/lib/supabase/server'
import { ContractsClient } from './client'

export default async function ContractsPage() {
  const supabase = await createClient()

  const [{ data: contracts }, { data: brands }, { data: talents }] = await Promise.all([
    supabase.from('contracts').select('*').order('created_at', { ascending: false }),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('talents').select('id, name').order('name'),
  ])

  return (
    <ContractsClient
      contracts={contracts ?? []}
      brands={brands ?? []}
      talents={talents ?? []}
    />
  )
}
