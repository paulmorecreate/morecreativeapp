import { createClient } from '@/lib/supabase/server'
import { PhotographersClient } from './client'

export default async function PhotographersPage() {
  const supabase = await createClient()
  const { data: photographers } = await supabase
    .from('photographers')
    .select('*, photographer_contacts(id, name, is_primary)')
    .order('name')

  return <PhotographersClient photographers={(photographers ?? []) as any} />
}
