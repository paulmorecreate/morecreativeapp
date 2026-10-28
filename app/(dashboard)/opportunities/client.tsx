'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2, X, FolderOpen, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { Opportunity, McRole, ProjectCategory } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type SimpleRecord = { id: string; name: string }

type OppWithTalents = Opportunity & {
  opportunity_talents: { id: string; status: string; talent: { id: string; name: string } | null }[]
  converted_project?: { id: string; name: string } | null
}

export const TALENT_STATUSES = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'approached', label: 'Approached' },
  { value: 'declined', label: 'Declined' },
  { value: 'confirmed', label: 'Confirmed' },
]

interface Props {
  opportunities: OppWithTalents[]
  talents: SimpleRecord[]
  mcRoles: McRole[]
  categories: ProjectCategory[]
}

const emptyForm = {
  name: '',
  mc_role: '',
  event_date: '',
  location: '',
  category: '',
  notes: '',
}

type ShortlistEntry = { talent_id: string; name: string; status: string }

export function OpportunitiesClient({ opportunities, talents, mcRoles, categories }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [deleteTarget, setDeleteTarget] = useState<OppWithTalents | null>(null)
  const [deleting, setDeleting] = useState(false)

  // MC role inline add
  const [localMcRoles, setLocalMcRoles] = useState<McRole[]>(mcRoles)
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  const [shortlist, setShortlist] = useState<ShortlistEntry[]>([])
  const [shortlistTalentId, setShortlistTalentId] = useState('')
  const [convertTarget, setConvertTarget] = useState<OppWithTalents | null>(null)
  const [converting, setConverting] = useState(false)
  const [showConverted, setShowConverted] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
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

  const active = opportunities.filter(o => !o.converted_project_id)
  const converted = opportunities.filter(o => !!o.converted_project_id)

  const filtered = active.filter(o => {
    const q = search.toLowerCase()
    return !search ||
      o.name.toLowerCase().includes(q) ||
      (o.counterpart_name ?? '').toLowerCase().includes(q) ||
      o.opportunity_talents.some(t => t.talent?.name.toLowerCase().includes(q))
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('opportunities').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('opportunities').insert({
      name: form.name.trim(),
      mc_role: form.mc_role,
      event_date: form.event_date || null,
      location: form.location || null,
      category: form.category || null,
      notes: form.notes || null,
    }).select().single()
    if (data && shortlist.length > 0) {
      await supabase.from('opportunity_talents').insert(
        shortlist.map(s => ({ opportunity_id: data.id, talent_id: s.talent_id, status: s.status }))
      )
    }
    setSaving(false)
    setOpen(false)
    setForm({ ...emptyForm })
    setShortlist([])
    setShortlistTalentId('')
    if (data) router.push(`/opportunities/${data.id}`)
    else router.refresh()
  }

  async function handleConvert() {
    if (!convertTarget) return
    setConverting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: project } = await supabase.from('events').insert({
      name: convertTarget.name,
      location: convertTarget.location ?? null,
      category: convertTarget.category ?? null,
      start_date: convertTarget.event_date ?? null,
      notes: convertTarget.notes ?? null,
      status: 'active',
      created_by: user?.email ?? null,
    }).select().single()
    if (project) {
      if (convertTarget.opportunity_talents.length > 0) {
        await supabase.from('project_talents').insert(
          convertTarget.opportunity_talents
            .filter(t => t.talent?.id)
            .map(t => ({ project_id: project.id, talent_id: t.talent!.id }))
        )
      }
      await supabase.from('opportunities').update({ converted_project_id: project.id }).eq('id', convertTarget.id)
    }
    setConverting(false)
    setConvertTarget(null)
    if (project) router.push(`/projects/${project.id}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Opportunities</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}{converted.length > 0 ? ` · ${converted.length} converted` : ''}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Opportunity
        </Button>
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
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Talents</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Event date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Notes</th>
              <th className="w-8 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  {search ? 'No results.' : 'No opportunities yet — add your first deal.'}
                </td>
              </tr>
            )}
            {filtered.map((opp, i) => (
              <tr
                key={opp.id}
                className={`transition-colors cursor-pointer group ${i % 2 === 1 ? 'bg-red-50' : 'bg-white'} hover:bg-blue-50/40`}
                onClick={() => router.push(`/opportunities/${opp.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{opp.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {opp.mc_role ?? <span className="text-gray-300">—</span>}
                </td>
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
                <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px]">
                  {opp.notes
                    ? <span className="line-clamp-2">{opp.notes}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-3 w-16" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setConvertTarget(opp)}
                      className="text-green-500 hover:text-green-700 hover:bg-green-50 rounded p-0.5 transition-colors"
                      title="Convert to Project"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(opp)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors"
                      title="Delete opportunity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Converted section */}
      {converted.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowConverted(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3"
          >
            {showConverted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Converted to Project ({converted.length})
          </button>
          {showConverted && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-60">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {converted.map(opp => (
                    <tr key={opp.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/opportunities/${opp.id}`)}>
                      <td className="px-4 py-3 font-medium text-gray-700">{opp.name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {opp.event_date ? new Date(opp.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {opp.converted_project && (
                          <a
                            href={`/projects/${opp.converted_project.id}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:underline"
                          >
                            <FolderOpen className="w-3 h-3" />
                            {opp.converted_project.name}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete opportunity?">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-red-800">{deleteTarget.name}</p>
            </div>
            <p className="text-sm text-gray-600">
              This will permanently delete the opportunity and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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
        )}
      </Modal>

      {/* Convert to Project confirmation */}
      <Modal open={!!convertTarget} onClose={() => setConvertTarget(null)} title={convertTarget?.converted_project ? 'Already Converted' : 'Convert to Project?'}>
        {convertTarget && (
          <div className="space-y-4">
            {convertTarget.converted_project ? (
              <>
                <p className="text-sm text-gray-600">
                  This opportunity has already been converted to a project.
                </p>
                <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-800">{convertTarget.converted_project.name}</span>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setConvertTarget(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Close
                  </button>
                  <button type="button" onClick={() => router.push(`/projects/${convertTarget.converted_project!.id}`)} className="flex-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors">
                    Go to Project
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  This will create a new Project from this opportunity and move the talent shortlist across.
                </p>
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
                  <p><span className="text-gray-400">Name:</span> <span className="font-medium text-gray-900">{convertTarget.name}</span></p>
                  {convertTarget.event_date && <p><span className="text-gray-400">Date:</span> {new Date(convertTarget.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  {convertTarget.location && <p><span className="text-gray-400">Location:</span> {convertTarget.location}</p>}
                  {convertTarget.category && <p><span className="text-gray-400">Category:</span> {convertTarget.category}</p>}
                  {convertTarget.opportunity_talents.length > 0 && (
                    <p><span className="text-gray-400">Talents:</span> {convertTarget.opportunity_talents.map(t => t.talent?.name).filter(Boolean).join(', ')}</p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setConvertTarget(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={handleConvert} disabled={converting} className="flex-1 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                    {converting ? 'Converting…' : 'Convert to Project'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Add modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add Opportunity">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Deal name *</label>
            <Input value={form.name} onChange={field('name')} placeholder="e.g. Roberto Cavalli FW26 Campaign" required />
          </div>
          <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">MC role</label>
              <Select
                value={form.mc_role}
                onChange={e => {
                  if (e.target.value === '__add_new__') {
                    setAddingRole(true)
                  } else {
                    setForm(f => ({ ...f, mc_role: e.target.value }))
                  }
                }}
                placeholder="Select role…"
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
                  <button
                    type="button"
                    disabled={savingRole || !newRoleName.trim()}
                    onClick={handleAddRole}
                    className="px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-40"
                  >
                    {savingRole ? '…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingRole(false); setNewRoleName('') }}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
                  >
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
            <Textarea value={form.notes} onChange={field('notes')} rows={2} placeholder="Context, deal background…" />
          </div>

          {/* Talent shortlist */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Talent Shortlist</label>
            <div className="flex gap-1.5">
              <Select
                value={shortlistTalentId}
                onChange={e => setShortlistTalentId(e.target.value)}
                options={talents
                  .filter(t => !shortlist.some(s => s.talent_id === t.id))
                  .map(t => ({ value: t.id, label: t.name }))}
                placeholder="Add talent…"
                className="flex-1"
              />
              <button
                type="button"
                disabled={!shortlistTalentId}
                onClick={() => {
                  const t = talents.find(t => t.id === shortlistTalentId)
                  if (!t) return
                  setShortlist(s => [...s, { talent_id: t.id, name: t.name, status: 'proposed' }])
                  setShortlistTalentId('')
                }}
                className="px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {shortlist.length > 0 && (
              <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                {shortlist.map(s => (
                  <div key={s.talent_id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-900">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={s.status}
                        onChange={e => setShortlist(prev => prev.map(x => x.talent_id === s.talent_id ? { ...x, status: e.target.value } : x))}
                        className="text-xs text-gray-500 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-black/10 rounded pr-1"
                      >
                        {TALENT_STATUSES.map(ts => <option key={ts.value} value={ts.value}>{ts.label}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShortlist(prev => prev.filter(x => x.talent_id !== s.talent_id))}
                        className="text-gray-300 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
