import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OpportunityDetailClient } from './client'

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: opp },
    { data: oppTalents },
    { data: contacts },
    { data: blockers },
    { data: talents },
  ] = await Promise.all([
    supabase.from('opportunities').select('*').eq('id', id).single(),
    supabase
      .from('opportunity_talents')
      .select('*, talent:talents(id, name, ig_link, ig_followers)')
      .eq('opportunity_id', id)
      .order('created_at'),
    supabase
      .from('opportunity_contacts')
      .select('*')
      .eq('opportunity_id', id)
      .order('created_at'),
    supabase
      .from('opportunity_blockers')
      .select('*')
      .eq('opportunity_id', id)
      .order('created_at'),
    supabase.from('talents').select('id, name').order('name'),
  ])

  if (!opp) notFound()

  return (
    <OpportunityDetailClient
      opp={opp}
      oppTalents={oppTalents ?? []}
      contacts={contacts ?? []}
      blockers={blockers ?? []}
      talents={talents ?? []}
    />
  )
}
