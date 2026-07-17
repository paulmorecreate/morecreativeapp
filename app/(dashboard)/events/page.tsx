import { createClient } from '@/lib/supabase/server'
import { EventsClient } from './client'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })

  return <EventsClient events={events ?? []} />
}
