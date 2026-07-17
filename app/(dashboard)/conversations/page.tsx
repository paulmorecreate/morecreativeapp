import { createClient } from '@/lib/supabase/server'
import { ConversationsClient } from './client'

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })

  return <ConversationsClient conversations={conversations ?? []} />
}
