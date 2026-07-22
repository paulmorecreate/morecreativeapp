import { createClient } from '@/lib/supabase/server'
import { TalentsClient } from './client'

export default async function TalentsPage() {
  const supabase = await createClient()
  const [{ data: talents }, { data: talentCategories }, { data: allAgents }, { data: agentTypes }, { data: talentLevels }, { data: allStylists }, { data: allPeople }, { data: allProjects }] = await Promise.all([
    supabase.from('talents')
      .select('*, talent_agents(id, agent:agents(id, name))')
      .order('name'),
    supabase.from('talent_categories').select('*').order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
    supabase.from('agent_types').select('id, name').order('name'),
    supabase.from('talent_levels').select('*').order('name'),
    supabase.from('stylists').select('id, name').order('name'),
    supabase.from('people').select('id, name, type').order('name'),
    supabase.from('events').select('id, name, project_brands(id, brand:brands(id, name))').neq('status', 'completed').order('name'),
  ])

  return <TalentsClient talents={(talents ?? []) as any} talentCategories={talentCategories ?? []} allAgents={(allAgents ?? []) as any} agentTypes={agentTypes ?? []} talentLevels={talentLevels ?? []} allStylists={(allStylists ?? []) as any} allPeople={(allPeople ?? []) as any} allProjects={(allProjects ?? []) as any} />
}
