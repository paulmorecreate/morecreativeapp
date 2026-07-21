import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AgencyDetailClient } from './client'

export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: agency }, { data: agents }, { data: allAgents }] = await Promise.all([
    supabase.from('agencies').select('*').eq('id', id).single(),
    supabase.from('agents').select('id, name, agent_type, country').eq('agency_id', id).order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
  ])

  if (!agency) notFound()

  return <AgencyDetailClient agency={agency} agents={agents ?? []} allAgents={allAgents ?? []} />
}
