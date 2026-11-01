'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, X, Loader2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GridUser, CellAllocation, PendingAllocation, SalaryReturn, SalaryPayment, UpcomingProject } from './page'

type Props = {
  gridUsers: GridUser[]
  allMonths: string[]
  pendingAllocations: PendingAllocation[]
  salaryReturns: SalaryReturn[]
  salaryPayments: SalaryPayment[]
  upcomingProjects: UpcomingProject[]
}

const fmtAed = (v: number) =>
  `AED ${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function Avatar({ name, color }: { name: string; color: string | null }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
      style={{ backgroundColor: color ?? '#6b7280' }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function generateMonthOptions() {
  const now = new Date()
  const options: { value: string; label: string }[] = []
  for (let i = 12; i >= -2; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options.reverse()
}

export function ProfitShareOverviewClient({ gridUsers: initialGrid, allMonths: initialMonths, pendingAllocations: initialPending, salaryReturns: initialReturns, salaryPayments: initialSalaryPayments, upcomingProjects }: Props) {
  const [grid, setGrid] = useState<GridUser[]>(initialGrid)
  const [months, setMonths] = useState<string[]>(initialMonths)
  const [pending, setPending] = useState<PendingAllocation[]>(initialPending)
  const [returns, setReturns] = useState<SalaryReturn[]>(initialReturns)
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(initialSalaryPayments)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [reassigningEmpId, setReassigningEmpId] = useState<string | null>(null)
  const [returnModal, setReturnModal] = useState<{ userId: string; userName: string; monthKey?: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ amount: '', note: '', month_key: '' })
  const [returnSaving, setReturnSaving] = useState(false)
  const [addingMonth, setAddingMonth] = useState(false)
  const [addMonthValue, setAddMonthValue] = useState('')
  const [editingSalary, setEditingSalary] = useState<{ userId: string; monthKey: string } | null>(null)
  const [editSalaryValue, setEditSalaryValue] = useState('')
  const [addOneOffMonth, setAddOneOffMonth] = useState<string | null>(null)
  const [oneOffForm, setOneOffForm] = useState({ userId: '', amount: '', note: '' })

  function openReturnModal(userId: string, userName: string, monthKey?: string) {
    setReturnModal({ userId, userName, monthKey })
    setReturnForm({ amount: '', note: '', month_key: monthKey ?? '' })
  }

  async function deleteSalaryPayment(userId: string, monthKey: string) {
    const payment = salaryPayments.find(p => p.user_profile_id === userId && p.month_key === monthKey)
    if (!payment) return
    const supabase = createClient()
    await supabase.from('monthly_salary_payments').delete().eq('id', payment.id)
    setSalaryPayments(prev => prev.filter(p => p.id !== payment.id))
  }

  async function saveSalary(userId: string, monthKey: string) {
    const amount = parseFloat(editSalaryValue)
    setEditingSalary(null)
    if (isNaN(amount) || amount < 0) return
    const supabase = createClient()
    const existing = salaryPayments.find(p => p.user_profile_id === userId && p.month_key === monthKey)
    if (existing) {
      await supabase.from('monthly_salary_payments').update({ amount }).eq('id', existing.id)
      setSalaryPayments(prev => prev.map(p => p.id === existing.id ? { ...p, amount } : p))
    } else {
      const { data } = await supabase.from('monthly_salary_payments')
        .insert({ user_profile_id: userId, month_key: monthKey, amount, note: null })
        .select('id, user_profile_id, month_key, amount, note').single()
      if (data) setSalaryPayments(prev => [...prev, data])
    }
  }

  async function saveOneOff() {
    const amount = parseFloat(oneOffForm.amount)
    if (!oneOffForm.userId || isNaN(amount) || amount <= 0 || !addOneOffMonth) return
    const supabase = createClient()
    const { data } = await supabase.from('monthly_salary_payments')
      .insert({ user_profile_id: oneOffForm.userId, month_key: addOneOffMonth, amount, note: oneOffForm.note || null })
      .select('id, user_profile_id, month_key, amount, note').single()
    if (data) setSalaryPayments(prev => [...prev, data])
    setAddOneOffMonth(null)
    setOneOffForm({ userId: '', amount: '', note: '' })
  }

  async function addMonth() {
    if (!addMonthValue || months.includes(addMonthValue)) {
      setAddingMonth(false)
      setAddMonthValue('')
      return
    }
    const supabase = createClient()
    await supabase.from('team_earnings_months').upsert({ month_key: addMonthValue }, { onConflict: 'month_key' })
    setMonths(prev => [...prev, addMonthValue].sort((a, b) => b.localeCompare(a)))
    setAddingMonth(false)
    setAddMonthValue('')
  }

  const monthOptions = generateMonthOptions()

  // Show users with a recurring salary, commission, or a salary payment in any active month
  const visibleUsers = grid.filter(u =>
    u.salary != null ||
    u.totalEarned > 0 ||
    salaryPayments.some(p => p.user_profile_id === u.userId && months.includes(p.month_key))
  )

  function effectiveSalary(userId: string, monthKey: string, baseSalary: number | null): number {
    return salaryPayments.find(p => p.user_profile_id === userId && p.month_key === monthKey)?.amount ?? baseSalary ?? 0
  }

  function toggleExpand(monthKey: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey)
      return next
    })
  }

  async function assignMonth(empId: string, monthKey: string) {
    if (!monthKey) return
    setAssigningId(empId)
    const supabase = createClient()
    await supabase.from('project_profit_share_employees').update({ payout_month: monthKey }).eq('id', empId)
    setAssigningId(null)

    const alloc = pending.find(p => p.empId === empId)
    if (!alloc) return

    setPending(prev => prev.filter(p => p.empId !== empId))
    setMonths(prev => prev.includes(monthKey) ? prev : [...prev, monthKey].sort((a, b) => b.localeCompare(a)))
    setGrid(prev => prev.map(u => {
      if (u.userId !== alloc.userId) return u
      const newMonths = { ...u.months }
      if (!newMonths[monthKey]) newMonths[monthKey] = { allocations: [], totalEarned: 0, totalPaid: 0 }
      const newAlloc: CellAllocation = { empId: alloc.empId, projectId: alloc.projectId, projectName: alloc.projectName, earned: alloc.earned, paid: false }
      newMonths[monthKey] = {
        allocations: [...newMonths[monthKey].allocations, newAlloc],
        totalEarned: newMonths[monthKey].totalEarned + alloc.earned,
        totalPaid: newMonths[monthKey].totalPaid,
      }
      return { ...u, months: newMonths, totalEarned: u.totalEarned + alloc.earned }
    }))
  }

  async function togglePaid(empId: string, userId: string, monthKey: string) {
    const user = grid.find(u => u.userId === userId)
    const alloc = user?.months[monthKey]?.allocations.find(a => a.empId === empId)
    if (!alloc) return
    const next = !alloc.paid
    const supabase = createClient()
    await supabase.from('project_profit_share_employees').update({ paid: next }).eq('id', empId)
    setGrid(prev => prev.map(u => {
      if (u.userId !== userId) return u
      const newMonths = { ...u.months }
      const cell = newMonths[monthKey]
      const allocations = cell.allocations.map(a => a.empId === empId ? { ...a, paid: next } : a)
      const totalPaid = allocations.filter(a => a.paid).reduce((s, a) => s + a.earned, 0)
      newMonths[monthKey] = { ...cell, allocations, totalPaid }
      return { ...u, months: newMonths, totalPaid: Object.values(newMonths).reduce((s, m) => s + m.totalPaid, 0) }
    }))
  }

  async function reassignMonth(empId: string, userId: string, currentMonth: string, newMonth: string | null) {
    const supabase = createClient()
    await supabase.from('project_profit_share_employees').update({ payout_month: newMonth }).eq('id', empId)
    setReassigningEmpId(null)

    const user = grid.find(u => u.userId === userId)
    const alloc = user?.months[currentMonth]?.allocations.find(a => a.empId === empId)
    if (!alloc) return

    const newGrid = grid.map(u => {
      if (u.userId !== userId) return u
      const newMonthsMap = { ...u.months }

      // Remove from current month
      const updatedAllocs = newMonthsMap[currentMonth].allocations.filter(a => a.empId !== empId)
      if (updatedAllocs.length === 0) {
        delete newMonthsMap[currentMonth]
      } else {
        newMonthsMap[currentMonth] = {
          allocations: updatedAllocs,
          totalEarned: updatedAllocs.reduce((s, a) => s + a.earned, 0),
          totalPaid: updatedAllocs.filter(a => a.paid).reduce((s, a) => s + a.earned, 0),
        }
      }

      // Add to new month if reassigning
      if (newMonth) {
        if (!newMonthsMap[newMonth]) newMonthsMap[newMonth] = { allocations: [], totalEarned: 0, totalPaid: 0 }
        newMonthsMap[newMonth] = {
          allocations: [...newMonthsMap[newMonth].allocations, { ...alloc, paid: false }],
          totalEarned: newMonthsMap[newMonth].totalEarned + alloc.earned,
          totalPaid: newMonthsMap[newMonth].totalPaid,
        }
      }

      const totalEarned = Object.values(newMonthsMap).reduce((s, m) => s + m.totalEarned, 0)
      const totalPaid = Object.values(newMonthsMap).reduce((s, m) => s + m.totalPaid, 0)
      return { ...u, months: newMonthsMap, totalEarned, totalPaid }
    })

    setGrid(newGrid)

    // Add new month column if needed
    if (newMonth && !months.includes(newMonth)) {
      setMonths(prev => [...prev, newMonth].sort((a, b) => b.localeCompare(a)))
    }

    // Remove current month column if now empty across all users
    const monthStillUsed = newGrid.some(u => u.months[currentMonth]?.allocations.length > 0)
    if (!monthStillUsed) {
      setMonths(prev => prev.filter(m => m !== currentMonth))
      setExpandedMonths(prev => { const next = new Set(prev); next.delete(currentMonth); return next })
    }

    // If unassigning, send back to pending
    if (!newMonth) {
      setPending(prev => [...prev, {
        empId: alloc.empId,
        userId,
        userName: user!.userName,
        userColor: user!.userColor,
        projectId: alloc.projectId,
        projectName: alloc.projectName,
        earned: alloc.earned,
      }])
    }
  }

  async function addReturn() {
    if (!returnModal || !returnForm.amount || !returnForm.month_key) return
    const amount = parseFloat(returnForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setReturnSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('salary_returns')
      .insert({ user_profile_id: returnModal.userId, month_key: returnForm.month_key, amount, note: returnForm.note || null })
      .select('id, user_profile_id, month_key, amount, note')
      .single()
    setReturnSaving(false)
    if (!error && data) {
      setReturns(prev => [...prev, data])
      setReturnForm({ amount: '', note: '', month_key: '' })
      setReturnModal(null)
    }
  }

  async function deleteReturn(id: string) {
    setReturns(prev => prev.filter(r => r.id !== id))
    const supabase = createClient()
    await supabase.from('salary_returns').delete().eq('id', id)
  }

  const hasAnyData = months.length > 0 || pending.length > 0 || upcomingProjects.length > 0

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Earnings</h1>
          <p className="text-sm text-gray-400 mt-1">Commission overview by payout month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-sm text-gray-400">No earnings data yet. Set up profit share on a project to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Earnings</h1>
          <p className="text-sm text-gray-400 mt-1">Commission overview by payout month</p>
        </div>
        <div className="flex items-center gap-2">
          {addingMonth ? (
            <>
              <select
                autoFocus
                value={addMonthValue}
                onChange={e => setAddMonthValue(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
              >
                <option value="" disabled>Select month…</option>
                {monthOptions.filter(o => !months.includes(o.value)).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button onClick={addMonth} disabled={!addMonthValue} className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">Add</button>
              <button onClick={() => { setAddingMonth(false); setAddMonthValue('') }} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">Cancel</button>
            </>
          ) : (
            <button
              onClick={() => setAddingMonth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Month
            </button>
          )}
        </div>
      </div>

      {/* Grid — months as rows, team members as columns */}
      {months.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-400 bg-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-200 whitespace-nowrap">Month</th>
                {visibleUsers.map(u => (
                  <th key={u.userId} className="text-right px-5 py-3 text-xs font-medium text-gray-200 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Avatar name={u.userName} color={u.userColor} />
                      <span>{u.userName}</span>
                    </div>
                  </th>
                ))}
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-200 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">

              {/* Month rows */}
              {months.map((m, idx) => {
                const expanded = expandedMonths.has(m)
                const rowBg = idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'

                // Collect all unique projects active in this month across all users
                const projectMap = new Map<string, string>() // projectId → projectName
                for (const u of visibleUsers) {
                  for (const alloc of u.months[m]?.allocations ?? []) {
                    if (!projectMap.has(alloc.projectId)) projectMap.set(alloc.projectId, alloc.projectName)
                  }
                }
                const projects = [...projectMap.entries()]

                return (
                  <Fragment key={m}>
                    <tr className={rowBg}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleExpand(m)} className="text-gray-400 hover:text-gray-700 transition-colors">
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <span className="font-medium text-gray-900">{monthLabel(m)}</span>
                          <button
                            onClick={() => { setAddOneOffMonth(m); setOneOffForm({ userId: '', amount: '', note: '' }) }}
                            className="text-gray-300 hover:text-gray-600 transition-colors"
                            title="Add one-off salary"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      {visibleUsers.map(u => {
                        const cell = u.months[m]
                        const commission = cell?.totalEarned ?? 0
                        const salaryPayment = salaryPayments.find(p => p.user_profile_id === u.userId && p.month_key === m)
                        const salary = salaryPayment?.amount ?? u.salary ?? 0
                        const monthReturns = returns.filter(r => r.user_profile_id === u.userId && r.month_key === m)
                        const monthReturnsTotal = monthReturns.reduce((s, r) => s + r.amount, 0)
                        const isEditing = editingSalary?.userId === u.userId && editingSalary?.monthKey === m
                        if (commission === 0 && salary === 0) {
                          return <td key={u.userId} className="px-5 py-3.5 text-right text-gray-300">—</td>
                        }
                        return (
                          <td key={u.userId} className="px-5 py-3.5">
                            <div className="flex flex-col items-end gap-0.5">
                              {salary > 0 && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    {/* action buttons sit LEFT of label so amount stays rightmost */}
                                    {!isEditing && salaryPayment && (
                                      <button onClick={() => deleteSalaryPayment(u.userId, m)} className="text-gray-200 hover:text-red-400 transition-colors" title="Remove salary entry">
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                    {!isEditing && !salaryPayment && (
                                      <button onClick={() => openReturnModal(u.userId, u.userName, m)} className="text-gray-200 hover:text-gray-600 transition-colors" title="Log salary return">
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    )}
                                    <span className="text-[10px] text-gray-400">salary</span>
                                    {isEditing ? (
                                      <input
                                        autoFocus
                                        type="number"
                                        value={editSalaryValue}
                                        onChange={e => setEditSalaryValue(e.target.value)}
                                        onBlur={() => saveSalary(u.userId, m)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveSalary(u.userId, m); if (e.key === 'Escape') setEditingSalary(null) }}
                                        className="w-24 text-right border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-black/20 bg-white"
                                      />
                                    ) : (
                                      <button
                                        onClick={() => { setEditingSalary({ userId: u.userId, monthKey: m }); setEditSalaryValue(String(salary)) }}
                                        className="text-xs font-medium text-gray-600 tabular-nums hover:text-gray-900 hover:underline underline-offset-2 transition-colors"
                                        title="Click to edit"
                                      >
                                        {fmtAed(salary)}
                                      </button>
                                    )}
                                  </div>
                                  {monthReturnsTotal > 0 && (
                                    <span className="text-[10px] text-red-400 tabular-nums">−{fmtAed(monthReturnsTotal)} returned</span>
                                  )}
                                </>
                              )}
                              {commission > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-gray-400">comm.</span>
                                  <span className="text-xs font-medium text-gray-900 tabular-nums">{fmtAed(commission)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-5 py-3.5 text-right">
                        {(() => {
                          const rowTotal = visibleUsers.reduce((s, u) => {
                            const commission = u.months[m]?.totalEarned ?? 0
                            const salary = effectiveSalary(u.userId, m, u.salary)
                            const monthReturnsTotal = returns.filter(r => r.user_profile_id === u.userId && r.month_key === m).reduce((rs, r) => rs + r.amount, 0)
                            return s + commission + salary - monthReturnsTotal
                          }, 0)
                          return rowTotal > 0
                            ? <span className="font-semibold text-gray-900">{fmtAed(rowTotal)}</span>
                            : <span className="text-gray-300">—</span>
                        })()}
                      </td>
                    </tr>

                    {/* Expanded: one sub-row per project in this month */}
                    {expanded && projects.map(([projectId, projectName]) => {
                      const projTotal = visibleUsers.reduce((s, u) => {
                        const alloc = u.months[m]?.allocations.find(a => a.projectId === projectId)
                        return s + (alloc?.earned ?? 0)
                      }, 0)
                      return (
                        <tr key={`${m}-${projectId}`} className={cn('border-t border-gray-200', rowBg === 'bg-white' ? 'bg-gray-50/70' : 'bg-slate-50')}>
                          <td className="px-5 py-2 pl-12">
                            <Link href={`/projects/${projectId}?tab=finance`} className="text-xs text-gray-500 hover:text-gray-900 hover:underline underline-offset-2" onClick={e => e.stopPropagation()}>
                              {projectName}
                            </Link>
                          </td>
                          {visibleUsers.map(u => {
                            const alloc = u.months[m]?.allocations.find(a => a.projectId === projectId)
                            if (!alloc) {
                              return <td key={u.userId} className="px-5 py-2 text-right text-gray-300 text-xs">—</td>
                            }
                            return (
                              <td key={u.userId} className="px-5 py-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-gray-700">{fmtAed(alloc.earned)}</span>
                                  {reassigningEmpId === alloc.empId ? (
                                    <>
                                      <select
                                        autoFocus
                                        defaultValue={m}
                                        onChange={e => reassignMonth(alloc.empId, u.userId, m, e.target.value === '__unassign__' ? null : e.target.value)}
                                        className="text-xs border border-gray-300 rounded px-2 py-0.5 focus:outline-none bg-white"
                                      >
                                        <option value="__unassign__">Unassign</option>
                                        {monthOptions.map(o => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                      <button onClick={() => setReassigningEmpId(null)} className="text-gray-300 hover:text-gray-600">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => togglePaid(alloc.empId, u.userId, m)}
                                        className={cn(
                                          'text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors',
                                          alloc.paid
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        )}
                                      >
                                        {alloc.paid ? 'Paid' : 'Unpaid'}
                                      </button>
                                      <button
                                        onClick={() => setReassigningEmpId(alloc.empId)}
                                        className="text-gray-300 hover:text-gray-600 transition-colors"
                                        title="Change or remove payout month"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="px-5 py-2 text-right text-xs font-medium text-gray-700">
                            {projTotal > 0 ? fmtAed(projTotal) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-5 py-3 text-xs font-semibold text-gray-500">Total</td>
                {visibleUsers.map(u => {
                  const salaryTotal = months.reduce((s, m) => s + effectiveSalary(u.userId, m, u.salary), 0)
                  const returnsTotal = returns.filter(r => r.user_profile_id === u.userId).reduce((s, r) => s + r.amount, 0)
                  const total = u.totalEarned + salaryTotal - returnsTotal
                  return (
                    <td key={u.userId} className="px-5 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{fmtAed(total)}</span>
                    </td>
                  )
                })}
                <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                  {fmtAed(visibleUsers.reduce((s, u) => {
                    const salaryTotal = months.reduce((ms, m) => ms + effectiveSalary(u.userId, m, u.salary), 0)
                    const returnsTotal = returns.filter(r => r.user_profile_id === u.userId).reduce((rs, r) => rs + r.amount, 0)
                    return s + u.totalEarned + salaryTotal - returnsTotal
                  }, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending — Assign Payout Month</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-400 bg-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-200">Project</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-200">Team Member</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-200">Earned</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-200">Payout Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {pending.map((alloc, i) => (
                  <tr key={alloc.empId} className={i % 2 === 1 ? 'bg-slate-100' : 'bg-white'}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <Link href={`/projects/${alloc.projectId}?tab=finance`} className="hover:underline underline-offset-2 hover:text-gray-600">
                        {alloc.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={alloc.userName} color={alloc.userColor} />
                        <span className="text-gray-700">{alloc.userName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">{fmtAed(alloc.earned)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          disabled={assigningId === alloc.empId}
                          onChange={e => assignMonth(alloc.empId, e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/10 bg-white disabled:opacity-50"
                        >
                          <option value="" disabled>Select month…</option>
                          {monthOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {assigningId === alloc.empId && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming Projects */}
      {upcomingProjects.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Upcoming</h2>
          <p className="text-xs text-gray-400 mb-3">Projects in profit share — amounts not yet finalised</p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-400 bg-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-200">Project</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-200">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-400">
                {upcomingProjects.map((proj, i) => (
                  <tr key={proj.projectId} className={i % 2 === 1 ? 'bg-slate-100' : 'bg-white'}>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      <Link href={`/projects/${proj.projectId}?tab=finance`} className="hover:underline underline-offset-2 hover:text-gray-600">
                        {proj.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {proj.members.map(m => (
                          <div key={m.userId} className="flex items-center gap-1.5">
                            <Avatar name={m.userName} color={m.userColor} />
                            <span className="text-xs text-gray-600">{m.userName}</span>
                          </div>
                        ))}
                        {proj.members.length === 0 && <span className="text-gray-300 text-xs">No team assigned</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* One-off salary modal */}
      {addOneOffMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAddOneOffMonth(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add One-off Salary</h2>
                <p className="text-xs text-gray-400 mt-0.5">{monthLabel(addOneOffMonth)}</p>
              </div>
              <button onClick={() => setAddOneOffMonth(null)} className="text-gray-300 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Team Member</label>
                <select
                  value={oneOffForm.userId}
                  onChange={e => setOneOffForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10 bg-white"
                >
                  <option value="" disabled>Select person…</option>
                  {grid.map(u => (
                    <option key={u.userId} value={u.userId}>{u.userName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Amount (AED)</label>
                <input
                  type="number"
                  min="0"
                  value={oneOffForm.amount}
                  onChange={e => setOneOffForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Note (optional)</label>
                <input
                  type="text"
                  value={oneOffForm.note}
                  onChange={e => setOneOffForm(f => ({ ...f, note: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveOneOff()}
                  placeholder="e.g. One-off payment"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setAddOneOffMonth(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors">Cancel</button>
              <button
                onClick={saveOneOff}
                disabled={!oneOffForm.userId || !oneOffForm.amount}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary returns modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReturnModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Salary Returns</h2>
                <p className="text-xs text-gray-400 mt-0.5">{returnModal.userName}</p>
              </div>
              <button onClick={() => setReturnModal(null)} className="text-gray-300 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {returns.filter(r => r.user_profile_id === returnModal.userId).length > 0 && (
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                {returns.filter(r => r.user_profile_id === returnModal.userId).map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="text-xs font-medium text-gray-700">{monthLabel(r.month_key)}</span>
                      {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-500">−{fmtAed(r.amount)}</span>
                      <button onClick={() => deleteReturn(r.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-gray-700">Log a return</p>
              <select
                value={returnForm.month_key}
                onChange={e => setReturnForm(f => ({ ...f, month_key: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
              >
                <option value="" disabled>Select month…</option>
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="number"
                min="0"
                value={returnForm.amount}
                onChange={e => setReturnForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Amount returned (AED)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
              />
              <input
                type="text"
                value={returnForm.note}
                onChange={e => setReturnForm(f => ({ ...f, note: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addReturn()}
                placeholder="Note (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReturnModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors">Cancel</button>
              <button
                onClick={addReturn}
                disabled={returnSaving || !returnForm.amount || !returnForm.month_key}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {returnSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
