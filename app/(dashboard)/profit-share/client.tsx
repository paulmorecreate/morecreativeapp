'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import type { MonthData } from './page'

type Props = {
  months: MonthData[]
  salaryByUser: Record<string, number>
  canSeeFinance: boolean
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

export function ProfitShareOverviewClient({ months, salaryByUser, canSeeFinance }: Props) {
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
        const totalSalary = month.users.reduce((s, u) => s + (salaryByUser[u.userId] ?? 0), 0)

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

                    return (
                      <>
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
                                <td className="px-5 py-2.5 text-right text-gray-400 text-xs">
                                  {isFirstAlloc && salary != null ? fmtAed(salary) : ''}
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
                      </>
                    )
                  })}

                  {/* Users without allocations — dimmed at bottom */}
                  {usersWithout.map((u, idx) => {
                    const salary = salaryByUser[u.userId] ?? null
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
                          <td className="px-5 py-2.5 text-right text-gray-400 text-xs">
                            {salary != null ? fmtAed(salary) : '—'}
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
    </div>
  )
}
