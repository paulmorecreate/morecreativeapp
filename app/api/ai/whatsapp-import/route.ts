import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatText } = await req.json()
  if (!chatText?.trim()) return NextResponse.json({ error: 'Chat text required' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are analysing a WhatsApp group chat export from a fashion PR agency called MoreCreative. Extract structured information and respond with ONLY valid JSON — no markdown, no code fences, no extra text.

Required JSON shape:
{
  "summary": "A clear 2–3 paragraph summary covering: context/purpose of the conversation, what was discussed and negotiated, final outcome. Write in past tense, third person.",
  "followUp": "A single sentence describing what is still outstanding. Empty string if nothing is pending.",
  "status": "open or closed — open if outstanding actions exist, closed if fully resolved",
  "dateRange": "e.g. 14 Aug – 29 Sep 2026",
  "contacts": [{ "name": "...", "role": "...", "email": "...", "phone": "" }],
  "todos": [{ "title": "..." }],
  "participants": ["name1", "name2"]
}

Rules:
- contacts = people from the EXTERNAL party only (not MoreCreative staff). Include email if it appears in the chat.
- todos = specific outstanding actions that still need to happen. Keep titles short and actionable (e.g. "Send Venice event photos to Miniaar").
- If nothing is outstanding, todos = [] and status = "closed".

WhatsApp chat export:
${chatText}`,
    }],
  })

  const text = (message.content[0] as any).text.trim()
  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return NextResponse.json(JSON.parse(jsonMatch[0]))
      } catch {}
    }
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
