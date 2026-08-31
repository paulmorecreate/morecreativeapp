import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'finance')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('currency_rates')
    .select('currency')
    .neq('currency', 'AED')

  if (!existing?.length) {
    return NextResponse.json({ message: 'No currencies to update' })
  }

  const toCurrencies = existing.map(r => r.currency).join(',')

  const res = await fetch(`https://api.frankfurter.app/latest?from=AED&to=${toCurrencies}`, {
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch from frankfurter.app' }, { status: 502 })
  }

  const { rates, date } = await res.json() as { rates: Record<string, number>; date: string }

  const now = new Date().toISOString()
  // rates: { EUR: 0.2482 } means 1 AED = 0.2482 EUR → rate_to_aed = 1 / 0.2482
  const updates = Object.entries(rates).map(([currency, aedRate]) => ({
    currency,
    rate_to_aed: Math.round((1 / aedRate) * 10000) / 10000,
    updated_at: now,
  }))

  await Promise.all(
    updates.map(u =>
      admin.from('currency_rates')
        .update({ rate_to_aed: u.rate_to_aed, updated_at: u.updated_at })
        .eq('currency', u.currency)
    )
  )

  return NextResponse.json({ success: true, date, rates: updates })
}
