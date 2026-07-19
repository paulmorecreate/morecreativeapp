import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TalentDetailClient } from './client'

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: talent }, { data: opportunities }, { data: eventDetails }, { data: conversations }, { data: agentLinks }, { data: talentContacts }, { data: talentCategories }] = await Promise.all([
    supabase.from('talents').select('*').eq('id', id).single(),
    supabase.from('opportunities')
      .select('*, brand:brands(name), event:events(name)')
      .eq('talent_id', id)
      .order('created_at', { ascending: false }),
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
    supabase.from('talent_contacts')
      .select('*')
      .eq('talent_id', id)
      .order('created_at'),
    supabase.from('talent_categories').select('*').order('name'),
  ])

  if (!talent) notFound()

  return (
    <TalentDetailClient
      talent={talent}
      opportunities={(opportunities ?? []) as any}
      eventDetails={(eventDetails ?? []) as any}
      conversations={conversations ?? []}
      agentLinks={(agentLinks ?? []) as any}
      talentContacts={talentContacts ?? []}
      talentCategories={talentCategories ?? []}
    />
  )
}
