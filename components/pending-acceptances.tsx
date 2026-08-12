'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type PendingEntry = {
  id: string
  talent: { id: string; name: string } | null
  project_brand: {
    id: string
    show_date: string | null
    brand: { id: string; name: string } | null
    project: { id: string; name: string } | null
  } | null
}

const STATUS_OPTS = ['Confirmed', 'Rejected'] as const

export function PendingAcceptances({ initial }: { initial: PendingEntry[] }) {
  const [entries, setEntries] = useState(initial)
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('project_brand_talents').update({ status }).eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setUpdating(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Pending Acceptances</h2>
          {entries.length > 0 && (
            <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">No pending acceptances.</p>
        )}
        {entries.map(entry => {
          const projectBrand = entry.project_brand
          const project = projectBrand?.project
          const brand = projectBrand?.brand
          const talent = entry.talent
          const isUpdating = updating === entry.id

          return (
            <div key={entry.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <Link href={`/projects/${project?.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                  <span>{talent?.name ?? '—'}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-600">{brand?.name ?? '—'}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {project?.name ?? '—'}
                  {projectBrand?.show_date && (
                    <span className="ml-1.5">{formatDate(projectBrand.show_date)}</span>
                  )}
                </div>
              </Link>
              <div className="shrink-0 ml-3">
                <select
                  disabled={isUpdating}
                  defaultValue=""
                  onChange={e => { if (e.target.value) handleStatusChange(entry.id, e.target.value) }}
                  className="text-xs border border-amber-200 bg-amber-50 text-amber-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 cursor-pointer"
                >
                  <option value="" disabled>In Conversation</option>
                  {STATUS_OPTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
