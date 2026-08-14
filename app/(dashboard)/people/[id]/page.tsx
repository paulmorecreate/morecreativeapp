import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PersonDetailClient } from './client'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: person }, { data: talentLinks }, { data: allTalents },
    { data: talentCategories }, { data: talentLevels },
    { data: allAgents }, { data: agentTypes },
    { data: allStylists }, { data: allPeople },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase.from('talent_people').select('id, talent_id, talent:talents(id, name)').eq('person_id', id),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('talent_categories').select('id, name').order('name'),
    supabase.from('talent_levels').select('id, name').order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
    supabase.from('agent_types').select('id, name').order('name'),
    supabase.from('stylists').select('id, name').order('name'),
    supabase.from('people').select('id, name, type').order('name'),
  ])

  if (!person) notFound()

  return (
    <PersonDetailClient
      person={person}
      talentLinks={(talentLinks ?? []) as any}
      allTalents={allTalents ?? []}
      talentCategories={talentCategories ?? []}
      talentLevels={talentLevels ?? []}
      allAgents={(allAgents ?? []) as any}
      agentTypes={agentTypes ?? []}
      allStylists={(allStylists ?? []) as any}
      allPeople={(allPeople ?? []) as any}
    />
  )
}
