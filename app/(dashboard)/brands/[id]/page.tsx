import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: brand }, { data: opportunities }, { data: conversations }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', id).single(),
    supabase.from('opportunities')
      .select('*, talent:talents(name), event:events(name)')
      .eq('brand_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'brand')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!brand) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/brands" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Brands
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{brand.name}</h1>
            {brand.link && (
              <a href={brand.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-1">
                <ExternalLink className="w-3 h-3" />
                View profile
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge value={brand.category} />
            <Badge value={brand.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              {[
                { label: 'Industry', value: brand.industry },
                { label: 'Country', value: brand.country },
                { label: 'Budget', value: brand.budget },
                { label: 'Contact', value: brand.contact },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value ?? <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>

          {brand.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{brand.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <span className="text-xs text-gray-400">{opportunities?.length ?? 0}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked.</p>
              )}
              {opportunities?.map(opp => (
                <div key={opp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {(opp.talent as { name: string } | null)?.name ?? 'No talent'} — {opp.type ?? 'No type'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{(opp.event as { name: string } | null)?.name ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opp.estimated_value && <span className="text-xs text-gray-500">{formatCurrency(opp.estimated_value)}</span>}
                    <Badge value={opp.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>
              )}
              {conversations?.map(c => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={c.status} />
                    <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
