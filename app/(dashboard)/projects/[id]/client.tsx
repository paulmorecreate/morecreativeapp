'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Pencil, Plus, Tag } from 'lucide-react'
import { Event, ProjectCategory } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const oppStatusOpts = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const typeOpts = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'carpet', label: 'Red Carpet' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'photoshoot', label: 'Photoshoot' },
  { value: 'cover', label: 'Magazine Cover' },
  { value: 'collaboration', label: 'Collaboration' },
]

const priorityOpts = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const projectStatusOpts = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

type TalentDetail = {
  id: string
  talent_id: string
  carpet_date: string | null
  hotel: string | null
  ticket: string | null
  driver: string | null
  airport_transfer: string | null
  makeup: string | null
  hair: string | null
  dress: string | null
  jewelry: string | null
  shoes: string | null
  content: string | null
  agent_contact: string | null
  extra_notes: string | null
  talent: { id: string; name: string; category: string | null; status: string | null } | null
}

type Opportunity = {
  id: string
  type: string | null
  status: string | null
  talent: { name: string } | null
  brand: { name: string } | null
}

type SimpleRecord = { id: string; name: string }

const emptyScheduleForm = {
  talent_id: '',
  carpet_date: '',
  hotel: '',
  ticket: '',
  driver: '',
  airport_transfer: '',
  makeup: '',
  hair: '',
  dress: '',
  jewelry: '',
  shoes: '',
  content: '',
  agent_contact: '',
  extra_notes: '',
}

type Props = {
  project: Event
  talentDetails: TalentDetail[]
  opportunities: Opportunity[]
  talents: SimpleRecord[]
  brands: SimpleRecord[]
  categories: ProjectCategory[]
}

