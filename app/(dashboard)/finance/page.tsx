import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanceClient } from './client'

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
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
    { data: invoices },
    { data: purchaseInvoices },
    { data: currencyRates },
    { data: annualExpenses },
    { data: salaries },
    { data: operatingCosts },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, project:events(id, name), line_items:invoice_line_items(rate, qty)')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('purchase_invoices')
      .select('*, project:events(id, name)')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('currency_rates').select('*'),
    supabase.from('annual_expenses').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('salaries').select('*').order('employee'),
    supabase.from('operating_costs').select('*').order('expense_item'),
  ])

  const validTab = ['overview', 'sales', 'purchase', 'annual', 'running', 'vat'].includes(tab ?? '')
    ? (tab as 'overview' | 'sales' | 'purchase' | 'annual' | 'running' | 'vat')
    : 'overview'

  return (
    <FinanceClient
      invoices={invoices ?? []}
      purchaseInvoices={(purchaseInvoices ?? []) as any}
      currencyRates={currencyRates ?? []}
      annualExpenses={(annualExpenses ?? []) as any}
      salaries={(salaries ?? []) as any}
      operatingCosts={(operatingCosts ?? []) as any}
      initialTab={validTab as any}
    />
  )
}
