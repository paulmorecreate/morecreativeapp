import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const body = await req.json()
    const text = body?.message?.text?.trim()

    // Ignore empty messages and bot commands
    if (!text || text.startsWith('/')) return NextResponse.json({ ok: true })

    const supabase = await createClient()
    await supabase.from('todos').insert({ title: text })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
