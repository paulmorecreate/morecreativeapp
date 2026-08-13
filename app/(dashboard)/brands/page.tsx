import { createClient } from '@/lib/supabase/server'
import { BrandsClient } from './client'

export default async function BrandsPage() {
  const supabase = await createClient()
  const [{ data: brands }, { data: industries }, { data: brandCategories }, { data: allProjects }, { data: userProfiles }] = await Promise.all([
    supabase.from('brands').select('*, contacts(id, name, is_primary)').order('name'),
    supabase.from('industries').select('*').order('name'),
    supabase.from('brand_categories').select('*').order('name'),
    supabase.from('events').select('id, name').neq('status', 'completed').order('name'),
    supabase.from('user_profiles').select('id, email, color, first_name, surname').order('email'),
  ])

  return <BrandsClient brands={(brands ?? []) as any} industries={industries ?? []} brandCategories={brandCategories ?? []} allProjects={allProjects ?? []} userProfiles={userProfiles ?? []} />
}
