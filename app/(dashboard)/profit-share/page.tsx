import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ProfitShareOverviewClient } from './client'

function rateToAed(currency: string, rates: { currency: string; rate_to_aed: number }[]): number {
  if (currency === 'AED') return 1
  return rates.find(r => r.currency === currency)?.rate_to_aed ?? 1
}

function invoiceTotal(inv: { apply_vat: boolean; line_items: { rate: number; qty: number }[] }): number {
  const sub = inv.line_items.reduce((s, l) => s + l.rate * l.qty, 0)
  return sub + (inv.apply_vat ? sub * 0.05 : 0)
}

const START_MONTH = '2026-10'

export type ProjectAllocation = {
  projectId: string
  projectName: string
  earned: number
  paid: boolean
}

export type UserMonthRow = {
  userId: string
  userName: string
  userColor: string | null
  allocations: ProjectAllocation[]
  totalEarned: number
  totalPaid: number
}

export type MonthData = {
  monthKey: string
  label: string
  users: UserMonthRow[]
  totalEarned: number
  totalPaid: number
}

export default async function ProfitSharePage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  const canView = ['admin', 'super_user'].includes(role)
  if (!canView) redirect('/dashboard')
  const canSeeFinance = true

  const [
    { data: profitShares },
    { data: allEmployees },
    { data: allUserProfiles },
    { data: authData },
    { data: salaries },
    { data: currencyRates },
  ] = await Promise.all([
    supabase
      .from('project_profit_share')
      .select('*, project:events(id, name, start_date)')
      .order('created_at', { ascending: false }),
    supabase
      .from('project_profit_share_employees')
      .select('id, project_id, paid, user_profile_id'),
    supabase
      .from('user_profiles')
      .select('id, first_name, surname, email, color')
      .order('first_name'),
    adminSupabase.auth.admin.listUsers(),
    canSeeFinance
      ? supabase.from('salaries').select('user_profile_id, monthly_salary_aed').not('user_profile_id', 'is', null)
      : Promise.resolve({ data: [] }),
    supabase.from('currency_rates').select('*'),
  ])

  // Filter locked users
  const now = new Date()
  const lockedIds = new Set(
    (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > now)
      .map(u => u.id)
  )
  const activeUsers = (allUserProfiles ?? []).filter(u => !lockedIds.has(u.id))

  const projectIds = (profitShares ?? []).map(ps => ps.project_id)

  const [
    { data: allIncome },
    { data: allExpenses },
    { data: allInvoices },
    { data: allPurchaseInvoices },
  ] = await Promise.all([
    projectIds.length > 0
      ? supabase.from('project_income').select('project_id, amount, currency').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('project_expenses').select('project_id, amount, currency').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('invoices').select('project_id, currency, apply_vat, line_items:invoice_line_items(rate, qty)').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('purchase_invoices').select('project_id, gross_amount, fx_rate').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  const rates = currencyRates ?? []

  // Gross profit per project
  const gpByProject = new Map<string, number>()
  for (const pid of projectIds) {
    const inc =
      (allIncome ?? []).filter(i => i.project_id === pid).reduce((s, i) => s + i.amount * rateToAed(i.currency, rates), 0) +
      (allInvoices ?? []).filter(i => i.project_id === pid).reduce((s, inv) => s + invoiceTotal(inv as any) * rateToAed(inv.currency, rates), 0)
    const exp =
      (allExpenses ?? []).filter(e => e.project_id === pid).reduce((s, e) => s + e.amount * rateToAed(e.currency, rates), 0) +
      (allPurchaseInvoices ?? []).filter(p => p.project_id === pid).reduce((s, p) => s + p.gross_amount * p.fx_rate, 0)
    gpByProject.set(pid, inc - exp)
  }

  // Month buckets: monthKey → userId → ProjectAllocation[]
  const monthBuckets = new Map<string, Map<string, ProjectAllocation[]>>()

  for (const ps of (profitShares ?? [])) {
    const gp = gpByProject.get(ps.project_id) ?? 0
    const mcPct = ps.mc_percentage ?? 100
    const empPct = 100 - mcPct
    const empTotal = gp > 0 ? (empPct / 100) * gp : 0
    const employees = (allEmployees ?? []).filter(e => e.project_id === ps.project_id)
    const perEmployee = employees.length > 0 ? empTotal / employees.length : 0

    const dateStr: string = (ps.project as any)?.start_date ?? ps.created_at
    const monthKey = dateStr?.substring(0, 7) ?? null
    if (!monthKey || monthKey < START_MONTH) continue

    if (!monthBuckets.has(monthKey)) monthBuckets.set(monthKey, new Map())
    const bucket = monthBuckets.get(monthKey)!

    const projectName = (ps.project as any)?.name ?? 'Unknown Project'

    for (const emp of employees) {
      if (!bucket.has(emp.user_profile_id)) bucket.set(emp.user_profile_id, [])
      bucket.get(emp.user_profile_id)!.push({
        projectId: ps.project_id,
        projectName,
        earned: perEmployee,
        paid: emp.paid,
      })
    }
  }

  // Salary lookup
  const salaryByUser: Record<string, number> = {}
  for (const s of (salaries ?? [])) {
    if (s.user_profile_id) salaryByUser[s.user_profile_id] = s.monthly_salary_aed
  }

  // Build sorted months
  const months: MonthData[] = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, bucket]) => {
      const [y, m] = monthKey.split('-').map(Number)
      const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      const users: UserMonthRow[] = activeUsers.map(u => {
        const allocations = bucket.get(u.id) ?? []
        const totalEarned = allocations.reduce((s, a) => s + a.earned, 0)
        const totalPaid = allocations.filter(a => a.paid).reduce((s, a) => s + a.earned, 0)
        return {
          userId: u.id,
          userName: [u.first_name, u.surname].filter(Boolean).join(' ') || u.email,
          userColor: u.color ?? null,
          allocations,
          totalEarned,
          totalPaid,
        }
      })

      const totalEarned = users.reduce((s, u) => s + u.totalEarned, 0)
      const totalPaid = users.reduce((s, u) => s + u.totalPaid, 0)

      return { monthKey, label, users, totalEarned, totalPaid }
    })

  return (
    <ProfitShareOverviewClient
      months={months}
      salaryByUser={canSeeFinance ? salaryByUser : {}}
      canSeeFinance={canSeeFinance}
    />
  )
}
