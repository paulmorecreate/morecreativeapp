'use client'

import { useState, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MonthData, SalaryReturn } from './page'

type Props = {
  months: MonthData[]
  salaryByUser: Record<string, number>
  canSeeFinance: boolean
  salaryReturns: SalaryReturn[]
}

const fmtAed = (v: number) =>
  `AED ${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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

export function ProfitShareOverviewClient({ months, salaryByUser, canSeeFinance, salaryReturns: initialReturns }: Props) {
  const [returns, setReturns] = useState<SalaryReturn[]>(initialReturns)
  const [returnModal, setReturnModal] = useState<{ userId: string; userName: string; monthKey: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ amount: '', note: '' })
  const [returnSaving, setReturnSaving] = useState(false)

  function returnsFor(userId: string, monthKey: string) {
    return returns.filter(r => r.user_profile_id === userId && r.month_key === monthKey)
  }

  async function addReturn() {
    if (!returnModal || !returnForm.amount) return
    const amount = parseFloat(returnForm.amount)
    if (isNaN(amount) || amount <= 0) return
    setReturnSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('salary_returns')
      .insert({ user_profile_id: returnModal.userId, month_key: returnModal.monthKey, amount, note: returnForm.note || null })
      .select('id, user_profile_id, month_key, amount, note')
      .single()
    setReturnSaving(false)
    if (!error && data) {
      setReturns(prev => [...prev, data])
      setReturnForm({ amount: '', note: '' })
      setReturnModal(null)
    }
  }

  async function deleteReturn(id: string) {
    setReturns(prev => prev.filter(r => r.id !== id))
    const supabase = createClient()
    await supabase.from('salary_returns').delete().eq('id', id)
  }

  if (months.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team Earnings</h1>
          <p className="text-sm text-gray-400 mt-1">Salary and commission from October 2026</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-sm text-gray-400">No profit share data from October 2026 yet.</p>
        </div>
      </div>
    )
  }

  // colspan count
  const cols = canSeeFinance ? 5 : 4

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team Earnings</h1>
        <p className="text-sm text-gray-400 mt-1">Salary and commission from October 2026</p>
      </div>

      {months.map(month => {
        const usersWithAllocations = month.users.filter(u => u.allocations.length > 0)
        const usersWithout = month.users.filter(u => u.allocations.length === 0)
        const totalSalary = month.users.reduce((s, u) => {
          const base = salaryByUser[u.userId] ?? 0
          const returned = returnsFor(u.userId, month.monthKey).reduce((t, r) => t + r.amount, 0)
          return s + Math.max(0, base - returned)
        }, 0)

        return (
          <div key={month.monthKey}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">{month.label}</h2>
              {canSeeFinance && month.totalEarned > 0 && (
                <span className="text-xs text-gray-400">
                  {fmtAed(month.totalPaid)} paid · {fmtAed(month.totalEarned - month.totalPaid)} outstanding
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Team Member</th>
                    {canSeeFinance && (
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Salary / mo</th>
                    )}
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Commission Earned</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Paid</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Users with allocations */}
                  {usersWithAllocations.map((u, personIdx) => {
                    const salary = salaryByUser[u.userId] ?? null
                    const outstanding = u.totalEarned - u.totalPaid
                    const multiProject = u.allocations.length > 1
                    const isLast = personIdx === usersWithAllocations.length - 1 && usersWithout.length === 0
                    const userReturns = returnsFor(u.userId, month.monthKey)
                    const totalReturned = userReturns.reduce((t, r) => t + r.amount, 0)
                    const netSalary = salary != null ? Math.max(0, salary - totalReturned) : null

                    return (
                      <Fragment key={u.userId}>
                        {/* Project rows */}
                        {u.allocations.map((alloc, allocIdx) => {
                          const isFirstAlloc = allocIdx === 0
                          const isLastAlloc = allocIdx === u.allocations.length - 1
                          return (
                            <tr
                              key={`${u.userId}-${alloc.projectId}`}
                              className={cn(
                                'border-t border-gray-50',
                                isFirstAlloc && personIdx > 0 && 'border-t border-gray-200',
                                isLastAlloc && multiProject && 'border-b border-gray-100',
                              )}
                            >
                              <td className="px-5 py-2.5">
                                {isFirstAlloc ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar name={u.userName} color={u.userColor} />
                                    <span className="font-medium text-gray-900">{u.userName}</span>
                                  </div>
                                ) : (
                                  <div className="pl-8 flex items-center gap-1.5 text-gray-400">
                                    <span className="text-gray-200">└</span>
                                  </div>
                                )}
                              </td>
                              {canSeeFinance && (
                                <td className="px-5 py-2.5 text-right align-top">
                                  {isFirstAlloc && salary != null ? (
                                    <SalaryCell
                                      base={salary}
                                      returns={userReturns}
                                      netSalary={netSalary!}
                                      onAdd={() => setReturnModal({ userId: u.userId, userName: u.userName, monthKey: month.monthKey })}
                                      onDelete={deleteReturn}
                                    />
                                  ) : ''}
                                </td>
                              )}
                              <td className="px-5 py-2.5 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-medium text-gray-900">{fmtAed(alloc.earned)}</span>
                                  <span className="text-xs text-gray-400">{alloc.projectName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-2.5 text-right">
                                {alloc.paid ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-5 py-2.5 text-right font-medium">
                                {!alloc.paid ? (
                                  <span className="text-amber-600">{fmtAed(alloc.earned)}</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}

                        {/* Subtotal row — only for multi-project people */}
                        {multiProject && (
                          <tr className={cn('bg-gray-50/60', !isLast && 'border-b border-gray-200')}>
                            <td className="px-5 py-2 pl-8 text-xs text-gray-400 font-medium">Total</td>
                            {canSeeFinance && <td />}
                            <td className="px-5 py-2 text-right text-sm font-semibold text-gray-900">
                              {fmtAed(u.totalEarned)}
                            </td>
                            <td className="px-5 py-2 text-right text-sm font-semibold text-green-600">
                              {u.totalPaid > 0 ? fmtAed(u.totalPaid) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-2 text-right text-sm font-semibold">
                              {outstanding > 0
                                ? <span className="text-amber-600">{fmtAed(outstanding)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}

                  {/* Users without allocations — dimmed at bottom */}
                  {usersWithout.map((u, idx) => {
                    const salary = salaryByUser[u.userId] ?? null
                    const userReturns = returnsFor(u.userId, month.monthKey)
                    const totalReturned = userReturns.reduce((t, r) => t + r.amount, 0)
                    const netSalary = salary != null ? Math.max(0, salary - totalReturned) : null
                    return (
                      <tr
                        key={u.userId}
                        className={cn(
                          'border-t border-gray-50',
                          idx === 0 && usersWithAllocations.length > 0 && 'border-t border-gray-200',
                        )}
                      >
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={u.userName} color={u.userColor} />
                            <span className="text-gray-500">{u.userName}</span>
                          </div>
                        </td>
                        {canSeeFinance && (
                          <td className="px-5 py-2.5 text-right align-top">
                            {salary != null ? (
                              <SalaryCell
                                base={salary}
                                returns={userReturns}
                                netSalary={netSalary!}
                                onAdd={() => setReturnModal({ userId: u.userId, userName: u.userName, monthKey: month.monthKey })}
                                onDelete={deleteReturn}
                              />
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        )}
                        <td className="px-5 py-2.5 text-right text-gray-300">—</td>
                        <td className="px-5 py-2.5 text-right text-gray-300">—</td>
                        <td className="px-5 py-2.5 text-right text-gray-300">—</td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Month total footer */}
                {canSeeFinance && month.totalEarned > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-5 py-3 text-xs font-semibold text-gray-500">Month Total</td>
                      {canSeeFinance && (
                        <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                          {totalSalary > 0 ? fmtAed(totalSalary) : '—'}
                        </td>
                      )}
                      <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                        {fmtAed(month.totalEarned)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">
                        {fmtAed(month.totalPaid)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-amber-600">
                        {fmtAed(month.totalEarned - month.totalPaid)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )
      })}

      {/* Add return modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReturnModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Log Salary Return</h2>
              <p className="text-xs text-gray-400 mt-0.5">{returnModal.userName} · {returnModal.monthKey}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Amount returned (AED)</label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={returnForm.amount}
                  onChange={e => setReturnForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 10000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={returnForm.note}
                  onChange={e => setReturnForm(f => ({ ...f, note: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addReturn()}
                  placeholder="e.g. Partial return Oct"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setReturnModal(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors">Cancel</button>
              <button
                onClick={addReturn}
                disabled={returnSaving || !returnForm.amount}
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

function SalaryCell({ base, returns, netSalary, onAdd, onDelete }: {
  base: number
  returns: SalaryReturn[]
  netSalary: number
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1 group">
        <span className={cn('text-xs', returns.length > 0 ? 'text-gray-400 line-through' : 'text-gray-600')}>
          {fmtAed(base)}
        </span>
        <button
          onClick={onAdd}
          className="opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 rounded-full p-0.5 transition-all"
          title="Log salary return"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {returns.map(r => (
        <div key={r.id} className="flex items-center gap-1 group/ret">
          <span className="text-[11px] text-red-500">−{fmtAed(r.amount)}</span>
          {r.note && <span className="text-[10px] text-gray-400 max-w-[80px] truncate" title={r.note}>{r.note}</span>}
          <button
            onClick={() => onDelete(r.id)}
            className="opacity-0 group-hover/ret:opacity-100 text-gray-300 hover:text-red-500 transition-all"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      {returns.length > 0 && (
        <span className="text-xs font-semibold text-gray-900">{fmtAed(netSalary)}</span>
      )}
    </div>
  )
}
