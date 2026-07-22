import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PersonDetailClient } from './client'

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: person }, { data: talentLinks }, { data: allTalents }] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase.from('talent_people').select('id, talent_id, talent:talents(id, name)').eq('person_id', id),
    supabase.from('talents').select('id, name').order('name'),
  ])

  if (!person) notFound()

  return <PersonDetailClient person={person} talentLinks={(talentLinks ?? []) as any} allTalents={allTalents ?? []} />
}
