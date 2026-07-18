import { createClient } from '@/lib/supabase/server'
import { ConversationsClient } from './client'

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })

  const all = conversations ?? []

  const talentIds = [...new Set(all.filter(c => c.entity_type === 'talent').map(c => c.entity_id))]
  const brandIds = [...new Set(all.filter(c => c.entity_type === 'brand').map(c => c.entity_id))]
  const oppIds = [...new Set(all.filter(c => c.entity_type === 'opportunity').map(c => c.entity_id))]

  const [{ data: talents }, { data: brands }, { data: opps }] = await Promise.all([
    talentIds.length
      ? supabase.from('talents').select('id, name').in('id', talentIds)
      : { data: [] },
    brandIds.length
      ? supabase.from('brands').select('id, name').in('id', brandIds)
      : { data: [] },
    oppIds.length
      ? supabase.from('opportunities').select('id, talent:talents(name), brand:brands(name)').in('id', oppIds)
      : { data: [] },
  ])

  const entityNames: Record<string, string> = {}
  talents?.forEach((t: { id: string; name: string }) => { entityNames[t.id] = t.name })
  brands?.forEach((b: { id: string; name: string }) => { entityNames[b.id] = b.name })
  opps?.forEach((o: any) => {
    const t = (o.talent as { name: string } | null)?.name
    const b = (o.brand as { name: string } | null)?.name
    entityNames[o.id] = [t, b].filter(Boolean).join(' × ') || 'Unnamed Opportunity'
  })

  return <ConversationsClient conversations={all} entityNames={entityNames} />
}
