import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency, truncate } from '@/lib/utils'

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: talent }, { data: opportunities }, { data: eventDetails }, { data: conversations }] = await Promise.all([
    supabase.from('talents').select('*').eq('id', id).single(),
    supabase.from('opportunities')
      .select('*, brand:brands(name), event:events(name)')
      .eq('talent_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('talent_event_details')
      .select('*, event:events(name)')
      .eq('talent_id', id),
    supabase.from('conversations')
      .select('*')
      .eq('entity_type', 'talent')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!talent) notFound()

  const fields = [
    { label: 'Category', value: <Badge value={talent.category} /> },
    { label: 'Status', value: <Badge value={talent.status} /> },
    { label: 'Agency', value: talent.agency },
    { label: 'Country', value: talent.country },
    { label: 'Contact', value: talent.contact },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link href="/talents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Talents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{talent.name}</h1>
            {talent.ig_link && (
              <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-1">
                <ExternalLink className="w-3 h-3" />
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>

          {talent.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{talent.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Opportunities, Events, Conversations */}
        <div className="col-span-2 space-y-5">
          {/* Opportunities */}
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
                      {(opp.brand as { name: string } | null)?.name ?? 'No brand'} — {opp.type ?? 'No type'}
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

          {/* Event Details */}
          {eventDetails && eventDetails.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Event Logistics</h2>
              </div>
              {eventDetails.map(detail => (
                <div key={detail.id} className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3">
                    {(detail.event as { name: string } | null)?.name ?? 'Unknown Event'}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Carpet Date', detail.carpet_date],
                      ['Hotel', detail.hotel],
                      ['Ticket', detail.ticket],
                      ['Driver', detail.driver],
                      ['Makeup', detail.makeup],
                      ['Hair', detail.hair],
                      ['Dress', detail.dress],
                      ['Jewelry', detail.jewelry],
                      ['Shoes', detail.shoes],
                      ['Content', detail.content],
                      ['Agent', detail.agent_contact],
                    ].map(([label, val]) => val ? (
                      <div key={label as string}>
                        <dt className="text-xs text-gray-400">{label}</dt>
                        <dd className="text-sm text-gray-700">{truncate(val as string, 80)}</dd>
                      </div>
                    ) : null)}
                  </div>
                  {detail.extra_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 whitespace-pre-wrap">{detail.extra_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conversations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
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
