import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './client'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = currentProfile?.role === 'admin'
  const canViewFinance = currentProfile?.role === 'admin' || currentProfile?.role === 'finance'

  const [
    { data: categories },
    { data: industries },
    { data: agentTypes },
    { data: talentCategories },
    { data: brandCategories },
    { data: talentLevels },
    { data: invoiceSettings },
    { data: expenseCategories },
    { data: currencyRates },
    { data: loginAudit },
    { data: recordAudit },
  ] = await Promise.all([
    supabase.from('project_categories').select('*').order('name'),
    supabase.from('industries').select('*').order('name'),
    supabase.from('agent_types').select('*').order('name'),
    supabase.from('talent_categories').select('*').order('name'),
    supabase.from('brand_categories').select('*').order('name'),
    supabase.from('talent_levels').select('*').order('name'),
    supabase.from('invoice_settings').select('*').limit(1).single(),
    supabase.from('expense_categories').select('*').order('name'),
    supabase.from('currency_rates').select('*').order('currency'),
    isAdmin
      ? supabase.from('login_audit').select('*').order('logged_in_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from('audit_activity').select('*').order('updated_at', { ascending: false }).limit(300)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <AdminClient
      categories={categories ?? []}
      industries={industries ?? []}
      agentTypes={agentTypes ?? []}
      talentCategories={talentCategories ?? []}
      brandCategories={brandCategories ?? []}
      talentLevels={talentLevels ?? []}
      invoiceSettings={invoiceSettings ?? null}
      expenseCategories={expenseCategories ?? []}
      currencyRates={currencyRates ?? []}
      isAdmin={isAdmin}
      canViewFinance={canViewFinance}
      loginAudit={loginAudit ?? []}
      recordAudit={recordAudit ?? []}
    />
  )
}
