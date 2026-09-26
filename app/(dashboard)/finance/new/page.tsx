import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceDetailClient } from '../[id]/client'

export default async function NewInvoicePage() {
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

  const [{ data: settings }, { data: projects }] = await Promise.all([
    supabase.from('invoice_settings').select('*').limit(1).single(),
    supabase.from('events').select('id, name').order('name'),
  ])

  const emptyInvoice = {
    id: '',
    invoice_number: '',
    project_id: null,
    currency: 'AED' as const,
    apply_vat: false,
    status: 'draft' as const,
    issue_date: null,
    due_date: null,
    billed_to_name: null,
    billed_to_company: null,
    billed_to_address: null,
    amount_paid: 0,
    notes: null,
    created_at: '',
    updated_at: '',
    project: null,
  }

  return (
    <InvoiceDetailClient
      invoice={emptyInvoice as any}
      lineItems={[]}
      settings={settings!}
      projects={projects ?? []}
      isNew={true}
    />
  )
}
