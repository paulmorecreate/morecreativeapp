import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BankingClient } from './client'

export default async function BankingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
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

  const [
    { data: transactions },
    { data: openingBalances },
    { data: fxRates },
    { data: rules },
  ] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('sort_order', { ascending: false }),
    supabase
      .from('bank_opening_balances')
      .select('*')
      .order('sort_order'),
    supabase
      .from('monthly_fx_rates')
      .select('*')
      .order('year')
      .order('month'),
    supabase
      .from('bank_categorisation_rules')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  const validTabs = ['upload', 'aed', 'eur', 'expenses', 'income', 'shareholder', 'trial-balance']
  const initialTab = validTabs.includes(tab ?? '') ? tab! : 'upload'

  return (
    <BankingClient
      transactions={transactions ?? []}
      openingBalances={openingBalances ?? []}
      fxRates={fxRates ?? []}
      rules={rules ?? []}
      initialTab={initialTab as any}
    />
  )
}
