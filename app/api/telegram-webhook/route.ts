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

    // Ignore empty messages and bot commands
    if (!text || text.startsWith('/')) return NextResponse.json({ ok: true })

    // Only allow messages from whitelisted chat IDs
    const allowed = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '').split(',').map(s => s.trim())
    if (!allowed.includes(String(chatId))) return NextResponse.json({ ok: true })

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
