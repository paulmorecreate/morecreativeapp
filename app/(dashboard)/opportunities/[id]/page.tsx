import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OpportunityDetailClient } from './client'

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: opp }, { data: conversations }, { data: talents }, { data: brands }, { data: events }] = await Promise.all([
    supabase.from('opportunities')
      .select('*, talent:talents(*), brand:brands(id,name,link), event:events(id,name)')
      .eq('id', id)
      .single(),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'opportunity')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('events').select('id, name').order('name'),
  ])

  if (!opp) notFound()

  return (
    <OpportunityDetailClient
      opp={opp as any}
      conversations={conversations ?? []}
      talents={talents ?? []}
      brands={brands ?? []}
      events={events ?? []}
    />
  )
}
