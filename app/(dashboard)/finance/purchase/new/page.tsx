import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PurchaseInvoiceDetailClient } from '../[id]/client'

export default async function NewPurchaseInvoicePage() {
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

  const [{ data: projects }, { data: currencyRates }] = await Promise.all([
    supabase.from('events').select('id, name').order('name'),
    supabase.from('currency_rates').select('*'),
  ])

  const emptyInvoice = {
    id: '',
    invoice_number: '',
    supplier: '',
    project_id: null,
    currency: 'AED' as const,
    net_amount: 0,
    vat_rate: 0,
    vat_amount: 0,
    gross_amount: 0,
    fx_rate: 1,
    issue_date: null,
    due_date: null,
    status: 'pending' as const,
    amount_paid: 0,
    notes: null,
    created_at: '',
    updated_at: '',
    project: null,
  }

  return (
    <PurchaseInvoiceDetailClient
      invoice={emptyInvoice as any}
      projects={projects ?? []}
      currencyRates={currencyRates ?? []}
      isNew={true}
    />
  )
}
