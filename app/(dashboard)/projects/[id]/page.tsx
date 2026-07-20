import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './client'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: project },
    { data: talents },
    { data: brands },
    { data: categories },
    { data: brandShows },
    { data: stylists },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('project_brands')
      .select('*, brand:brands(id, name), project_brand_talents(*, talent:talents(id, name, category), stylist:stylists(id, name))')
      .eq('project_id', id)
      .order('show_date', { ascending: true }),
    supabase.from('stylists').select('id, name').order('name'),
  ])

  if (!project) notFound()

  return (
    <ProjectDetailClient
      project={project}
      talents={talents ?? []}
      brands={brands ?? []}
      categories={categories ?? []}
      brandShows={(brandShows ?? []) as any}
      stylists={stylists ?? []}
    />
  )
}
