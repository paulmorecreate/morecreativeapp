import { createClient } from '@/lib/supabase/server'
import { ProjectsClient } from './client'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true })

  return <ProjectsClient projects={projects ?? []} />
}
