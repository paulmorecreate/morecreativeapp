import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanceClient } from './client'

export default async function FinancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'finance')) {
    redirect('/dashboard')
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, project:events(id, name), line_items:invoice_line_items(rate, qty)')
    .order('created_at', { ascending: false })

  return <FinanceClient invoices={invoices ?? []} />
}
