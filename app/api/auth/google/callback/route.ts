import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/meetings?error=no_code`)

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Get the connected email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2.userinfo.get()

  const supabase = createAdminClient()
  await supabase.from('google_calendar_tokens').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    connected_email: userInfo.email ?? '',
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? '',
    expiry_date: tokens.expiry_date ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/meetings?connected=true`)
}
