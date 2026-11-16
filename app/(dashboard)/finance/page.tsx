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

  if (!profile || (profile.role !== 'admin' && profile.role !== 'finance' && profile.role !== 'super_user')) {
    redirect('/dashboard')
  }

  const [
    { data: invoices },
    { data: purchaseInvoices },
    { data: currencyRates },
    { data: annualExpenses },
    { data: salaries },
    { data: operatingCosts },
    { data: allUsers },
    { data: projectIncome },
    { data: projectExpenses },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, project:events(id, name, status), line_items:invoice_line_items(rate, qty)')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('purchase_invoices')
      .select('*, project:events(id, name, status)')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('currency_rates').select('*'),
    supabase.from('annual_expenses').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('salaries').select('*, user_profile:user_profiles(id, first_name, surname, email, color)').order('employee'),
    supabase.from('operating_costs').select('*').order('expense_item'),
    supabase.from('user_profiles').select('id, first_name, surname, email, color').order('first_name'),
    supabase.from('project_income').select('*, project:events(id, name, status)').order('date', { ascending: true, nullsFirst: false }),
    supabase.from('project_expenses').select('*, project:events(id, name, status)').order('date', { ascending: true, nullsFirst: false }),
  ])

  const validTab = ['overview', 'sales', 'purchase', 'running', 'vat', 'forecast'].includes(tab ?? '')
    ? (tab as 'overview' | 'sales' | 'purchase' | 'running' | 'vat' | 'forecast')
    : 'overview'

  return (
    <FinanceClient
      invoices={invoices ?? []}
      purchaseInvoices={(purchaseInvoices ?? []) as any}
      currencyRates={currencyRates ?? []}
      annualExpenses={(annualExpenses ?? []) as any}
      salaries={(salaries ?? []) as any}
      operatingCosts={(operatingCosts ?? []) as any}
      allUsers={allUsers ?? []}
      projectIncome={(projectIncome ?? []) as any}
      projectExpenses={(projectExpenses ?? []) as any}
      initialTab={validTab as any}
    />
  )
}
