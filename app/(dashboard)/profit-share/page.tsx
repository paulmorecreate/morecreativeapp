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

export type CellAllocation = {
  empId: string
  projectId: string
  projectName: string
  earned: number
  paid: boolean
}

export type MonthCell = {
  allocations: CellAllocation[]
  totalEarned: number
  totalPaid: number
}

export type GridUser = {
  userId: string
  userName: string
  userColor: string | null
  salary: number | null
  months: Record<string, MonthCell>
  totalEarned: number
  totalPaid: number
}

export type PendingAllocation = {
  empId: string
  userId: string
  userName: string
  userColor: string | null
  projectId: string
  projectName: string
  earned: number
}

export type SalaryReturn = {
  id: string
  user_profile_id: string
  month_key: string
  amount: number
  note: string | null
}

export type SalaryPayment = {
  id: string
  user_profile_id: string
  month_key: string
  amount: number
  note: string | null
}

export type UpcomingProject = {
  projectId: string
  projectName: string
  members: { userId: string; userName: string; userColor: string | null }[]
}


export default async function ProfitSharePage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'super_user'].includes(role)) redirect('/dashboard')

  const [
    { data: profitShares },
    { data: allEmployees },
    { data: allUserProfiles },
    { data: authData },
    { data: salaries },
    { data: currencyRates },
    { data: salaryReturns },
    { data: upcomingProfitShares },
    { data: manualMonths },
    { data: salaryPayments },
  ] = await Promise.all([
    supabase.from('project_profit_share').select('*, project:events(id, name)').order('created_at', { ascending: false }),
    supabase.from('project_profit_share_employees').select('id, project_id, paid, user_profile_id, payout_month'),
    supabase.from('user_profiles').select('id, first_name, surname, email, color').order('first_name'),
    adminSupabase.auth.admin.listUsers(),
    supabase.from('salaries').select('user_profile_id, monthly_salary_aed').not('user_profile_id', 'is', null),
    supabase.from('currency_rates').select('*'),
    supabase.from('salary_returns').select('id, user_profile_id, month_key, amount, note'),
    supabase.from('project_profit_share').select('project_id, project:events(id, name)').eq('preview_only', true),
    supabase.from('team_earnings_months').select('month_key').order('month_key', { ascending: false }),
    supabase.from('monthly_salary_payments').select('id, user_profile_id, month_key, amount, note'),
  ])

  const now = new Date()
  const lockedIds = new Set(
    (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > now)
      .map(u => u.id)
  )
  const activeUsers = (allUserProfiles ?? []).filter(u => !lockedIds.has(u.id))

  const projectIds = [...new Set((profitShares ?? []).map(ps => ps.project_id))]

  const [
    { data: allIncome },
    { data: allInvoices },
    { data: allExpenses },
    { data: allPurchaseInvoices },
  ] = await Promise.all([
    projectIds.length > 0
      ? supabase.from('project_income').select('project_id, amount, currency, include_in_profit_share').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('invoices').select('project_id, currency, apply_vat, status, include_in_profit_share, line_items:invoice_line_items(rate, qty)').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('project_expenses').select('project_id, amount, currency').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('purchase_invoices').select('project_id, gross_amount, fx_rate, status').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  const rates = currencyRates ?? []

  // GP per project — respects include_in_profit_share
  const gpByProject = new Map<string, number>()
  for (const pid of projectIds) {
    const inc =
      (allIncome ?? [])
        .filter(i => i.project_id === pid && i.include_in_profit_share !== false)
        .reduce((s, i) => s + i.amount * rateToAed(i.currency, rates), 0) +
      (allInvoices ?? [])
        .filter(i => i.project_id === pid && i.status === 'received' && (i as any).include_in_profit_share !== false)
        .reduce((s, inv) => s + invoiceTotal(inv as any) * rateToAed(inv.currency, rates), 0)
    const exp =
      (allExpenses ?? []).filter(e => e.project_id === pid).reduce((s, e) => s + e.amount * rateToAed(e.currency, rates), 0) +
      (allPurchaseInvoices ?? []).filter(p => p.project_id === pid && (p.status === 'paid' || p.status === 'partial')).reduce((s, p) => s + p.gross_amount * p.fx_rate, 0)
    gpByProject.set(pid, inc - exp)
  }

  function computeEarnedPerEmployee(projectId: string): number {
    const ps = (profitShares ?? []).find(p => p.project_id === projectId)
    if (!ps) return 0
    const gp = gpByProject.get(projectId) ?? 0
    if (gp <= 0) return 0
    const empPct = 100 - (ps.mc_percentage ?? 100)
    const empTotal = (empPct / 100) * gp
    const empCount = (allEmployees ?? []).filter(e => e.project_id === projectId).length
    return empCount > 0 ? empTotal / empCount : 0
  }

  const salaryByUser: Record<string, number> = {}
  for (const s of (salaries ?? [])) {
    if (s.user_profile_id) salaryByUser[s.user_profile_id] = s.monthly_salary_aed
  }

  const previewOnlyIds = new Set((upcomingProfitShares ?? []).map(ps => ps.project_id))

  // Exclude preview-only projects from the commission grid and pending sections
  const assignedEmps = (allEmployees ?? []).filter(e => e.payout_month && !previewOnlyIds.has(e.project_id))
  const pendingEmps = (allEmployees ?? []).filter(e => !e.payout_month && !previewOnlyIds.has(e.project_id))

  // Build grid
  const gridUsers: GridUser[] = activeUsers.map(u => {
    const months: Record<string, MonthCell> = {}
    for (const emp of assignedEmps.filter(e => e.user_profile_id === u.id)) {
      const earned = computeEarnedPerEmployee(emp.project_id)
      if (earned === 0) continue
      const month = emp.payout_month!
      const ps = (profitShares ?? []).find(p => p.project_id === emp.project_id)
      const projectName = (ps?.project as any)?.name ?? 'Unknown Project'
      if (!months[month]) months[month] = { allocations: [], totalEarned: 0, totalPaid: 0 }
      months[month].allocations.push({ empId: emp.id, projectId: emp.project_id, projectName, earned, paid: emp.paid })
      months[month].totalEarned += earned
      if (emp.paid) months[month].totalPaid += earned
    }
    const totalEarned = Object.values(months).reduce((s, m) => s + m.totalEarned, 0)
    const totalPaid = Object.values(months).reduce((s, m) => s + m.totalPaid, 0)
    return {
      userId: u.id,
      userName: [u.first_name, u.surname].filter(Boolean).join(' ') || u.email,
      userColor: u.color ?? null,
      salary: salaryByUser[u.id] ?? null,
      months,
      totalEarned,
      totalPaid,
    }
  })

  // Build pending
  const pendingAllocations: PendingAllocation[] = []
  for (const emp of pendingEmps) {
    const earned = computeEarnedPerEmployee(emp.project_id)
    if (earned === 0) continue
    const u = activeUsers.find(u => u.id === emp.user_profile_id)
    if (!u) continue
    const ps = (profitShares ?? []).find(p => p.project_id === emp.project_id)
    pendingAllocations.push({
      empId: emp.id,
      userId: u.id,
      userName: [u.first_name, u.surname].filter(Boolean).join(' ') || u.email,
      userColor: u.color ?? null,
      projectId: emp.project_id,
      projectName: (ps?.project as any)?.name ?? 'Unknown Project',
      earned,
    })
  }

  const allMonths = [
    ...new Set([
      ...(manualMonths ?? []).map(m => m.month_key),
      ...assignedEmps.map(e => e.payout_month!).filter(Boolean),
    ])
  ].sort((a, b) => b.localeCompare(a))

  const upcomingProjects: UpcomingProject[] = (upcomingProfitShares ?? []).map(ps => {
    const projectEmployees = (allEmployees ?? []).filter(e => e.project_id === ps.project_id)
    const seen = new Set<string>()
    const members = projectEmployees
      .map(e => activeUsers.find(u => u.id === e.user_profile_id))
      .filter((u): u is NonNullable<typeof u> => !!u && !seen.has(u.id) && (seen.add(u.id), true))
      .map(u => ({
        userId: u.id,
        userName: [u.first_name, u.surname].filter(Boolean).join(' ') || u.email,
        userColor: u.color ?? null,
      }))
      .sort((a, b) => a.userName.localeCompare(b.userName))
    return {
      projectId: ps.project_id,
      projectName: (ps.project as any)?.name ?? 'Unknown Project',
      members,
    }
  })

  return (
    <ProfitShareOverviewClient
      gridUsers={gridUsers}
      allMonths={allMonths}
      pendingAllocations={pendingAllocations}
      salaryReturns={salaryReturns ?? []}
      salaryPayments={salaryPayments ?? []}
      upcomingProjects={upcomingProjects}
    />
  )
}
