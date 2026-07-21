import { createClient } from '@/lib/supabase/server'
import { TalentsClient } from './client'

export default async function TalentsPage() {
  const supabase = await createClient()
  const [{ data: talents }, { data: talentCategories }, { data: allAgents }, { data: agentTypes }] = await Promise.all([
    supabase.from('talents')
      .select('*, talent_contacts(id, name, is_primary), talent_agents(id, agent:agents(id, name))')
      .order('name'),
    supabase.from('talent_categories').select('*').order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
    supabase.from('agent_types').select('id, name').order('name'),
  ])

  return <TalentsClient talents={(talents ?? []) as any} talentCategories={talentCategories ?? []} allAgents={(allAgents ?? []) as any} agentTypes={agentTypes ?? []} />
}
