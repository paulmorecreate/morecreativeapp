import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AgentDetailClient } from './client'

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: agent }, { data: contacts }, { data: talentLinks }, { data: agentTypes }, { data: allTalents }, { data: agencies }] = await Promise.all([
    supabase.from('agents').select('*').eq('id', id).single(),
    supabase.from('agent_contacts').select('*').eq('agent_id', id).order('created_at'),
    supabase.from('talent_agents')
      .select('id, talent_id, talent:talents(id, name, category, status)')
      .eq('agent_id', id)
      .order('created_at'),
    supabase.from('agent_types').select('*').order('name'),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('agencies').select('id, name').order('name'),
  ])

  if (!agent) notFound()

  return (
    <AgentDetailClient
      agent={agent}
      contacts={contacts ?? []}
      talentLinks={(talentLinks ?? []) as any}
      agentTypes={agentTypes ?? []}
      allTalents={allTalents ?? []}
      agencies={agencies ?? []}
    />
  )
}
