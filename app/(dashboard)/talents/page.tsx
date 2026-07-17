import { createClient } from '@/lib/supabase/server'
import { TalentsClient } from './client'

export default async function TalentsPage() {
  const supabase = await createClient()
  const { data: talents } = await supabase
    .from('talents')
    .select('*')
    .order('name')

  return <TalentsClient talents={talents ?? []} />
}
