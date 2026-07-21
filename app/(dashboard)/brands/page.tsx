import { createClient } from '@/lib/supabase/server'
import { BrandsClient } from './client'

export default async function BrandsPage() {
  const supabase = await createClient()
  const [{ data: brands }, { data: industries }, { data: brandCategories }] = await Promise.all([
    supabase.from('brands').select('*, contacts(id, name, is_primary)').order('name'),
    supabase.from('industries').select('*').order('name'),
    supabase.from('brand_categories').select('*').order('name'),
  ])

  return <BrandsClient brands={(brands ?? []) as any} industries={industries ?? []} brandCategories={brandCategories ?? []} />
}
