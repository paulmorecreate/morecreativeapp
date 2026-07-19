import { createClient } from '@/lib/supabase/server'
import { ProjectsClient } from './client'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const [{ data: projects }, { data: categories }] = await Promise.all([
    supabase.from('events').select('*').order('start_date', { ascending: true }),
    supabase.from('project_categories').select('*').order('name'),
  ])

  return <ProjectsClient projects={projects ?? []} categories={categories ?? []} />
}
