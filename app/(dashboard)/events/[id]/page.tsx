import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: talentDetails }, { data: opportunities }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('talent_event_details')
      .select('*, talent:talents(id,name,ig_link,category,status)')
      .eq('event_id', id)
      .order('created_at'),
    supabase.from('opportunities')
      .select('*, talent:talents(name), brand:brands(name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Events
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">{event.name}</h1>
        <div className="flex items-center gap-4 mt-1.5">
          {event.location && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5" /> {event.location}
            </span>
          )}
          {(event.start_date || event.end_date) && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(event.start_date)}{event.end_date ? ` – ${formatDate(event.end_date)}` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {event.notes && (
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.notes}</p>
            </div>
          </div>
        )}

        <div className={event.notes ? 'col-span-2' : 'col-span-3'}>
          {/* Talent Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 mb-5">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Talent Schedule</h2>
              <span className="text-xs text-gray-400">{talentDetails?.length ?? 0} talents</span>
            </div>
            {!talentDetails?.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No talent details added yet.</p>
            )}
            {talentDetails && talentDetails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Talent</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Carpet</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Hotel</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Dress</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Jewelry</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {talentDetails.map(detail => {
                      const talent = detail.talent as { id: string; name: string; ig_link: string | null; category: string | null; status: string | null } | null
                      return (
                        <tr key={detail.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <Link href={`/talents/${talent?.id}`} className="font-medium text-gray-900 hover:text-black">
                              {talent?.name ?? '—'}
                            </Link>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge value={talent?.category} />
                              <Badge value={talent?.status} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{detail.carpet_date ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{detail.hotel ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{detail.dress ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{detail.jewelry ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{detail.agent_contact ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <span className="text-xs text-gray-400">{opportunities?.length ?? 0}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked to this event.</p>
              )}
              {opportunities?.map(opp => (
                <div key={opp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {(opp.talent as { name: string } | null)?.name ?? '—'} × {(opp.brand as { name: string } | null)?.name ?? '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 capitalize">{opp.type ?? '—'}</div>
                  </div>
                  <Badge value={opp.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
