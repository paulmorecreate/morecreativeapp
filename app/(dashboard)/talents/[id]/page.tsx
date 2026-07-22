import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TalentDetailClient } from './client'

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: talent }, { data: talentProjects }, { data: eventDetails }, { data: conversations }, { data: agentLinks }, { data: talentCategories }, { data: allAgents }, { data: agentTypes }, { data: allAgencies }, { data: talentLevels }, { data: stylistLinks }, { data: personLinks }, { data: allStylists }, { data: allPeople }] = await Promise.all([
    supabase.from('talents').select('*').eq('id', id).single(),
    supabase.from('project_brand_talents')
      .select('id, project_brand:project_brands(id, show_date, project:events(id, name, start_date, location, status, category), brand:brands(id, name))')
      .eq('talent_id', id),
    supabase.from('talent_event_details')
      .select('*, event:events(name)')
      .eq('talent_id', id),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'talent')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('talent_agents')
      .select('id, agent_id, agent:agents(id, name, agent_type)')
      .eq('talent_id', id),
    supabase.from('talent_categories').select('*').order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
    supabase.from('agent_types').select('id, name').order('name'),
    supabase.from('agencies').select('id, name').order('name'),
    supabase.from('talent_levels').select('*').order('name'),
    supabase.from('talent_stylists').select('id, stylist_id, stylist:stylists(id, name)').eq('talent_id', id),
    supabase.from('talent_people').select('id, person_id, person:people(id, name, type)').eq('talent_id', id),
    supabase.from('stylists').select('id, name').order('name'),
    supabase.from('people').select('id, name, type').order('name'),
  ])

  if (!talent) notFound()

  return (
    <TalentDetailClient
      talent={talent}
      talentProjects={(talentProjects ?? []) as any}
      eventDetails={(eventDetails ?? []) as any}
      conversations={conversations ?? []}
      agentLinks={(agentLinks ?? []) as any}
      talentCategories={talentCategories ?? []}
      allAgents={(allAgents ?? []) as any}
      agentTypes={agentTypes ?? []}
      allAgencies={allAgencies ?? []}
      talentLevels={talentLevels ?? []}
      stylistLinks={(stylistLinks ?? []) as any}
      personLinks={(personLinks ?? []) as any}
      allStylists={(allStylists ?? []) as any}
      allPeople={(allPeople ?? []) as any}
    />
  )
}
