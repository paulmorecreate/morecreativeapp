import { createClient } from '@/lib/supabase/server'
import { TalentsClient } from './client'

export default async function TalentsPage() {
  const supabase = await createClient()
  const [{ data: talents }, { data: talentCategories }] = await Promise.all([
    supabase.from('talents')
      .select('*, talent_contacts(id, name, is_primary), talent_agents(id, agent:agents(id, name))')
      .order('name'),
    supabase.from('talent_categories').select('*').order('name'),
  ])

  return <TalentsClient talents={(talents ?? []) as any} talentCategories={talentCategories ?? []} />
}
