import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './client'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: talentDetails }, { data: opportunities }, { data: talents }, { data: brands }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talent_event_details')
      .select('id, talent_id, carpet_date, hotel, ticket, driver, airport_transfer, makeup, hair, dress, jewelry, shoes, content, agent_contact, extra_notes, talent:talents(id,name,category,status)')
      .eq('event_id', id)
      .order('created_at'),
    supabase.from('opportunities')
      .select('*, talent:talents(name), brand:brands(name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
  ])

  if (!project) notFound()

  return (
    <ProjectDetailClient
      project={project}
      talentDetails={(talentDetails ?? []) as any}
      opportunities={(opportunities ?? []) as any}
      talents={talents ?? []}
      brands={brands ?? []}
    />
  )
}
