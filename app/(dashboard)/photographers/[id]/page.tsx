import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PhotographerDetailClient } from './client'

export default async function PhotographerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: photographer }, { data: contacts }] = await Promise.all([
    supabase.from('photographers').select('*').eq('id', id).single(),
    supabase.from('photographer_contacts').select('*').eq('photographer_id', id).order('created_at'),
  ])

  if (!photographer) notFound()

  return <PhotographerDetailClient photographer={photographer} contacts={contacts ?? []} />
}
