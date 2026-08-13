import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const admin = createAdminClient()
  const { data: latest } = await admin
    .from('login_audit')
    .select('id')
    .eq('user_id', user.id)
    .order('logged_in_at', { ascending: false })
    .limit(1)
    .single()

  if (latest) {
    await admin
      .from('login_audit')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', latest.id)
  }

  return NextResponse.json({ ok: true })
}
