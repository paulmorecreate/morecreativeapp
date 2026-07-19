import { createClient } from '@/lib/supabase/server'
import { AgentsClient } from './client'

export default async function AgentsPage() {
  const supabase = await createClient()
  const [{ data: agents }, { data: agentTypes }] = await Promise.all([
    supabase.from('agents')
      .select('*, agent_contacts(id, name, is_primary)')
      .order('name'),
    supabase.from('agent_types').select('*').order('name'),
  ])

  return <AgentsClient agents={(agents ?? []) as any} agentTypes={agentTypes ?? []} />
}
