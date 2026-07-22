import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StylistDetailClient } from './client'

export default async function StylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: stylist }, { data: talentLinks }, { data: allTalents }] = await Promise.all([
    supabase.from('stylists').select('*').eq('id', id).single(),
    supabase.from('talent_stylists').select('id, talent_id, talent:talents(id, name)').eq('stylist_id', id),
    supabase.from('talents').select('id, name').order('name'),
  ])

  if (!stylist) notFound()

  return <StylistDetailClient stylist={stylist} talentLinks={(talentLinks ?? []) as any} allTalents={allTalents ?? []} />
}
