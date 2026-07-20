import { createClient } from '@/lib/supabase/server'
import { StylistsClient } from './client'

export default async function StylistsPage() {
  const supabase = await createClient()
  const { data: stylists } = await supabase
    .from('stylists')
    .select('*, stylist_contacts(id, name, is_primary)')
    .order('name')

  return <StylistsClient stylists={(stylists ?? []) as any} />
}
