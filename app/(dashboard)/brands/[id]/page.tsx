import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BrandDetailClient } from './client'

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: brand }, { data: opportunities }, { data: conversations }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', id).single(),
    supabase.from('opportunities')
      .select('*, talent:talents(name), event:events(name)')
      .eq('brand_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'brand')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!brand) notFound()

  return (
    <BrandDetailClient
      brand={brand}
      opportunities={(opportunities ?? []) as any}
      conversations={conversations ?? []}
    />
  )
}
