import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './client'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const canViewFinance = profile?.role === 'admin' || profile?.role === 'finance'

  const [
    { data: project },
    { data: talents },
    { data: brands },
    { data: categories },
    { data: brandShows },
    { data: stylists },
    { data: projectTalents },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('project_brands')
      .select('*, brand:brands(id, name), project_brand_talents(*, talent:talents(id, name, category), stylist:stylists(id, name), project_brand_talent_notes(id, content, created_at))')
      .eq('project_id', id)
      .order('show_date', { ascending: true }),
    supabase.from('stylists').select('id, name').order('name'),
    supabase.from('project_talents')
      .select('*, talent:talents(id, name, category), project_talent_notes(id, content, created_at)')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    canViewFinance
      ? supabase.from('invoices').select('*').eq('project_id', id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
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
      projectTalents={(projectTalents ?? []) as any}
      invoices={(invoices ?? []) as any}
      canViewFinance={canViewFinance}
    />
  )
}
