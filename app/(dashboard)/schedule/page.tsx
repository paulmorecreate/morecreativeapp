import { createClient } from '@/lib/supabase/server'
import { ScheduleClient } from './client'

export default async function SchedulePage() {
  const supabase = await createClient()

  const [{ data: events }, { data: categories }] = await Promise.all([
    supabase.from('schedule_events').select('*').order('month').order('category').order('title'),
    supabase.from('project_categories').select('*').order('name'),
  ])

  return (
    <ScheduleClient
      events={events ?? []}
      categories={categories ?? []}
    />
  )
}
