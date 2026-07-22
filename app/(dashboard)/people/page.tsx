import { createClient } from '@/lib/supabase/server'
import { PeopleClient } from './client'

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: people } = await supabase
    .from('people')
    .select('*')
    .order('name')

  return <PeopleClient people={people ?? []} />
}
