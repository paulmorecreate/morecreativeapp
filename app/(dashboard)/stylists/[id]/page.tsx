import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StylistDetailClient } from './client'

export default async function StylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: stylist }, { data: contacts }] = await Promise.all([
    supabase.from('stylists').select('*').eq('id', id).single(),
    supabase.from('stylist_contacts').select('*').eq('stylist_id', id).order('created_at'),
  ])

  if (!stylist) notFound()

  return <StylistDetailClient stylist={stylist} contacts={contacts ?? []} />
}
