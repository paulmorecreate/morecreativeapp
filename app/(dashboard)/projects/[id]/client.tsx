'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Pencil, Plus, Tag, Trash2, X, CheckCircle2, Circle, CheckCheck, AlertTriangle, Receipt, GripVertical, Loader2 } from 'lucide-react'
import { Event, ProjectCategory, Invoice } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'

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

type TalentNote = { id: string; content: string; created_at: string }

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
  project_brand_talent_notes?: TalentNote[]
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
  project_talent_notes?: TalentNote[]
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
  invoices: Invoice[]
  canViewFinance: boolean
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

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
}

function fmtAmount(currency: string, amount: number) {
  return `${CURRENCY_SYMBOL[currency] ?? ''}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function ProjectFinanceTab({ projectId, invoices: initial }: { projectId: string; invoices: Invoice[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [creating, setCreating] = useState(false)

  async function handleNew() {
    setCreating(true)
    const year = new Date().getFullYear()
    const { data: last } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    let seq = 1
    if (last?.invoice_number) {
      const parts = last.invoice_number.split('-')
      seq = (parseInt(parts[1] ?? '0', 10) || 0) + 1
    }
    const invoice_number = `${year}-${String(seq).padStart(4, '0')}`

    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({ invoice_number, project_id: projectId, status: 'draft' })
      .select()
      .single()

    setCreating(false)
    if (!error && inv) router.push(`/finance/${inv.id}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        <Button variant="secondary" onClick={handleNew} disabled={creating}>
          <Plus className="w-3.5 h-3.5" />
          {creating ? 'Creating…' : 'New Invoice'}
        </Button>
      </div>
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-10 text-center">
          <Receipt className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No invoices for this project yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Billed To</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Amount Due</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map(inv => {
                const subtotal = 0 // line items not fetched here — show total from stored data
                return (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/finance/${inv.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {inv.billed_to_name ?? <span className="text-gray-300">—</span>}
                      {inv.billed_to_company && <span className="block text-xs text-gray-400">{inv.billed_to_company}</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {inv.currency}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_BADGE[inv.status] ?? '')}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function ProjectDetailClient({ project, talents, brands, categories, brandShows, stylists, projectTalents, invoices, canViewFinance }: Props) {
  const router = useRouter()

  // Tab
  const [tab, setTab] = useState<'overview' | 'finance'>('overview')

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

  // Quick-add talent from pool to show
  const [quickAddShowId, setQuickAddShowId] = useState<string | null>(null)
  const [assigningShowId, setAssigningShowId] = useState<string | null>(null)

  // Clear assigning state once the server refresh delivers updated brandShows
  useEffect(() => { setAssigningShowId(null) }, [brandShows])

  // Project-level talent modal (add only)
  const [projectTalentModal, setProjectTalentModal] = useState(false)
  const [projectTalentForm, setProjectTalentForm] = useState({ talent_id: '' })

  // Drag-and-drop talent → show
  const [draggingTalentId, setDraggingTalentId] = useState<string | null>(null)
  const [dragOverShowId, setDragOverShowId] = useState<string | null>(null)
  const [dragDuplicateShowId, setDragDuplicateShowId] = useState<string | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Delete project
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }
  function showField(k: keyof typeof showForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setShowForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleDeleteProject() {
    setDeletingProject(true)
    const supabase = createClient()
    await supabase.from('events').delete().eq('id', project.id)
    router.push('/projects')
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

  function removeTalentFromShow(entry: ShowTalent, brandName: string) {
    setDeleteTarget({
      type: 'show-talent',
      id: entry.id,
      label: `${entry.talent?.name ?? 'this talent'} from ${brandName}`,
    })
  }

  async function assignTalentToShow(show: BrandShow, talentId: string) {
    setQuickAddShowId(null)
    if (show.project_brand_talents.some(t => t.talent_id === talentId)) return
    setAssigningShowId(show.id)
    const supabase = createClient()
    await supabase.from('project_brand_talents').insert({
      project_brand_id: show.id,
      talent_id: talentId,
      status: 'In Conversation',
      accepted: false,
    })
    router.refresh()
  }

  // Project-level talent handlers
  function openAddProjectTalent() {
    setProjectTalentForm({ talent_id: '' })
    setProjectTalentModal(true)
  }
  async function handleProjectTalentSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    await supabase.from('project_talents').insert({
      project_id: project.id,
      talent_id: projectTalentForm.talent_id || null,
    })
    setSaving(false); setProjectTalentModal(false); router.refresh()
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

  async function handleDrop(show: BrandShow) {
    if (!draggingTalentId) return
    if (show.project_brand_talents.some(t => t.talent_id === draggingTalentId)) {
      setDragDuplicateShowId(show.id)
      setTimeout(() => setDragDuplicateShowId(null), 1500)
      return
    }
    await assignTalentToShow(show, draggingTalentId)
  }

  const isEditingShow = showModal !== null && typeof showModal === 'object'
  const stylistOpts = stylists.map(s => ({ value: s.id, label: s.name }))

  function poolTalentsForShow(show: BrandShow) {
    const linked = new Set(show.project_brand_talents.map(t => t.talent_id))
    return projectTalents.filter(pt => pt.talent_id && !linked.has(pt.talent_id))
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
            <Button variant="secondary" onClick={() => setDeleteProjectOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      {canViewFinance && (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['overview', 'finance'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'finance' && canViewFinance && (
        <ProjectFinanceTab projectId={project.id} invoices={invoices} />
      )}

      {(tab === 'overview' || !canViewFinance) && (
        <>
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
            <div
              key={show.id}
              className={cn(
                'bg-white rounded-xl border overflow-hidden transition-all',
                dragDuplicateShowId === show.id
                  ? 'border-amber-400 ring-2 ring-amber-100'
                  : dragOverShowId === show.id && draggingTalentId
                  ? 'border-sky-400 ring-2 ring-sky-100'
                  : 'border-gray-200'
              )}
              onDragOver={e => { e.preventDefault(); if (draggingTalentId) setDragOverShowId(show.id) }}
              onDragEnter={e => { e.preventDefault(); if (draggingTalentId) setDragOverShowId(show.id) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverShowId(null) }}
              onDrop={e => { e.preventDefault(); handleDrop(show); setDragOverShowId(null) }}
            >
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
                  <div className="relative">
                    <button
                      onClick={() => setQuickAddShowId(quickAddShowId === show.id ? null : show.id)}
                      className="inline-flex items-center gap-1 text-xs text-sky-100 hover:text-white px-2 py-1 rounded hover:bg-sky-600/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Talent
                    </button>
                    {quickAddShowId === show.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setQuickAddShowId(null)} />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 max-h-64 overflow-y-auto">
                          {poolTalentsForShow(show).length === 0 ? (
                            <p className="text-xs text-gray-400 px-3 py-2">
                              {projectTalents.length === 0 ? 'No talents in pool yet' : 'All pool talents already added'}
                            </p>
                          ) : (
                            poolTalentsForShow(show).map(pt => (
                              <button
                                key={pt.id}
                                type="button"
                                onClick={() => assignTalentToShow(show, pt.talent_id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <span className="font-medium">{pt.talent?.name}</span>
                                {pt.talent?.category && (
                                  <span className="text-xs text-gray-400">{pt.talent.category}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={() => openEditShow(show)} className="text-sky-200 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteShow(show)} className="text-sky-200 hover:text-red-200 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {assigningShowId === show.id && (
                <div className="px-5 py-3 flex items-center justify-center gap-2 bg-sky-500 text-white text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding to show…
                </div>
              )}
              {dragOverShowId === show.id && draggingTalentId && assigningShowId !== show.id && (
                <div className={cn(
                  'px-5 py-2 text-xs font-medium text-center',
                  dragDuplicateShowId === show.id ? 'text-amber-600 bg-amber-50' : 'text-sky-600 bg-sky-50'
                )}>
                  {dragDuplicateShowId === show.id
                    ? 'Already in this show'
                    : `Drop to add ${projectTalents.find(pt => pt.talent_id === draggingTalentId)?.talent?.name ?? 'talent'}`}
                </div>
              )}
              {show.project_brand_talents.length === 0 ? (
                <p className="px-5 py-3 text-xs text-gray-400">No talents added yet. Drag a talent here or use + Add Talent.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Talent</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Deal</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Creative</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Stylist</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</th>
                      <th className="px-4 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {show.project_brand_talents.map(entry => (
                      <InlineShowTalentRow
                        key={entry.id}
                        entry={entry}
                        stylists={stylists}
                        onRemove={() => removeTalentFromShow(entry, show.brand?.name ?? '')}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* Talent pool — table with drag handles */}
          {projectTalents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-violet-600 bg-violet-500">
                <span className="text-sm font-semibold text-white">Talent Pool</span>
                {brandShows.length > 0 && (
                  <span className="text-xs text-violet-200 flex items-center gap-1">
                    <GripVertical className="w-3 h-3" /> Drag onto a show to assign
                  </span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="w-8 px-3 py-2" />
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Talent</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projectTalents.map(pt => (
                    <InlineProjectTalentRow
                      key={pt.id}
                      pt={pt}
                      isDragging={draggingTalentId === pt.talent_id}
                      brandShows={brandShows}
                      onDragStart={() => setDraggingTalentId(pt.talent_id ?? null)}
                      onDragEnd={() => { setDraggingTalentId(null); setDragOverShowId(null) }}
                      onAssignToShow={show => assignTalentToShow(show, pt.talent_id)}
                      onRemove={() => removeProjectTalent(pt)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
        </>
      )}

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

      {/* Add Talent to Project Pool */}
      <Modal
        open={projectTalentModal}
        onClose={() => setProjectTalentModal(false)}
        title="Add Talent to Project"
      >
        <form onSubmit={handleProjectTalentSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Talent</label>
            <Select
              value={projectTalentForm.talent_id}
              onChange={e => setProjectTalentForm({ talent_id: e.target.value })}
              options={availableProjectTalents.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select talent…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setProjectTalentModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !projectTalentForm.talent_id} className="flex-1">
              {saving ? 'Adding…' : 'Add to Project'}
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

      {/* Delete Project */}
      <Modal open={deleteProjectOpen} onClose={() => setDeleteProjectOpen(false)} title="Delete Project">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will permanently delete <strong>{project.name}</strong> and all associated brand shows and talent entries. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteProjectOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDeleteProject} disabled={deletingProject} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">
              {deletingProject ? 'Deleting…' : 'Delete Project'}
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

const CREATIVE_ABBREV: Record<string, string> = {
  'Make Up': 'MU',
  'Hair': 'H',
  'Photographer': 'Ph',
}

function InlineShowTalentRow({
  entry,
  stylists,
  onRemove,
}: {
  entry: ShowTalent
  stylists: SimpleRecord[]
  onRemove: () => void
}) {
  const supabase = createClient()
  const [status, setStatus] = useState(entry.status ?? '')
  const [dealType, setDealType] = useState(entry.deal_type ?? '')
  const [creative, setCreative] = useState<string[]>(
    entry.creative ? entry.creative.split(',').map(s => s.trim()).filter(Boolean) : []
  )
  const [stylistId, setStylistId] = useState(entry.stylist_id ?? '')
  const [notesList, setNotesList] = useState<TalentNote[]>(
    [...(entry.project_brand_talent_notes ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [typingNote, setTypingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')

  async function save(data: Record<string, unknown>) {
    await supabase.from('project_brand_talents').update(data).eq('id', entry.id)
  }

  function toggleCreative(opt: string) {
    const next = creative.includes(opt) ? creative.filter(c => c !== opt) : [...creative, opt]
    setCreative(next)
    save({ creative: next.length ? next.join(', ') : null })
  }

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const { data } = await supabase
      .from('project_brand_talent_notes')
      .insert({ project_brand_talent_id: entry.id, content: newNote.trim() })
      .select()
      .single()
    if (data) setNotesList(prev => [...prev, data as TalentNote])
    setNewNote('')
    setTypingNote(false)
    setAddingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('project_brand_talent_notes').delete().eq('id', noteId)
    setNotesList(prev => prev.filter(n => n.id !== noteId))
  }

  function startEditNote(note: TalentNote) {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
  }

  async function saveEditNote(noteId: string) {
    const content = editingNoteContent.trim()
    if (!content) return
    await supabase.from('project_brand_talent_notes').update({ content }).eq('id', noteId)
    setNotesList(prev => prev.map(n => n.id === noteId ? { ...n, content } : n))
    setEditingNoteId(null)
  }

  function cancelEditNote() {
    setEditingNoteId(null)
    setEditingNoteContent('')
  }

  return (
    <tr className="group border-b border-gray-50 hover:bg-gray-50/40 align-top">
      {/* Talent */}
      <td className="px-5 py-2.5 min-w-[140px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/talents/${entry.talent?.id}`} className="font-medium text-sm text-gray-900 hover:text-black">
            {entry.talent?.name ?? '—'}
          </Link>
          {entry.talent?.category && <Badge value={entry.talent.category} />}
          {!typingNote && (
            <button type="button" onClick={() => setTypingNote(true)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              + note
            </button>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5 min-w-[110px]">
        <select
          value={status}
          onChange={e => { const v = e.target.value; setStatus(v); save({ status: v || null }) }}
          className={cn(
            'text-xs rounded-full px-2 py-0.5 border font-medium focus:outline-none cursor-pointer w-full',
            status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
            status === 'In Conversation' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-gray-100 text-gray-500 border-gray-200'
          )}
        >
          <option value="">—</option>
          {talentStatusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>

      {/* Deal */}
      <td className="px-4 py-2.5 min-w-[90px]">
        <select
          value={dealType}
          onChange={e => { const v = e.target.value; setDealType(v); save({ deal_type: v || null }) }}
          className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none cursor-pointer text-gray-600 bg-transparent w-full"
        >
          <option value="">—</option>
          {dealTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>

      {/* Creative — abbreviated pills */}
      <td className="px-4 py-2.5">
        <div className="flex gap-1">
          {CREATIVE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              title={opt}
              onClick={() => toggleCreative(opt)}
              className={cn(
                'text-xs px-1.5 py-0.5 rounded border transition-all font-medium',
                creative.includes(opt)
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'text-gray-300 border-gray-200 hover:text-gray-500 hover:border-gray-300'
              )}
            >
              {CREATIVE_ABBREV[opt] ?? opt}
            </button>
          ))}
        </div>
      </td>

      {/* Stylist */}
      <td className="px-4 py-2.5 min-w-[100px]">
        <select
          value={stylistId}
          onChange={e => { const v = e.target.value; setStylistId(v); save({ stylist_id: v || null }) }}
          className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none cursor-pointer text-gray-600 bg-transparent w-full"
        >
          <option value="">—</option>
          {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        <div className="space-y-0.5 min-w-[160px]">
          {notesList.map(note => (
            <div key={note.id} className="flex items-center gap-1">
              {editingNoteId === note.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingNoteContent}
                  onChange={e => setEditingNoteContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEditNote(note.id) }
                    if (e.key === 'Escape') { e.preventDefault(); cancelEditNote() }
                  }}
                  onBlur={() => saveEditNote(note.id)}
                  className="text-xs flex-1 border-b border-gray-400 focus:border-gray-600 focus:outline-none bg-transparent py-0.5 min-w-0"
                />
              ) : (
                <span onClick={() => startEditNote(note)} title={note.content} className="text-xs text-gray-700 flex-1 cursor-text hover:text-gray-900">
                  {note.content}
                </span>
              )}
              {editingNoteId !== note.id && (
                <button type="button" onClick={() => deleteNote(note.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {typingNote && (
            <input
              autoFocus
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addNote() }
                if (e.key === 'Escape') { setTypingNote(false); setNewNote('') }
              }}
              onBlur={() => { if (!newNote.trim()) setTypingNote(false) }}
              placeholder="Type and press Enter…"
              className="text-xs w-full border-b border-gray-300 focus:border-gray-500 focus:outline-none bg-transparent py-0.5"
              disabled={addingNote}
            />
          )}
        </div>
      </td>

      {/* Remove talent from show */}
      <td className="px-4 py-2.5 w-10">
        <button
          type="button"
          onClick={onRemove}
          title="Remove from show"
          className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
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

function InlineProjectTalentRow({
  pt,
  isDragging,
  brandShows,
  onDragStart,
  onDragEnd,
  onAssignToShow,
  onRemove,
}: {
  pt: ProjectTalent
  isDragging: boolean
  brandShows: BrandShow[]
  onDragStart: () => void
  onDragEnd: () => void
  onAssignToShow: (show: BrandShow) => void
  onRemove: () => void
}) {
  const supabase = createClient()
  const [notesList, setNotesList] = useState<TalentNote[]>(
    [...(pt.project_talent_notes ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [typingNote, setTypingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const availableShows = brandShows.filter(
    s => !s.project_brand_talents.some(t => t.talent_id === pt.talent_id)
  )

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const { data } = await supabase
      .from('project_talent_notes')
      .insert({ project_talent_id: pt.id, content: newNote.trim() })
      .select()
      .single()
    if (data) setNotesList(prev => [...prev, data as TalentNote])
    setNewNote('')
    setTypingNote(false)
    setAddingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('project_talent_notes').delete().eq('id', noteId)
    setNotesList(prev => prev.filter(n => n.id !== noteId))
  }

  function startEditNote(note: TalentNote) {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
  }

  async function saveEditNote(noteId: string) {
    const content = editingNoteContent.trim()
    if (!content) return
    await supabase.from('project_talent_notes').update({ content }).eq('id', noteId)
    setNotesList(prev => prev.map(n => n.id === noteId ? { ...n, content } : n))
    setEditingNoteId(null)
  }

  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group border-b border-gray-50 hover:bg-gray-50/40 align-top transition-opacity',
        isDragging ? 'opacity-40' : ''
      )}
    >
      {/* Drag handle */}
      <td className="px-3 py-3 w-8">
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
      </td>

      {/* Talent */}
      <td className="px-4 py-2.5 min-w-[180px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/talents/${pt.talent?.id}`} className="font-medium text-sm text-gray-900 hover:text-black">
            {pt.talent?.name ?? '—'}
          </Link>
          {pt.talent?.category && <Badge value={pt.talent.category} />}
          {!typingNote && (
            <button type="button" onClick={() => setTypingNote(true)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              + note
            </button>
          )}
        </div>
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        <div className="space-y-0.5 min-w-[200px]">
          {notesList.map(note => (
            <div key={note.id} className="flex items-center gap-1">
              {editingNoteId === note.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingNoteContent}
                  onChange={e => setEditingNoteContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEditNote(note.id) }
                    if (e.key === 'Escape') { setEditingNoteId(null) }
                  }}
                  onBlur={() => saveEditNote(note.id)}
                  className="text-xs flex-1 border-b border-gray-400 focus:border-gray-600 focus:outline-none bg-transparent py-0.5 min-w-0"
                />
              ) : (
                <span onClick={() => startEditNote(note)} title={note.content} className="text-xs text-gray-700 flex-1 cursor-text hover:text-gray-900">
                  {note.content}
                </span>
              )}
              {editingNoteId !== note.id && (
                <button type="button" onClick={() => deleteNote(note.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {typingNote && (
            <input
              autoFocus
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addNote() }
                if (e.key === 'Escape') { setTypingNote(false); setNewNote('') }
              }}
              onBlur={() => { if (!newNote.trim()) setTypingNote(false) }}
              placeholder="Type and press Enter…"
              className="text-xs w-full border-b border-gray-300 focus:border-gray-500 focus:outline-none bg-transparent py-0.5"
              disabled={addingNote}
            />
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 min-w-[120px]">
        <div className="flex items-center gap-2">
          {/* Assign to show */}
          {brandShows.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker(p => !p)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors whitespace-nowrap',
                  availableShows.length === 0
                    ? 'text-gray-300 border-gray-200 cursor-default'
                    : 'text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100'
                )}
                disabled={availableShows.length === 0}
                title={availableShows.length === 0 ? 'Already in all shows' : 'Add to a Brand / Show'}
              >
                <Plus className="w-3 h-3" /> Add to Show
              </button>
              {showPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 max-h-64 overflow-y-auto">
                    <p className="text-xs text-gray-400 px-3 pt-1.5 pb-1 font-medium uppercase tracking-wide">Assign to show</p>
                    {availableShows.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2">Already in all shows</p>
                    ) : (
                      availableShows.map(show => (
                        <button
                          key={show.id}
                          type="button"
                          onClick={() => { onAssignToShow(show); setShowPicker(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="font-medium">{show.brand?.name ?? '—'}</span>
                          {show.show_date && (
                            <span className="text-xs text-gray-400">{formatDate(show.show_date)}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            title="Remove from project"
            className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
