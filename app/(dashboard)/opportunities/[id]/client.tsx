'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, Check, X, AlertCircle } from 'lucide-react'
import { Opportunity, OpportunityTalent, OpportunityContact, OpportunityBlocker } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { STAGES, MC_ROLES, CONSIDERATION_TYPES, STAGE_COLORS } from '../client'

type SimpleRecord = { id: string; name: string }

const TALENT_STATUSES = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'approached', label: 'Approached' },
  { value: 'declined', label: 'Declined' },
  { value: 'confirmed', label: 'Confirmed' },
]

const TALENT_STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-zinc-100 text-zinc-600',
  approached: 'bg-blue-50 text-blue-700',
  declined: 'bg-red-50 text-red-600',
  confirmed: 'bg-green-50 text-green-700',
}

type Props = {
  opp: Opportunity
  oppTalents: OpportunityTalent[]
  contacts: OpportunityContact[]
  blockers: OpportunityBlocker[]
  talents: SimpleRecord[]
}

export function OpportunityDetailClient({ opp, oppTalents, contacts, blockers, talents }: Props) {
  const router = useRouter()

  // Edit deal
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: opp.name,
    stage: opp.stage,
    mc_role: opp.mc_role,
    consideration_type: opp.consideration_type,
    counterpart_name: opp.counterpart_name ?? '',
    internal_owner: opp.internal_owner ?? '',
    gross_fee: opp.gross_fee != null ? String(opp.gross_fee) : '',
    commission_pct: String(opp.commission_pct),
    event_date: opp.event_date ?? '',
    notes: opp.notes ?? '',
  })

  // Add talent
  const [addTalentOpen, setAddTalentOpen] = useState(false)
  const [talentForm, setTalentForm] = useState({ talent_id: '', status: 'proposed', notes: '' })
  const [talentSaving, setTalentSaving] = useState(false)

  // Add contact
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', role: '', company: '' })
  const [contactSaving, setContactSaving] = useState(false)

  // Add blocker
  const [addBlockerOpen, setAddBlockerOpen] = useState(false)
  const [blockerForm, setBlockerForm] = useState({ description: '', due_date: '' })
  const [blockerSaving, setBlockerSaving] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({
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
      updated_at: new Date().toISOString(),
    }).eq('id', opp.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleAddTalent(e: React.FormEvent) {
    e.preventDefault()
    if (!talentForm.talent_id) return
    setTalentSaving(true)
    const supabase = createClient()
    await supabase.from('opportunity_talents').insert({
      opportunity_id: opp.id,
      talent_id: talentForm.talent_id,
      status: talentForm.status,
      notes: talentForm.notes || null,
    })
    setTalentSaving(false)
    setAddTalentOpen(false)
    setTalentForm({ talent_id: '', status: 'proposed', notes: '' })
    router.refresh()
  }

  async function updateTalentStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('opportunity_talents').update({ status }).eq('id', id)
    router.refresh()
  }

  async function removeTalent(id: string) {
    const supabase = createClient()
    await supabase.from('opportunity_talents').delete().eq('id', id)
    router.refresh()
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.name.trim()) return
    setContactSaving(true)
    const supabase = createClient()
    await supabase.from('opportunity_contacts').insert({
      opportunity_id: opp.id,
      name: contactForm.name.trim(),
      email: contactForm.email || null,
      role: contactForm.role || null,
      company: contactForm.company || null,
    })
    setContactSaving(false)
    setAddContactOpen(false)
    setContactForm({ name: '', email: '', role: '', company: '' })
    router.refresh()
  }

  async function removeContact(id: string) {
    const supabase = createClient()
    await supabase.from('opportunity_contacts').delete().eq('id', id)
    router.refresh()
  }

  async function handleAddBlocker(e: React.FormEvent) {
    e.preventDefault()
    if (!blockerForm.description.trim()) return
    setBlockerSaving(true)
    const supabase = createClient()
    await supabase.from('opportunity_blockers').insert({
      opportunity_id: opp.id,
      description: blockerForm.description.trim(),
      due_date: blockerForm.due_date || null,
    })
    setBlockerSaving(false)
    setAddBlockerOpen(false)
    setBlockerForm({ description: '', due_date: '' })
    router.refresh()
  }

  async function toggleBlocker(id: string, resolved: boolean) {
    const supabase = createClient()
    await supabase.from('opportunity_blockers').update({ resolved: !resolved }).eq('id', id)
    router.refresh()
  }

  async function removeBlocker(id: string) {
    const supabase = createClient()
    await supabase.from('opportunity_blockers').delete().eq('id', id)
    router.refresh()
  }

  const netToTalent = opp.gross_fee != null
    ? opp.gross_fee * (1 - opp.commission_pct / 100)
    : null

  const openBlockers = blockers.filter(b => !b.resolved)
  const resolvedBlockers = blockers.filter(b => b.resolved)

  // Talents already on this opportunity (for filtering the add dropdown)
  const addedTalentIds = new Set(oppTalents.map(t => t.talent_id))
  const availableTalents = talents.filter(t => !addedTalentIds.has(t.id))

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Opportunities
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[opp.stage] ?? 'bg-gray-100 text-gray-600')}>
                {STAGES.find(s => s.value === opp.stage)?.label ?? opp.stage}
              </span>
              <span className="text-xs text-gray-400">
                {MC_ROLES.find(r => r.value === opp.mc_role)?.label}
                {' · '}
                {CONSIDERATION_TYPES.find(c => c.value === opp.consideration_type)?.label}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{opp.name}</h1>
            {opp.counterpart_name && (
              <p className="text-sm text-gray-500 mt-0.5">{opp.counterpart_name}</p>
            )}
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left column — deal meta */}
        <div className="space-y-4">
          {/* Fee card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Financials</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Gross fee</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {opp.gross_fee != null ? formatCurrency(opp.gross_fee) : <span className="text-gray-300 text-sm font-normal">Not set</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">MC commission ({opp.commission_pct}%)</dt>
                <dd className="text-sm text-gray-700">
                  {opp.gross_fee != null
                    ? formatCurrency(opp.gross_fee * (opp.commission_pct / 100))
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-xs text-gray-400 mb-0.5">Net to talent</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {netToTalent != null ? formatCurrency(netToTalent) : <span className="text-gray-300">—</span>}
                </dd>
              </div>
            </dl>
          </div>

          {/* Details card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              {opp.event_date && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Event date</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(opp.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </dd>
                </div>
              )}
              {opp.internal_owner && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Internal owner</dt>
                  <dd className="text-sm text-gray-900">{opp.internal_owner}</dd>
                </div>
              )}
              {opp.notes && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Notes</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap">{opp.notes}</dd>
                </div>
              )}
              {!opp.event_date && !opp.internal_owner && !opp.notes && (
                <p className="text-sm text-gray-300">No details added.</p>
              )}
            </dl>
          </div>
        </div>

        {/* Right columns — talent shortlist, contacts, blockers */}
        <div className="col-span-2 space-y-4">

          {/* Talent shortlist */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Talent Shortlist
                {oppTalents.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{oppTalents.length}</span>
                )}
              </h2>
              <button
                onClick={() => setAddTalentOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
                <Plus className="w-3 h-3" /> Add talent
              </button>
            </div>
            {oppTalents.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No talents on this shortlist yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {oppTalents.map(ot => (
                  <div key={ot.id} className="flex items-center justify-between px-5 py-3 group">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/talents/${ot.talent?.id}`}
                        className="text-sm font-medium text-gray-900 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {ot.talent?.name ?? 'Unknown'}
                      </Link>
                      {ot.talent?.ig_followers && (
                        <span className="text-xs text-gray-400">{ot.talent.ig_followers} IG</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={ot.status}
                        onChange={e => updateTalentStatus(ot.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-black/10 cursor-pointer',
                          TALENT_STATUS_COLORS[ot.status] ?? 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {TALENT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeTalent(ot.id)}
                        className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client contacts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Client Contacts
                {contacts.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{contacts.length}</span>
                )}
              </h2>
              <button
                onClick={() => setAddContactOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
                <Plus className="w-3 h-3" /> Add contact
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No client contacts added yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start justify-between px-5 py-3 group">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[c.role, c.company].filter(Boolean).join(' · ')}
                      </p>
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                          {c.email}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => removeContact(c.id)}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blockers / open items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Open Items
                {openBlockers.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    {openBlockers.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setAddBlockerOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            {blockers.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No open items or blockers.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...openBlockers, ...resolvedBlockers].map(b => (
                  <div key={b.id} className="flex items-start gap-3 px-5 py-3 group">
                    <button
                      onClick={() => toggleBlocker(b.id, b.resolved)}
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                        b.resolved
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-500'
                      )}
                    >
                      {b.resolved && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', b.resolved ? 'line-through text-gray-400' : 'text-gray-900')}>
                        {b.description}
                      </p>
                      {b.due_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Due {new Date(b.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeBlocker(b.id)}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit deal modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Opportunity">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Deal name *</label>
            <Input value={form.name} onChange={field('name')} required />
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
              <Input type="number" value={form.commission_pct} onChange={field('commission_pct')} />
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
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim()} className="flex-1">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add talent modal */}
      <Modal open={addTalentOpen} onClose={() => setAddTalentOpen(false)} title="Add to Shortlist">
        <form onSubmit={handleAddTalent} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Talent *</label>
            <Select
              value={talentForm.talent_id}
              onChange={e => setTalentForm(f => ({ ...f, talent_id: e.target.value }))}
              options={availableTalents.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select talent…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select
              value={talentForm.status}
              onChange={e => setTalentForm(f => ({ ...f, status: e.target.value }))}
              options={TALENT_STATUSES}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Input
              value={talentForm.notes}
              onChange={e => setTalentForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Client-proposed, fee agreed…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddTalentOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={talentSaving || !talentForm.talent_id} className="flex-1">
              {talentSaving ? 'Adding…' : 'Add to Shortlist'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add contact modal */}
      <Modal open={addContactOpen} onClose={() => setAddContactOpen(false)} title="Add Client Contact">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name *</label>
            <Input
              value={contactForm.name}
              onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Giada Montano"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Role</label>
              <Input
                value={contactForm.role}
                onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. PR Director"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Company</label>
              <Input
                value={contactForm.company}
                onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                placeholder="e.g. Roberto Cavalli"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={contactForm.email}
              onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@brand.com"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddContactOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={contactSaving || !contactForm.name.trim()} className="flex-1">
              {contactSaving ? 'Saving…' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add blocker modal */}
      <Modal open={addBlockerOpen} onClose={() => setAddBlockerOpen(false)} title="Add Open Item">
        <form onSubmit={handleAddBlocker} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description *</label>
            <Input
              value={blockerForm.description}
              onChange={e => setBlockerForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. ADV usage rights pending from Max Mazza"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Due date</label>
            <Input
              type="date"
              value={blockerForm.due_date}
              onChange={e => setBlockerForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddBlockerOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={blockerSaving || !blockerForm.description.trim()} className="flex-1">
              {blockerSaving ? 'Saving…' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
