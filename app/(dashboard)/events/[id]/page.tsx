import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventDetailClient } from './client'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: talentDetails }, { data: opportunities }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talent_event_details')
      .select('*, talent:talents(id,name,category,status)')
      .eq('event_id', id)
      .order('created_at'),
    supabase.from('opportunities')
      .select('*, talent:talents(name), brand:brands(name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  return (
    <EventDetailClient
      event={event}
      talentDetails={(talentDetails ?? []) as any}
      opportunities={(opportunities ?? []) as any}
    />
  )
}
