import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { InvoiceDetailClient } from './client'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    { data: invoice },
    { data: lineItems },
    { data: settings },
    { data: projects },
  ] = await Promise.all([
    supabase.from('invoices').select('*, project:events(id, name)').eq('id', id).single(),
    supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('invoice_settings').select('*').limit(1).single(),
    supabase.from('events').select('id, name').order('name'),
  ])

  if (!invoice) notFound()

  return (
    <InvoiceDetailClient
      invoice={invoice as any}
      lineItems={lineItems ?? []}
      settings={settings!}
      projects={projects ?? []}
    />
  )
}
