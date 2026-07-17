import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TalentDetailClient } from './client'

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: talent }, { data: opportunities }, { data: eventDetails }, { data: conversations }] = await Promise.all([
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
  ])

  if (!talent) notFound()

  return (
    <TalentDetailClient
      talent={talent}
      opportunities={(opportunities ?? []) as any}
      eventDetails={(eventDetails ?? []) as any}
      conversations={conversations ?? []}
    />
  )
}