export function ProjectDetailClient({ project, talentDetails, opportunities, talents, brands, categories }: Props) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: project.name ?? '',
    location: project.location ?? '',
    category: project.category ?? '',
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    status: project.status ?? 'active',
    notes: project.notes ?? '',
  })

  const categoryOpts = categories.map(c => ({ value: c.name, label: c.name }))

  const [scheduleTarget, setScheduleTarget] = useState<null | 'add' | TalentDetail>(null)
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm)

  const [oppOpen, setOppOpen] = useState(false)
  const [oppForm, setOppForm] = useState({
    talent_id: '', brand_id: '', type: '',
    status: 'prospect', priority: 'medium', estimated_value: '',
    follow_up: '', notes: '',
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function schedField(k: keyof typeof scheduleForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setScheduleForm(f => ({ ...f, [k]: e.target.value }))
  }

  function oppField(k: keyof typeof oppForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setOppForm(f => ({ ...f, [k]: e.target.value }))
  }

  function openAddSchedule() {
    setScheduleForm(emptyScheduleForm)
    setScheduleTarget('add')
  }

  function openEditSchedule(detail: TalentDetail) {
    setScheduleForm({
      talent_id: detail.talent_id,
      carpet_date: detail.carpet_date ?? '',
      hotel: detail.hotel ?? '',
      ticket: detail.ticket ?? '',
      driver: detail.driver ?? '',
      airport_transfer: detail.airport_transfer ?? '',
      makeup: detail.makeup ?? '',
      hair: detail.hair ?? '',
      dress: detail.dress ?? '',
      jewelry: detail.jewelry ?? '',
      shoes: detail.shoes ?? '',
      content: detail.content ?? '',
      agent_contact: detail.agent_contact ?? '',
      extra_notes: detail.extra_notes ?? '',
    })
    setScheduleTarget(detail)
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload = {
      talent_id: scheduleForm.talent_id || null,
      event_id: project.id,
      carpet_date: scheduleForm.carpet_date || null,
      hotel: scheduleForm.hotel || null,
      ticket: scheduleForm.ticket || null,
      driver: scheduleForm.driver || null,
      airport_transfer: scheduleForm.airport_transfer || null,
      makeup: scheduleForm.makeup || null,
      hair: scheduleForm.hair || null,
      dress: scheduleForm.dress || null,
      jewelry: scheduleForm.jewelry || null,
      shoes: scheduleForm.shoes || null,
      content: scheduleForm.content || null,
      agent_contact: scheduleForm.agent_contact || null,
      extra_notes: scheduleForm.extra_notes || null,
    }
    if (scheduleTarget === 'add') {
      await supabase.from('talent_event_details').insert(payload)
    } else if (scheduleTarget && typeof scheduleTarget === 'object') {
      await supabase.from('talent_event_details').update(payload).eq('id', scheduleTarget.id)
    }
    setSaving(false)
    setScheduleTarget(null)
    router.refresh()
  }

  async function handleOppSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').insert({
      event_id: project.id,
      talent_id: oppForm.talent_id || null,
      brand_id: oppForm.brand_id || null,
      type: oppForm.type || null,
      status: oppForm.status,
      priority: oppForm.priority,
      estimated_value: oppForm.estimated_value ? parseFloat(oppForm.estimated_value) : null,
      follow_up: oppForm.follow_up || null,
      notes: oppForm.notes || null,
    })
    setSaving(false)
    setOppOpen(false)
    setOppForm({ talent_id: '', brand_id: '', type: '', status: 'prospect', priority: 'medium', estimated_value: '', follow_up: '', notes: '' })
    router.refresh()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('events').update({
      name: form.name || null,
      location: form.location || null,
      category: form.category || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      notes: form.notes || null,
    }).eq('id', project.id)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const isEditing = scheduleTarget !== null && typeof scheduleTarget === 'object'
  const editingTalentName = isEditing ? (scheduleTarget as TalentDetail).talent?.name : null

  return (
    <div>
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
              {project.status === 'completed' && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Completed</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              {project.category && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Tag className="w-3.5 h-3.5" /> {project.category}
                </span>
              )}
              {project.location && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> {project.location}
                </span>
              )}
              {(project.start_date || project.end_date) && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.start_date)}{project.end_date ? ` – ${formatDate(project.end_date)}` : ''}
                </span>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {project.notes && (
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
            </div>
          </div>
        )}

        <div className={project.notes ? 'col-span-2' : 'col-span-3'}>
          {/* Talent Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 mb-5">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Talent Schedule</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{talentDetails.length} talents</span>
                <Button variant="secondary" onClick={openAddSchedule}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Talent
                </Button>
              </div>
            </div>
            {!talentDetails.length && (
              <p className="px-5 py-4 text-sm text-gray-400">No talents added yet. Click "Add Talent" to start building the schedule.</p>
            )}
            {talentDetails.length > 0 && (
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
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {talentDetails.map(detail => (
                      <tr key={detail.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Link href={`/talents/${detail.talent?.id}`} className="font-medium text-gray-900 hover:text-black">
                            {detail.talent?.name ?? '—'}
                          </Link>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge value={detail.talent?.category} />
                            <Badge value={detail.talent?.status} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.carpet_date ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.hotel ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.dress ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.jewelry ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{detail.agent_contact ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditSchedule(detail)} className="text-gray-300 hover:text-gray-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{opportunities.length}</span>
                <Button variant="secondary" onClick={() => setOppOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked to this project.</p>
              )}
              {opportunities.map(opp => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {opp.talent?.name ?? '—'} × {opp.brand?.name ?? '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 capitalize">{opp.type ?? '—'}</div>
                  </div>
                  <Badge value={opp.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Talent Schedule Modal */}
      <Modal
        open={scheduleTarget !== null}
        onClose={() => setScheduleTarget(null)}
        title={isEditing ? `Edit — ${editingTalentName}` : 'Add Talent to Schedule'}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select
                value={scheduleForm.talent_id}
                onChange={schedField('talent_id')}
                options={talents.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select talent…"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Carpet Date</label>
              <Input value={scheduleForm.carpet_date} onChange={schedField('carpet_date')} placeholder="e.g. 14th May, 9PM" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Hotel</label>
              <Input value={scheduleForm.hotel} onChange={schedField('hotel')} placeholder="Hotel name / room" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Ticket</label>
              <Input value={scheduleForm.ticket} onChange={schedField('ticket')} placeholder="Ticket details" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Driver</label>
              <Input value={scheduleForm.driver} onChange={schedField('driver')} placeholder="Driver name / contact" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Airport Transfer</label>
              <Input value={scheduleForm.airport_transfer} onChange={schedField('airport_transfer')} placeholder="Arrival / departure details" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Agent Contact</label>
              <Input value={scheduleForm.agent_contact} onChange={schedField('agent_contact')} placeholder="Name, phone, email" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Dress</label>
              <Input value={scheduleForm.dress} onChange={schedField('dress')} placeholder="Brand / look" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Jewelry</label>
              <Input value={scheduleForm.jewelry} onChange={schedField('jewelry')} placeholder="Brand / pieces" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Shoes</label>
              <Input value={scheduleForm.shoes} onChange={schedField('shoes')} placeholder="Brand / style" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Makeup</label>
              <Input value={scheduleForm.makeup} onChange={schedField('makeup')} placeholder="Artist / brand" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Hair</label>
              <Input value={scheduleForm.hair} onChange={schedField('hair')} placeholder="Stylist / look" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content Plan</label>
            <Input value={scheduleForm.content} onChange={schedField('content')} placeholder="e.g. GRWM, carpet video, BTS" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Extra Notes</label>
            <Textarea value={scheduleForm.extra_notes} onChange={schedField('extra_notes')} rows={2} placeholder="Anything else…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setScheduleTarget(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add to Schedule'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Opportunity Modal */}
      <Modal open={oppOpen} onClose={() => setOppOpen(false)} title="Add Opportunity">
        <form onSubmit={handleOppSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select value={oppForm.talent_id} onChange={oppField('talent_id')} options={talents.map(t => ({ value: t.id, label: t.name }))} placeholder="Select talent…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select value={oppForm.brand_id} onChange={oppField('brand_id')} options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="Select brand…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Type</label>
            <Select value={oppForm.type} onChange={oppField('type')} options={typeOpts} placeholder="Select type…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={oppForm.status} onChange={oppField('status')} options={oppStatusOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Priority</label>
              <Select value={oppForm.priority} onChange={oppField('priority')} options={priorityOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Value (€)</label>
              <Input type="number" value={oppForm.estimated_value} onChange={oppField('estimated_value')} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up</label>
            <Input value={oppForm.follow_up} onChange={oppField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={oppForm.notes} onChange={oppField('notes')} rows={2} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOppOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Add Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Project">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Project Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Location</label>
              <Input value={form.location} onChange={field('location')} placeholder="City, Country" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start Date</label>
              <Input type="date" value={form.start_date} onChange={field('start_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <Input type="date" value={form.end_date} onChange={field('end_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select value={form.status} onChange={field('status')} options={projectStatusOpts} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
