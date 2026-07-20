'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Pencil, Plus, Tag, Trash2, CheckCircle2, Circle, CheckCheck } from 'lucide-react'
import { Event, ProjectCategory } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const projectStatusOpts = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const showTypeOpts = [
  { value: 'Show', label: 'Show' },
  { value: 'Presentation', label: 'Presentation' },
]

const talentStatusOpts = [
  { value: 'In Conversation', label: 'In Conversation' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Rejected', label: 'Rejected' },
]

const dealTypeOpts = [
  { value: 'Organic', label: 'Organic' },
  { value: 'Budget', label: 'Budget' },
]

const CREATIVE_OPTIONS = ['Make Up', 'Hair', 'Photographer']

type ShowTalent = {
  id: string
  talent_id: string
  accepted: boolean
  status: string | null
  deal_type: string | null
  creative: string | null
  stylist_id: string | null
  notes: string | null
  talent: { id: string; name: string; category: string | null } | null
  stylist: { id: string; name: string } | null
}

type BrandShow = {
  id: string
  brand_id: string
  show_date: string | null
  show_time: string | null
  show_type: string | null
  notes: string | null
  brand: { id: string; name: string } | null
  project_brand_talents: ShowTalent[]
}

type ProjectTalent = {
  id: string
  talent_id: string
  notes: string | null
  talent: { id: string; name: string; category: string | null } | null
}

type SimpleRecord = { id: string; name: string }

type DeleteTarget = {
  type: 'show' | 'show-talent' | 'project-talent'
  id: string
  label: string
  warning?: string
}

type Props = {
  project: Event
  talents: SimpleRecord[]
  brands: SimpleRecord[]
  categories: ProjectCategory[]
  brandShows: BrandShow[]
  stylists: SimpleRecord[]
  projectTalents: ProjectTalent[]
}

const EMPTY_TALENT_FORM = {
  talent_id: '',
  status: 'In Conversation',
  deal_type: '',
  creative: [] as string[],
  stylist_id: '',
  accepted: false,
  notes: '',
}

export function ProjectDetailClient({ project, talents, brands, categories, brandShows, stylists, projectTalents }: Props) {
  const router = useRouter()

  // Project edit
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

  // Brand show modal
  const [showModal, setShowModal] = useState<null | 'add' | BrandShow>(null)
  const [showForm, setShowForm] = useState({ brand_id: '', show_type: '', show_date: '', show_time: '', notes: '' })

  // Brand show — talent modal
  const [talentModal, setTalentModal] = useState<null | { projectBrandId: string; entry?: ShowTalent }>(null)
  const [talentForm, setTalentForm] = useState(EMPTY_TALENT_FORM)

  // Project-level talent modal
  const [projectTalentModal, setProjectTalentModal] = useState<null | 'add' | ProjectTalent>(null)
  const [projectTalentForm, setProjectTalentForm] = useState({ talent_id: '', notes: '' })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }
  function showField(k: keyof typeof showForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setShowForm(f => ({ ...f, [k]: e.target.value }))
  }
  function talentField(k: keyof Omit<typeof talentForm, 'creative' | 'accepted'>) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setTalentForm(f => ({ ...f, [k]: e.target.value }))
  }
  function toggleCreative(opt: string) {
    setTalentForm(f => ({
      ...f,
      creative: f.creative.includes(opt)
        ? f.creative.filter(c => c !== opt)
        : [...f.creative, opt],
    }))
  }
  function projectTalentField(k: keyof typeof projectTalentForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setProjectTalentForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function toggleCompleted() {
    const supabase = createClient()
    await supabase.from('events').update({
      status: project.status === 'completed' ? 'active' : 'completed',
    }).eq('id', project.id)
    router.refresh()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    await supabase.from('events').update({
      name: form.name || null, location: form.location || null,
      category: form.category || null, start_date: form.start_date || null,
      end_date: form.end_date || null, status: form.status, notes: form.notes || null,
    }).eq('id', project.id)
    setSaving(false); setOpen(false); router.refresh()
  }

  // Brand show handlers
  function openAddShow() {
    setShowForm({ brand_id: '', show_type: '', show_date: '', show_time: '', notes: '' })
    setShowModal('add')
  }
  function openEditShow(show: BrandShow) {
    setShowForm({
      brand_id: show.brand_id,
      show_type: show.show_type ?? '',
      show_date: show.show_date ?? '',
      show_time: show.show_time ?? '',
      notes: show.notes ?? '',
    })
    setShowModal(show)
  }
  async function handleShowSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    const payload = {
      project_id: project.id,
      brand_id: showForm.brand_id || null,
      show_type: showForm.show_type || null,
      show_date: showForm.show_date || null,
      show_time: showForm.show_time || null,
      notes: showForm.notes || null,
    }
    if (showModal === 'add') {
      await supabase.from('project_brands').insert(payload)
    } else if (showModal && typeof showModal === 'object') {
      await supabase.from('project_brands').update(payload).eq('id', showModal.id)
    }
    setSaving(false); setShowModal(null); router.refresh()
  }
  function deleteShow(show: BrandShow) {
    setDeleteTarget({
      type: 'show',
      id: show.id,
      label: show.brand?.name ?? 'this brand',
      warning: 'All talents linked to this show will also be removed.',
    })
  }

  // Brand show — talent handlers
  function openAddTalent(projectBrandId: string) {
    setTalentForm(EMPTY_TALENT_FORM)
    setTalentModal({ projectBrandId })
  }
  function openEditTalent(projectBrandId: string, entry: ShowTalent) {
    setTalentForm({
      talent_id: entry.talent_id,
      status: entry.status ?? 'In Conversation',
      deal_type: entry.deal_type ?? '',
      creative: entry.creative ? entry.creative.split(',').map(s => s.trim()).filter(Boolean) : [],
      stylist_id: entry.stylist_id ?? '',
      accepted: entry.accepted,
      notes: entry.notes ?? '',
    })
    setTalentModal({ projectBrandId, entry })
  }
  async function handleTalentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!talentModal) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      project_brand_id: talentModal.projectBrandId,
      talent_id: talentForm.talent_id || null,
      status: talentForm.status || null,
      deal_type: talentForm.deal_type || null,
      creative: talentForm.creative.length > 0 ? talentForm.creative.join(', ') : null,
      stylist_id: talentForm.stylist_id || null,
      accepted: talentForm.accepted,
      notes: talentForm.notes || null,
    }
    if (talentModal.entry) {
      await supabase.from('project_brand_talents').update(payload).eq('id', talentModal.entry.id)
    } else {
      await supabase.from('project_brand_talents').insert(payload)
    }
    setSaving(false); setTalentModal(null); router.refresh()
  }
  function removeTalentFromShow(entry: ShowTalent, brandName: string) {
    setDeleteTarget({
      type: 'show-talent',
      id: entry.id,
      label: `${entry.talent?.name ?? 'this talent'} from ${brandName}`,
    })
  }
  async function toggleAccepted(entry: ShowTalent) {
    const supabase = createClient()
    await supabase.from('project_brand_talents').update({ accepted: !entry.accepted }).eq('id', entry.id)
    router.refresh()
  }

  // Project-level talent handlers
  function openAddProjectTalent() {
    setProjectTalentForm({ talent_id: '', notes: '' })
    setProjectTalentModal('add')
  }
  function openEditProjectTalent(pt: ProjectTalent) {
    setProjectTalentForm({ talent_id: pt.talent_id, notes: pt.notes ?? '' })
    setProjectTalentModal(pt)
  }
  async function handleProjectTalentSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    const payload = {
      project_id: project.id,
      talent_id: projectTalentForm.talent_id || null,
      notes: projectTalentForm.notes || null,
    }
    if (projectTalentModal === 'add') {
      await supabase.from('project_talents').insert(payload)
    } else if (projectTalentModal && typeof projectTalentModal === 'object') {
      await supabase.from('project_talents').update(payload).eq('id', projectTalentModal.id)
    }
    setSaving(false); setProjectTalentModal(null); router.refresh()
  }
  function removeProjectTalent(pt: ProjectTalent) {
    setDeleteTarget({
      type: 'project-talent',
      id: pt.id,
      label: pt.talent?.name ?? 'this talent',
    })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    if (deleteTarget.type === 'show') {
      await supabase.from('project_brands').delete().eq('id', deleteTarget.id)
    } else if (deleteTarget.type === 'show-talent') {
      await supabase.from('project_brand_talents').delete().eq('id', deleteTarget.id)
    } else if (deleteTarget.type === 'project-talent') {
      await supabase.from('project_talents').delete().eq('id', deleteTarget.id)
    }
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const isEditingShow = showModal !== null && typeof showModal === 'object'
  const isEditingProjectTalent = projectTalentModal !== null && typeof projectTalentModal === 'object'
  const stylistOpts = stylists.map(s => ({ value: s.id, label: s.name }))

  function availableTalentsForShow(show: BrandShow) {
    const linked = new Set(show.project_brand_talents.map(t => t.talent_id))
    return talents.filter(t => !linked.has(t.id))
  }

  const linkedProjectTalentIds = new Set(projectTalents.map(pt => pt.talent_id))
  const availableProjectTalents = talents.filter(t => !linkedProjectTalentIds.has(t.id))

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Projects
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
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toggleCompleted}>
              <CheckCheck className="w-3.5 h-3.5" />
              {project.status === 'completed' ? 'Mark as Active' : 'Mark as Completed'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {project.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* ── Lineup ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Lineup</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openAddProjectTalent}>
              <Plus className="w-3.5 h-3.5" /> Add Talent
            </Button>
            <Button variant="secondary" onClick={openAddShow}>
              <Plus className="w-3.5 h-3.5" /> Add Brand
            </Button>
          </div>
        </div>

        {brandShows.length === 0 && projectTalents.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
            No lineup yet. Add a brand or talent to get started.
          </div>
        )}

        <div className="space-y-3">
          {/* Brand cards — sky blue accent */}
          {brandShows.map(show => (
            <div key={show.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-600 bg-sky-500">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/brands/${show.brand?.id}`} className="text-sm font-semibold text-white hover:text-sky-100">
                    {show.brand?.name ?? '—'}
                  </Link>
                  {show.show_type && (
                    <span className="text-xs font-medium text-sky-100 bg-sky-600/60 px-2 py-0.5 rounded-full">
                      {show.show_type}
                    </span>
                  )}
                  {show.show_date && (
                    <span className="text-xs text-sky-100 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(show.show_date)}
                      {show.show_time && <span className="ml-1 text-sky-200">· {show.show_time}</span>}
                    </span>
                  )}
                  {show.notes && (
                    <span className="text-xs text-sky-200 truncate max-w-xs">{show.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openAddTalent(show.id)}
                    className="inline-flex items-center gap-1 text-xs text-sky-100 hover:text-white px-2 py-1 rounded hover:bg-sky-600/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Talent
                  </button>
                  <button onClick={() => openEditShow(show)} className="text-sky-200 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteShow(show)} className="text-sky-200 hover:text-red-200 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {show.project_brand_talents.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-400">No talents added to this show yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Talent</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Deal</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Creative</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Stylist</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Accepted</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</th>
                      <th className="px-4 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {show.project_brand_talents.map(entry => (
                      <tr key={entry.id} className="group hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <Link href={`/talents/${entry.talent?.id}`} className="font-medium text-gray-900 hover:text-black">
                            {entry.talent?.name ?? '—'}
                          </Link>
                          {entry.talent?.category && (
                            <div className="mt-0.5"><Badge value={entry.talent.category} /></div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <TalentStatusBadge value={entry.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {entry.deal_type ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {entry.creative ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {entry.stylist?.name ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleAccepted(entry)}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              entry.accepted ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {entry.accepted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            {entry.accepted ? 'Yes' : 'Pending'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">
                          {entry.notes ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditTalent(show.id, entry)} className="text-gray-300 hover:text-gray-600">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeTalentFromShow(entry, show.brand?.name ?? '')} className="text-gray-300 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* Talent cards — violet accent */}
          {projectTalents.map(pt => (
            <div key={pt.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-violet-500">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/talents/${pt.talent?.id}`} className="text-sm font-semibold text-white hover:text-violet-100">
                    {pt.talent?.name ?? '—'}
                  </Link>
                  {pt.talent?.category && (
                    <span className="text-xs font-medium text-violet-100 bg-violet-600/60 px-2 py-0.5 rounded-full">
                      {pt.talent.category}
                    </span>
                  )}
                  {pt.notes && (
                    <span className="text-xs text-violet-200 truncate max-w-xs">{pt.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditProjectTalent(pt)} className="text-violet-200 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeProjectTalent(pt)} className="text-violet-200 hover:text-red-200 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Add/Edit Brand */}
      <Modal
        open={showModal !== null}
        onClose={() => setShowModal(null)}
        title={isEditingShow ? 'Edit Brand' : 'Add Brand'}
      >
        <form onSubmit={handleShowSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <Select
                value={showForm.brand_id}
                onChange={showField('brand_id')}
                options={brands.map(b => ({ value: b.id, label: b.name }))}
                placeholder="Select brand…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select
                value={showForm.show_type}
                onChange={showField('show_type')}
                options={showTypeOpts}
                placeholder="Show or Presentation…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Show Date</label>
              <Input type="date" value={showForm.show_date} onChange={showField('show_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Show Time</label>
              <Input value={showForm.show_time} onChange={showField('show_time')} placeholder="e.g. 2:30 PM" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={showForm.notes} onChange={showField('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : isEditingShow ? 'Save Changes' : 'Add Brand'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Talent to Brand Show */}
      <Modal
        open={talentModal !== null}
        onClose={() => setTalentModal(null)}
        title={talentModal?.entry ? `Edit — ${talentModal.entry.talent?.name}` : 'Add Talent to Show'}
      >
        <form onSubmit={handleTalentSubmit} className="space-y-4">
          {!talentModal?.entry && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select
                value={talentForm.talent_id}
                onChange={talentField('talent_id')}
                options={
                  talentModal
                    ? availableTalentsForShow(brandShows.find(s => s.id === talentModal.projectBrandId)!).map(t => ({ value: t.id, label: t.name }))
                    : []
                }
                placeholder="Select talent…"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={talentForm.status} onChange={talentField('status')} options={talentStatusOpts} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Deal Type</label>
              <Select value={talentForm.deal_type} onChange={talentField('deal_type')} options={dealTypeOpts} placeholder="Select…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Creative</label>
            <div className="flex items-center gap-4">
              {CREATIVE_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={talentForm.creative.includes(opt)}
                    onChange={() => toggleCreative(opt)}
                    className="rounded border-gray-300 accent-black"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Stylist</label>
            <Select
              value={talentForm.stylist_id}
              onChange={talentField('stylist_id')}
              options={stylistOpts}
              placeholder={stylists.length ? 'Select stylist…' : 'No stylists in directory yet'}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={talentForm.notes} onChange={talentField('notes')} rows={2} placeholder="Any notes…" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none pt-1 border-t border-gray-100">
            <input
              type="checkbox"
              checked={talentForm.accepted}
              onChange={e => setTalentForm(f => ({ ...f, accepted: e.target.checked }))}
              className="rounded border-gray-300 w-4 h-4 accent-black"
            />
            <span className="text-sm text-gray-700">Brand has accepted this talent</span>
          </label>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setTalentModal(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || (!talentModal?.entry && !talentForm.talent_id)} className="flex-1">
              {saving ? 'Saving…' : talentModal?.entry ? 'Save Changes' : 'Add Talent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Project-level Talent */}
      <Modal
        open={projectTalentModal !== null}
        onClose={() => setProjectTalentModal(null)}
        title={isEditingProjectTalent ? 'Edit Talent' : 'Add Talent to Project'}
      >
        <form onSubmit={handleProjectTalentSubmit} className="space-y-4">
          {!isEditingProjectTalent && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select
                value={projectTalentForm.talent_id}
                onChange={projectTalentField('talent_id')}
                options={availableProjectTalents.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select talent…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={projectTalentForm.notes} onChange={projectTalentField('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setProjectTalentModal(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || (!isEditingProjectTalent && !projectTalentForm.talent_id)} className="flex-1">
              {saving ? 'Saving…' : isEditingProjectTalent ? 'Save Changes' : 'Add Talent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Confirm removal">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Remove <strong>{deleteTarget?.label}</strong>? This cannot be undone.
          </p>
          {deleteTarget?.warning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {deleteTarget.warning}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={deleting} onClick={handleConfirmDelete} className="flex-1">
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </div>
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

function TalentStatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>
  const styles: Record<string, string> = {
    'Confirmed': 'bg-emerald-50 text-emerald-700',
    'In Conversation': 'bg-amber-50 text-amber-700',
    'Rejected': 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${styles[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  )
}
