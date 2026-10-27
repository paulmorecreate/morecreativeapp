import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function makeOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )
}

async function getAuthedClient() {
  const supabase = createAdminClient()
  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single()
  if (!token) return null

  const oauth2Client = makeOAuthClient()
  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  })

  // Persist refreshed tokens
  oauth2Client.on('tokens', async (tokens) => {
    await supabase.from('google_calendar_tokens').update({
      access_token: tokens.access_token ?? token.access_token,
      expiry_date: tokens.expiry_date ?? token.expiry_date,
      updated_at: new Date().toISOString(),
    }).eq('id', '00000000-0000-0000-0000-000000000001')
  })

  return oauth2Client
}

// GET — list events for a date range
export async function GET(req: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await getAuthedClient()
  if (!auth) return NextResponse.json({ events: [], connected: false })

  const timeMin = req.nextUrl.searchParams.get('start') ?? new Date().toISOString()
  const timeMax = req.nextUrl.searchParams.get('end') ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const calendar = google.calendar({ version: 'v3', auth })
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return NextResponse.json({ events: data.items ?? [], connected: true })
}

// POST — create a meeting
export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, start, end, attendees, timeZone } = await req.json()

  const auth = await getAuthedClient()
  if (!auth) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })

  const calendar = google.calendar({ version: 'v3', auth })
  const meet = google.meet({ version: 'v2', auth })

  // Create the Meet space first via Meet API so we own it and can set OPEN access.
  // Falls back to letting Calendar API create it (no Quick access) if scope not granted.
  let conferenceData: object = {
    createRequest: {
      requestId: `mc-meet-${Date.now()}`,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  }

  try {
    const { data: space } = await meet.spaces.create({
      requestBody: { config: { accessType: 'OPEN' } },
    })
    const meetingUri = space.meetingUri ?? ''
    const meetingCode = space.meetingCode ?? space.name?.split('/').pop() ?? ''
    if (meetingCode && meetingUri) {
      conferenceData = {
        conferenceId: meetingCode,
        conferenceSolution: {
          key: { type: 'hangoutsMeet' },
          name: 'Google Meet',
          iconUri: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png',
        },
        entryPoints: [{
          entryPointType: 'video',
          uri: meetingUri,
          label: meetingUri.replace('https://', ''),
        }],
      }
    }
  } catch (err: any) {
    console.error('[Meet API] spaces.create failed, falling back to Calendar-generated link:', err?.message)
  }

  const { data: event } = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: title,
      description: description ?? '',
      start: { dateTime: start, timeZone: timeZone ?? 'Asia/Dubai' },
      end: { dateTime: end, timeZone: timeZone ?? 'Asia/Dubai' },
      attendees: (attendees ?? []).map((email: string) => ({ email })),
      conferenceData,
    },
  })

  return NextResponse.json({ event })
}

// DELETE — cancel a meeting
export async function DELETE(req: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await req.json()
  const auth = await getAuthedClient()
  if (!auth) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' })

  return NextResponse.json({ ok: true })
}
