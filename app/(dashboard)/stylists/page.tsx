import { createClient } from '@/lib/supabase/server'
import { StylistsClient } from './client'

export default async function StylistsPage() {
  const supabase = await createClient()
  const { data: stylists } = await supabase
    .from('stylists')
    .select('*')
    .order('name')

  return <StylistsClient stylists={(stylists ?? []) as any} />
}
