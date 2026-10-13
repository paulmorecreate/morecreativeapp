import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { message, page, userName, type } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const typeLabel: Record<string, string> = {
    suggestion: 'Suggestion',
    bug: 'Bug / Something broken',
    general: 'General',
  }

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'paul@themorecreative.com',
    subject: `App Feedback — ${typeLabel[type] ?? type}`,
    html: `
      <p><strong>From:</strong> ${userName ?? 'Unknown user'}</p>
      <p><strong>Page:</strong> ${page ?? 'Unknown'}</p>
      <p><strong>Type:</strong> ${typeLabel[type] ?? type}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
      <p>${String(message).replace(/\n/g, '<br>')}</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
