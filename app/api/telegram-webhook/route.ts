import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const body = await req.json()
    const message = body?.message
    const text = message?.text?.trim()
    const chatId = message?.chat?.id

    // Reply to /id command with the chat ID so it can be added to the allowlist
    if (text === '/id' && chatId) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `Your chat ID is: ${chatId}` }),
      })
      return NextResponse.json({ ok: true })
    }

    // Ignore empty messages and other bot commands
    if (!text || text.startsWith('/')) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()
    await supabase.from('todos').insert({ title: text })

    // Send confirmation reply
    if (chatId) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `✓ Added to your To Do list: "${text}"` }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
