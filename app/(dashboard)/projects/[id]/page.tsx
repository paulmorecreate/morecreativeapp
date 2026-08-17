import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectDetailClient } from './client'

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams])
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const canViewFinance = profile?.role === 'admin' || profile?.role === 'finance'

  const [
    { data: project },
    { data: talents },
    { data: brands },
    { data: categories },
    { data: brandShows },
    { data: stylists },
    { data: projectTalents },
    { data: invoices },
    { data: purchaseInvoices },
    { data: income },
    { data: expenses },
    { data: expenseCategories },
    { data: currencyRates },
    { data: talentCategories },
    { data: talentLevels },
    { data: agents },
    { data: agentTypes },
    { data: people },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talents').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('project_brands')
      .select('*, brand:brands(id, name), project_brand_talents(*, talent:talents(id, name, category, ig_link), stylist:stylists(id, name), project_brand_talent_notes(id, content, created_at))')
      .eq('project_id', id)
      .order('show_date', { ascending: true }),
    supabase.from('stylists').select('id, name').order('name'),
    supabase.from('project_talents')
      .select('*, talent:talents(id, name, category), project_talent_notes(id, content, created_at)')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    canViewFinance
      ? supabase.from('invoices').select('*, line_items:invoice_line_items(rate, qty)').eq('project_id', id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    canViewFinance
      ? supabase.from('purchase_invoices').select('*').eq('project_id', id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    canViewFinance
      ? supabase.from('project_income').select('*').eq('project_id', id).order('created_at')
      : Promise.resolve({ data: [] }),
    canViewFinance
      ? supabase.from('project_expenses').select('*').eq('project_id', id).order('created_at')
      : Promise.resolve({ data: [] }),
    supabase.from('expense_categories').select('*').order('name'),
    supabase.from('currency_rates').select('*').order('currency'),
    supabase.from('talent_categories').select('id, name').order('name'),
    supabase.from('talent_levels').select('id, name').order('name'),
    supabase.from('agents').select('id, name, agent_type').order('name'),
    supabase.from('agent_types').select('id, name').order('name'),
    supabase.from('people').select('id, name, type').order('name'),
  ])

  if (!project) notFound()

  return (
    <ProjectDetailClient
      project={project}
      talents={talents ?? []}
      brands={brands ?? []}
      categories={categories ?? []}
      brandShows={(brandShows ?? []) as any}
      stylists={stylists ?? []}
      projectTalents={(projectTalents ?? []) as any}
      invoices={(invoices ?? []) as any}
      purchaseInvoices={(purchaseInvoices ?? []) as any}
      income={(income ?? []) as any}
      expenses={(expenses ?? []) as any}
      expenseCategories={expenseCategories ?? []}
      currencyRates={currencyRates ?? []}
      canViewFinance={canViewFinance}
      initialTab={tabParam === 'finance' ? 'finance' : 'overview'}
      talentCategories={talentCategories ?? []}
      talentLevels={talentLevels ?? []}
      agents={agents ?? []}
      agentTypes={agentTypes ?? []}
      people={people ?? []}
    />
  )
}
