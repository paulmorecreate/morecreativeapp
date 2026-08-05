'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, TrendingUp } from 'lucide-react'
import { Opportunity } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'

type SimpleRecord = { id: string; name: string }

type OppWithTalents = Opportunity & {
  opportunity_talents: { id: string; status: string; talent: { id: string; name: string } | null }[]
}

export const STAGES = [
  { value: 'pitch', label: 'Pitch' },
  { value: 'shortlisting', label: 'Shortlisting' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'contract', label: 'Contract' },
  { value: 'closed', label: 'Closed' },
]

export const MC_ROLES = [
  { value: 'talent_broker', label: 'Talent Broker' },
  { value: 'brand_broker', label: 'Brand Broker' },
  { value: 'placement_service', label: 'Placement Service' },
]

export const CONSIDERATION_TYPES = [
  { value: 'cash_commission', label: 'Cash + Commission' },
  { value: 'flat_fee', label: 'Flat Placement Fee' },
  { value: 'in_kind', label: 'In-Kind / Barter' },
]

export const STAGE_COLORS: Record<string, string> = {
  pitch: 'bg-zinc-100 text-zinc-600',
  shortlisting: 'bg-blue-50 text-blue-700',
  proposal_sent: 'bg-amber-50 text-amber-700',
  contract: 'bg-purple-50 text-purple-700',
  closed: 'bg-green-50 text-green-700',
}

interface Props {
  opportunities: OppWithTalents[]
  talents: SimpleRecord[]
}

const emptyForm = {
  name: '',
  stage: 'pitch',
  mc_role: 'talent_broker',
  consideration_type: 'cash_commission',
  counterpart_name: '',
  internal_owner: '',
  gross_fee: '',
  commission_pct: '20',
  event_date: '',
  notes: '',
}

export function OpportunitiesClient({ opportunities, talents }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  const filtered = opportunities.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      o.name.toLowerCase().includes(q) ||
      (o.counterpart_name ?? '').toLowerCase().includes(q) ||
      o.opportunity_talents.some(t => t.talent?.name.toLowerCase().includes(q))
    const matchStage = !stageFilter || o.stage === stageFilter
    return matchSearch && matchStage
  })

  const totalFee = filtered.reduce((s, o) => s + (o.gross_fee ?? 0), 0)
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = opportunities.filter(o => o.stage === s.value).length
    return acc
  }, {} as Record<string, number>)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('opportunities').insert({
      name: form.name.trim(),
      stage: form.stage,
      mc_role: form.mc_role,
      consideration_type: form.consideration_type,
      counterpart_name: form.counterpart_name || null,
      internal_owner: form.internal_owner || null,
      gross_fee: form.gross_fee ? parseFloat(form.gross_fee) : null,
      commission_pct: parseFloat(form.commission_pct) || 20,
      event_date: form.event_date || null,
      notes: form.notes || null,
    }).select().single()
    setSaving(false)
    setOpen(false)
    setForm(emptyForm)
    if (data) router.push(`/opportunities/${data.id}`)
    else router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
            {totalFee > 0 && ` · ${formatCurrency(totalFee)} gross pipeline`}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Opportunity
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {STAGES.map(s => (
          <button
            key={s.value}
            onClick={() => setStageFilter(stageFilter === s.value ? '' : s.value)}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-left transition-all',
              stageFilter === s.value
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <p className={cn('text-xs font-medium', stageFilter === s.value ? 'text-gray-300' : 'text-gray-500')}>{s.label}</p>
            <p className={cn('text-xl font-semibold mt-0.5', stageFilter === s.value ? 'text-white' : 'text-gray-900')}>
              {stageCounts[s.value] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, counterpart, talent…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Deal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Stage</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Counterpart</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Talents</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Event date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Gross fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  {search || stageFilter ? 'No results.' : 'No opportunities yet — add your first deal.'}
                </td>
              </tr>
            )}
            {filtered.map(opp => {
              const netToTalent = opp.gross_fee != null
                ? opp.gross_fee * (1 - opp.commission_pct / 100)
                : null
              return (
                <tr
                  key={opp.id}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/opportunities/${opp.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{opp.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[opp.stage] ?? 'bg-gray-100 text-gray-600')}>
                      {STAGES.find(s => s.value === opp.stage)?.label ?? opp.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {MC_ROLES.find(r => r.value === opp.mc_role)?.label ?? opp.mc_role}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{opp.counterpart_name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {opp.opportunity_talents.length > 0
                      ? opp.opportunity_talents.map(t => t.talent?.name).filter(Boolean).join(', ')
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {opp.event_date
                      ? new Date(opp.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {opp.gross_fee != null ? (
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(opp.gross_fee)}</p>
                        {netToTalent != null && (
                          <p className="text-xs text-gray-400">{formatCurrency(netToTalent)} net</p>
                        )}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Opportunity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Deal name *</label>
            <Input value={form.name} onChange={field('name')} placeholder="e.g. Roberto Cavalli FW26 Campaign" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Stage</label>
              <Select value={form.stage} onChange={field('stage')} options={STAGES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">MC role</label>
              <Select value={form.mc_role} onChange={field('mc_role')} options={MC_ROLES} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Consideration type</label>
              <Select value={form.consideration_type} onChange={field('consideration_type')} options={CONSIDERATION_TYPES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Counterpart / Client</label>
              <Input value={form.counterpart_name} onChange={field('counterpart_name')} placeholder="Brand, publisher, or talent rep" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Gross fee (€)</label>
              <Input type="number" value={form.gross_fee} onChange={field('gross_fee')} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Commission %</label>
              <Input type="number" value={form.commission_pct} onChange={field('commission_pct')} placeholder="20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Event date</label>
              <Input type="date" value={form.event_date} onChange={field('event_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Internal owner</label>
            <Input value={form.internal_owner} onChange={field('internal_owner')} placeholder="e.g. Nima Samiee" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Context, deal background…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()} className="flex-1">
              {saving ? 'Saving…' : 'Add Opportunity'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
