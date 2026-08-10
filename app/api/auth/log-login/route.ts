import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function parseUA(ua: string): { browser: string; os: string } {
  const browser =
    ua.includes('Edg/') ? 'Edge' :
    ua.includes('Chrome/') ? 'Chrome' :
    ua.includes('Firefox/') ? 'Firefox' :
    ua.includes('Safari/') && ua.includes('Version/') ? 'Safari' :
    'Other'

  const os =
    ua.includes('iPhone') ? 'iPhone' :
    ua.includes('iPad') ? 'iPad' :
    ua.includes('Android') ? 'Android' :
    ua.includes('Macintosh') ? 'macOS' :
    ua.includes('Windows') ? 'Windows' :
    ua.includes('Linux') ? 'Linux' :
    'Other'

  return { browser, os }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    null

  const ua = request.headers.get('user-agent') ?? ''
  const { browser, os } = parseUA(ua)

  const admin = createAdminClient()
  await admin.from('login_audit').insert({
    user_id: user.id,
    email: user.email,
    ip_address: ip,
    user_agent: ua || null,
    browser,
    os,
  })

  return NextResponse.json({ ok: true })
}
