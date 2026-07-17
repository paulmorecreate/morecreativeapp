import { createClient } from '@/lib/supabase/server'
import { BrandsClient } from './client'

export default async function BrandsPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name')

  return <BrandsClient brands={brands ?? []} />
}
