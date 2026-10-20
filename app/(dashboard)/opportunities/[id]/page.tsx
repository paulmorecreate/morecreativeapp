import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OpportunityDetailClient } from './client'

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: opp },
    { data: oppTalents },
    { data: conversations },
    { data: talents },
    { data: mcRoles },
    { data: stages },
    { data: categories },
    { data: documents },
  ] = await Promise.all([
    supabase.from('opportunities').select('*, converted_project:events(id, name)').eq('id', id).single(),
    supabase
      .from('opportunity_talents')
      .select('*, talent:talents(id, name, ig_link, ig_followers)')
      .eq('opportunity_id', id)
      .order('created_at'),
    supabase
      .from('conversations')
      .select('*')
      .eq('entity_type', 'opportunity')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('mc_roles').select('*').order('name'),
    supabase.from('opportunity_stages').select('*').order('name'),
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('opportunity_documents').select('*').eq('opportunity_id', id).order('created_at'),
  ])

  if (!opp) notFound()

  const oppData = opp as typeof opp & { converted_project?: { id: string; name: string } | null }

  return (
    <OpportunityDetailClient
      opp={oppData}
      oppTalents={oppTalents ?? []}
      conversations={conversations ?? []}
      talents={talents ?? []}
      mcRoles={mcRoles ?? []}
      stages={stages ?? []}
      categories={categories ?? []}
      convertedProject={oppData.converted_project ?? null}
      documents={documents ?? []}
    />
  )
}
