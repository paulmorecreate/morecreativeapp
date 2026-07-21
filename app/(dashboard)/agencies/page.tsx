import { createClient } from '@/lib/supabase/server'
import { AgenciesClient } from './client'

export default async function AgenciesPage() {
  const supabase = await createClient()
  const { data: agencies } = await supabase
    .from('agencies')
    .select('*, agents(id)')
    .order('name')

  return <AgenciesClient agencies={(agencies ?? []) as any} />
}
