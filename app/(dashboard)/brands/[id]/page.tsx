import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BrandDetailClient } from './client'

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: brand }, { data: brandProjects }, { data: conversations }, { data: contacts }, { data: industries }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', id).single(),
    supabase.from('project_brands')
      .select('id, show_date, show_time, project:events(id, name, start_date, location, status, category)')
      .eq('brand_id', id)
      .order('show_date', { ascending: true }),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'brand')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('contacts')
      .select('*')
      .eq('brand_id', id)
      .order('created_at'),
    supabase.from('industries').select('*').order('name'),
  ])

  if (!brand) notFound()

  return (
    <BrandDetailClient
      brand={brand}
      brandProjects={(brandProjects ?? []) as any}
      conversations={conversations ?? []}
      contacts={contacts ?? []}
      industries={industries ?? []}
    />
  )
}
