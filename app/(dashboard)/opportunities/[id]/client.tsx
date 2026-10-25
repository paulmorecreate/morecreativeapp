'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, X, Trash2, FolderOpen, Link2, ExternalLink } from 'lucide-react'
import { Opportunity, OpportunityTalent, Conversation, McRole, ProjectCategory, OpportunityDocument } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { TALENT_STATUSES } from '../client'

type SimpleRecord = { id: string; name: string }

const TALENT_STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-zinc-100 text-zinc-600',
  approached: 'bg-blue-50 text-blue-700',
  declined: 'bg-red-50 text-red-600',
  confirmed: 'bg-green-50 text-green-700',
}

const channelOpts = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
]

const convoStatusOpts = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

type Props = {
  opp: Opportunity
  oppTalents: OpportunityTalent[]
  conversations: Conversation[]
  talents: SimpleRecord[]
  mcRoles: McRole[]
  categories: ProjectCategory[]
  convertedProject: { id: string; name: string } | null
  documents: OpportunityDocument[]
}

export function OpportunityDetailClient({ opp, oppTalents, conversations, talents, mcRoles, categories, convertedProject, documents: initialDocuments }: Props) {
  const router = useRouter()

  // Delete opportunity
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('opportunities').delete().eq('id', opp.id)
    router.push('/opportunities')
  }

  // Edit deal
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: opp.name,
    mc_role: opp.mc_role,
    event_date: opp.event_date ?? '',
    location: opp.location ?? '',
    category: opp.category ?? '',
    notes: opp.notes ?? '',
  })
  const [convertOpen, setConvertOpen] = useState(false)
  const [converting, setConverting] = useState(false)

  // Add talent
  const [addTalentOpen, setAddTalentOpen] = useState(false)
  const [talentForm, setTalentForm] = useState({ talent_id: '', status: 'proposed', notes: '' })
  const [talentSaving, setTalentSaving] = useState(false)

  // Conversations
  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [deleteConvo, setDeleteConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })

  // Documents
  const [documents, setDocuments] = useState<OpportunityDocument[]>(initialDocuments)
  const [addingDoc, setAddingDoc] = useState(false)
  const [docForm, setDocForm] = useState({ title: '', url: '', notes: '' })
  const [savingDoc, setSavingDoc] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<OpportunityDocument | null>(null)
  const [editDoc, setEditDoc] = useState<OpportunityDocument | null>(null)
  const [editDocForm, setEditDocForm] = useState({ title: '', url: '', notes: '' })

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!docForm.title.trim() || !docForm.url.trim()) return
    setSavingDoc(true)
    const supabase = createClient()
    const { data } = await supabase.from('opportunity_documents').insert({
      opportunity_id: opp.id,
      title: docForm.title.trim(),
      url: docForm.url.trim(),
      notes: docForm.notes || null,
    }).select().single()
    if (data) setDocuments(prev => [...prev, data as OpportunityDocument])
    setDocForm({ title: '', url: '', notes: '' })
    setAddingDoc(false)
    setSavingDoc(false)
  }

  function openEditDoc(doc: OpportunityDocument) {
    setEditDocForm({ title: doc.title, url: doc.url, notes: doc.notes ?? '' })
    setEditDoc(doc)
  }

  async function handleEditDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!editDoc || !editDocForm.title.trim() || !editDocForm.url.trim()) return
    setSavingDoc(true)
    const supabase = createClient()
    const { data } = await supabase.from('opportunity_documents').update({
      title: editDocForm.title.trim(),
      url: editDocForm.url.trim(),
      notes: editDocForm.notes || null,
    }).eq('id', editDoc.id).select().single()
    if (data) setDocuments(prev => prev.map(d => d.id === editDoc.id ? data as OpportunityDocument : d))
    setEditDoc(null)
    setSavingDoc(false)
  }

  async function handleDeleteDoc() {
    if (!deleteDoc) return
    const supabase = createClient()
    await supabase.from('opportunity_documents').delete().eq('id', deleteDoc.id)
    setDocuments(prev => prev.filter(d => d.id !== deleteDoc.id))
    setDeleteDoc(null)
  }

  // MC role inline add
  const [localMcRoles, setLocalMcRoles] = useState<McRole[]>(mcRoles)
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function convoField(k: keyof typeof convoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  function editConvoField(k: keyof typeof editConvoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) return
    setSavingRole(true)
    const supabase = createClient()
    const { data } = await supabase.from('mc_roles').insert({ name: newRoleName.trim() }).select().single()
    if (data) {
      const role = data as McRole
      setLocalMcRoles(prev => [...prev, role].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(f => ({ ...f, mc_role: role.name }))
    }
    setNewRoleName('')
    setAddingRole(false)
    setSavingRole(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('opportunities').update({
      name: form.name.trim(),
      mc_role: form.mc_role,
      event_date: form.event_date || null,
      location: form.location || null,
      category: form.category || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', opp.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleConvert() {
    setConverting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: project } = await supabase.from('events').insert({
      name: opp.name,
      location: opp.location ?? null,
      category: opp.category ?? null,
      start_date: opp.event_date ?? null,
      notes: opp.notes ?? null,
      status: 'active',
      created_by: user?.email ?? null,
    }).select().single()
    if (project) {
      if (oppTalents.length > 0) {
        await supabase.from('project_talents').insert(
          oppTalents.filter(t => t.talent_id).map(t => ({ project_id: project.id, talent_id: t.talent_id }))
        )
      }
      await supabase.from('opportunities').update({ converted_project_id: project.id }).eq('id', opp.id)
    }
    setConverting(false)
    setConvertOpen(false)
    if (project) router.push(`/projects/${project.id}`)
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

  async function handleLogConvo(e: React.FormEvent) {
    e.preventDefault()
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').insert({
      entity_type: 'opportunity',
      entity_id: opp.id,
      channel: convoForm.channel || null,
      content: convoForm.content || null,
      follow_up: convoForm.follow_up || null,
      status: convoForm.status,
    })
    setConvoSaving(false)
    setLogConvoOpen(false)
    setConvoForm({ channel: 'note', content: '', follow_up: '', status: 'open' })
    router.refresh()
  }

  function openEditConvo(c: Conversation) {
    setEditConvoForm({ channel: c.channel ?? 'note', content: c.content ?? '', follow_up: c.follow_up ?? '', status: c.status ?? 'open' })
    setEditConvo(c)
  }

  async function handleEditConvo(e: React.FormEvent) {
    e.preventDefault()
    if (!editConvo) return
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').update({
      channel: editConvoForm.channel || null,
      content: editConvoForm.content || null,
      follow_up: editConvoForm.follow_up || null,
      status: editConvoForm.status,
    }).eq('id', editConvo.id)
    setConvoSaving(false)
    setEditConvo(null)
    router.refresh()
  }

  async function handleDeleteConvo() {
    if (!deleteConvo) return
    const supabase = createClient()
    await supabase.from('conversations').delete().eq('id', deleteConvo.id)
    setDeleteConvo(null)
    router.refresh()
  }

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
            {opp.mc_role && (
              <p className="text-xs text-gray-400 mb-1">{opp.mc_role}</p>
            )}
            <h1 className="text-2xl font-semibold text-gray-900">{opp.name}</h1>
            {opp.counterpart_name && (
              <p className="text-sm text-gray-500 mt-0.5">{opp.counterpart_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {convertedProject ? (
              <Button variant="secondary" onClick={() => router.push(`/projects/${convertedProject.id}`)} className="text-green-700 hover:text-green-800 border-green-200 hover:border-green-300">
                <FolderOpen className="w-3.5 h-3.5" />
                View Project
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setConvertOpen(true)} className="text-green-700 hover:text-green-800 border-green-200 hover:border-green-300">
                <FolderOpen className="w-3.5 h-3.5" />
                Convert to Project
              </Button>
            )}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {convertedProject && (
        <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
          <FolderOpen className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-green-700">Converted to project:</span>
          <button onClick={() => router.push(`/projects/${convertedProject.id}`)} className="font-medium text-green-800 hover:underline">
            {convertedProject.name}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Left column — deal details */}
        <div className="space-y-4">
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
              {opp.location && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Location</dt>
                  <dd className="text-sm text-gray-900">{opp.location}</dd>
                </div>
              )}
              {opp.category && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Category</dt>
                  <dd className="text-sm text-gray-900">{opp.category}</dd>
                </div>
              )}
              {opp.notes && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Notes</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap">{opp.notes}</dd>
                </div>
              )}
              {!opp.event_date && !opp.location && !opp.category && !opp.notes && (
                <p className="text-sm text-gray-300">No details added.</p>
              )}
            </dl>
          </div>
        </div>

        {/* Right columns — talent shortlist + conversations */}
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

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Documents
                  {documents.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{documents.length}</span>}
                </h2>
                <a
                  href="https://drive.google.com/drive/u/1/folders/1eFM6P6mBAbwf_qGKOgO_zp5N0qM9u8_A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Opportunities folder
                </a>
              </div>
              <button onClick={() => setAddingDoc(v => !v)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {addingDoc && (
              <form onSubmit={handleAddDoc} className="px-5 py-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Title *</label>
                  <Input
                    value={docForm.title}
                    onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Draft Contract, Brief, Proposal…"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Google Drive link *</label>
                  <Input
                    value={docForm.url}
                    onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://drive.google.com/…"
                    type="url"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Notes</label>
                  <Input
                    value={docForm.notes}
                    onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="What is this document?"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAddingDoc(false); setDocForm({ title: '', url: '', notes: '' }) }} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={savingDoc || !docForm.title.trim() || !docForm.url.trim()} className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg disabled:opacity-40">
                    {savingDoc ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {documents.length === 0 && !addingDoc ? (
              <p className="px-5 py-4 text-sm text-gray-400">No documents linked yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-start justify-between px-5 py-3 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:underline truncate inline-flex items-center gap-1"
                        >
                          {doc.title}
                          <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                        </a>
                      </div>
                      {doc.notes && <p className="text-xs text-gray-400 mt-0.5 ml-5">{doc.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditDoc(doc)} className="text-gray-300 hover:text-gray-600">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => setDeleteDoc(doc)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>
              )}
              {conversations.map(c => (
                <div key={c.id} className="px-5 py-3 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge value={c.status} />
                      <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => setDeleteConvo(c)} className="text-gray-200 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Delete confirmation */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete opportunity?">
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-red-800">{opp.name}</p>
            {opp.counterpart_name && (
              <p className="text-sm text-red-600 mt-0.5">{opp.counterpart_name}</p>
            )}
          </div>
          <p className="text-sm text-gray-600">
            This will permanently delete the opportunity and all associated data. This cannot be undone.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Yes, delete it'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit deal modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Opportunity">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Deal name *</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">MC role</label>
              <Select
                value={form.mc_role ?? ''}
                onChange={e => {
                  if (e.target.value === '__add_new__') {
                    setAddingRole(true)
                  } else {
                    setForm(f => ({ ...f, mc_role: e.target.value }))
                  }
                }}
                options={[
                  ...localMcRoles.map(r => ({ value: r.name, label: r.name })),
                  { value: '__add_new__', label: '＋ Add new role…' },
                ]}
              />
              {addingRole && (
                <div className="flex gap-1.5">
                  <input
                    autoFocus
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddRole() }
                      if (e.key === 'Escape') { setAddingRole(false); setNewRoleName('') }
                    }}
                    placeholder="New role name…"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <button type="button" disabled={savingRole || !newRoleName.trim()} onClick={handleAddRole} className="px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-40">
                    {savingRole ? '…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => { setAddingRole(false); setNewRoleName('') }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg">
                    Cancel
                  </button>
                </div>
              )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Event date</label>
              <Input type="date" value={form.event_date} onChange={field('event_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Location</label>
              <Input value={form.location} onChange={field('location')} placeholder="City, Country" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select
              value={form.category}
              onChange={field('category')}
              options={categories.map(c => ({ value: c.name, label: c.name }))}
              placeholder="Select…"
            />
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

      {/* Convert to Project confirmation */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to Project?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will create a new Project from this opportunity and move the talent shortlist across.
          </p>
          <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
            <p><span className="text-gray-400">Name:</span> <span className="font-medium text-gray-900">{opp.name}</span></p>
            {opp.event_date && <p><span className="text-gray-400">Date:</span> {new Date(opp.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            {opp.location && <p><span className="text-gray-400">Location:</span> {opp.location}</p>}
            {opp.category && <p><span className="text-gray-400">Category:</span> {opp.category}</p>}
            {oppTalents.length > 0 && <p><span className="text-gray-400">Talents:</span> {oppTalents.map(t => t.talent?.name).filter(Boolean).join(', ')}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setConvertOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleConvert} disabled={converting} className="flex-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
              {converting ? 'Converting…' : 'Convert to Project'}
            </button>
          </div>
        </div>
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

      {/* Log Conversation Modal */}
      <Modal open={logConvoOpen} onClose={() => setLogConvoOpen(false)} title="Log Conversation">
        <form onSubmit={handleLogConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={convoForm.channel} onChange={convoField('channel')} options={channelOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={convoForm.status} onChange={convoField('status')} options={convoStatusOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content</label>
            <Textarea value={convoForm.content} onChange={convoField('content')} rows={3} placeholder="What was discussed / what happened?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={convoForm.follow_up} onChange={convoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLogConvoOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Log It'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Conversation Modal */}
      <Modal open={!!editConvo} onClose={() => setEditConvo(null)} title="Edit Conversation">
        <form onSubmit={handleEditConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Channel</label>
              <Select value={editConvoForm.channel} onChange={editConvoField('channel')} options={channelOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={editConvoForm.status} onChange={editConvoField('status')} options={convoStatusOpts} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Content</label>
            <Textarea value={editConvoForm.content} onChange={editConvoField('content')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={editConvoForm.follow_up} onChange={editConvoField('follow_up')} placeholder="What needs to happen next?" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditConvo(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Document Modal */}
      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title="Edit Document">
        <form onSubmit={handleEditDoc} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Title *</label>
            <Input value={editDocForm.title} onChange={e => setEditDocForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Google Drive link *</label>
            <Input value={editDocForm.url} onChange={e => setEditDocForm(f => ({ ...f, url: e.target.value }))} type="url" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Input value={editDocForm.notes} onChange={e => setEditDocForm(f => ({ ...f, notes: e.target.value }))} placeholder="What is this document?" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditDoc(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={savingDoc} className="flex-1">{savingDoc ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Document Confirmation */}
      <Modal open={!!deleteDoc} onClose={() => setDeleteDoc(null)} title="Delete Document">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Remove <span className="font-medium text-gray-900">{deleteDoc?.title}</span>? This cannot be undone.</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteDoc(null)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDeleteDoc} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Conversation Confirmation */}
      <Modal open={!!deleteConvo} onClose={() => setDeleteConvo(null)} title="Delete Conversation">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete this conversation entry? This cannot be undone.</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteConvo(null)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDeleteConvo} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
