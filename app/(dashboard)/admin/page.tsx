import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './client'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('project_categories')
    .select('*')
    .order('name')

  return <AdminClient categories={categories ?? []} />
}
