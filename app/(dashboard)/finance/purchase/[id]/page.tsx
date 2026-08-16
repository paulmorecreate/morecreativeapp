import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PurchaseInvoiceDetailClient } from './client'

export default async function PurchaseInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    { data: projects },
  ] = await Promise.all([
    supabase.from('purchase_invoices').select('*, project:events(id, name)').eq('id', id).single(),
    supabase.from('events').select('id, name').order('name'),
  ])

  if (!invoice) notFound()

  return (
    <PurchaseInvoiceDetailClient
      invoice={invoice as any}
      projects={projects ?? []}
    />
  )
}
