import { createClient } from '@/lib/supabase/server'
import { AgenciesClient } from './client'

export default async function AgenciesPage() {
  const supabase = await createClient()
  const [{ data: agencies }, { data: agentTypes }] = await Promise.all([
    supabase.from('agencies').select('*, agents(id)').order('name'),
    supabase.from('agent_types').select('*').order('name'),
  ])

  return <AgenciesClient agencies={(agencies ?? []) as any} agentTypes={agentTypes ?? []} />
}
