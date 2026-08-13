'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Stylist } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { AuditStamp } from '@/components/audit-stamp'

type TalentLink = { id: string; talent_id: string; talent: { id: string; name: string } | null }
type SimpleTalent = { id: string; name: string }

type Props = {
  stylist: Stylist
  talentLinks: TalentLink[]
  allTalents: SimpleTalent[]
}

export function StylistDetailClient({ stylist, talentLinks, allTalents }: Props) {
  const router = useRouter()

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Talent linking
  const [linkTalentOpen, setLinkTalentOpen] = useState(false)
  const [linkTalentId, setLinkTalentId] = useState('')
  const [linkTalentSaving, setLinkTalentSaving] = useState(false)

  const [form, setForm] = useState({
    name: stylist.name ?? '',
    based: stylist.based ?? '',
    email: stylist.email ?? '',
    phone: stylist.phone ?? '',
    url: stylist.url ?? '',
    notes: stylist.notes ?? '',
  })

  const linkedTalentIds = new Set(talentLinks.map(l => l.talent_id))
  const availableTalents = allTalents.filter(t => !linkedTalentIds.has(t.id))

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('stylists').update({
      name: form.name || null,
      based: form.based || null,
      email: form.email || null,
      phone: form.phone || null,
      url: form.url || null,
      notes: form.notes || null,
      updated_by: user?.email ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', stylist.id)
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('stylists').delete().eq('id', stylist.id)
    router.push('/stylists')
    router.refresh()
  }

  function openLinkTalent() { setLinkTalentId(''); setLinkTalentOpen(true) }

  async function handleLinkTalent(e: React.FormEvent) {
    e.preventDefault()
    if (!linkTalentId) return
    setLinkTalentSaving(true)
    await createClient().from('talent_stylists').insert({ talent_id: linkTalentId, stylist_id: stylist.id })
    setLinkTalentSaving(false)
    setLinkTalentOpen(false)
    router.refresh()
  }

  async function unlinkTalent(linkId: string) {
    await createClient().from('talent_stylists').delete().eq('id', linkId)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/stylists" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Stylists
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{stylist.name}</h1>
            {stylist.based && <p className="text-sm text-gray-400 mt-1">{stylist.based}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Based</dt>
                <dd className="text-sm text-gray-900">{stylist.based ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Email</dt>
                <dd className="text-sm">
                  {stylist.email
                    ? <a href={`mailto:${stylist.email}`} className="text-gray-900 hover:text-black">{stylist.email}</a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Phone</dt>
                <dd className="text-sm text-gray-900">{stylist.phone ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Website / Instagram</dt>
                <dd className="text-sm">
                  {stylist.url
                    ? <a href={stylist.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-900 hover:text-black">View link <ExternalLink className="w-3 h-3 text-gray-400" /></a>
                    : <span className="text-gray-300">—</span>}
                </dd>
              </div>
            </dl>
          </div>
          {stylist.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{stylist.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-5">
          {/* Talents */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Talents</h2>
              <button onClick={openLinkTalent} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Link
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {talentLinks.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No talents linked.</p>
              )}
              {talentLinks.map(link => (
                <div key={link.id} className="group flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <Link href={`/talents/${link.talent?.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{link.talent?.name ?? '—'}</div>
                  </Link>
                  <button
                    onClick={() => unlinkTalent(link.id)}
                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-3 shrink-0"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AuditStamp createdBy={stylist.created_by} createdAt={stylist.created_at} updatedBy={stylist.updated_by} updatedAt={stylist.updated_at} />

      {/* Link Talent Modal */}
      <Modal open={linkTalentOpen} onClose={() => setLinkTalentOpen(false)} title="Link Talent">
        <form onSubmit={handleLinkTalent} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Talent</label>
            <Select
              value={linkTalentId}
              onChange={e => setLinkTalentId(e.target.value)}
              options={availableTalents.map(t => ({ value: t.id, label: t.name }))}
              placeholder={availableTalents.length ? 'Select talent…' : 'All talents already linked'}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLinkTalentOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={linkTalentSaving || !linkTalentId} className="flex-1">
              {linkTalentSaving ? 'Saving…' : 'Link Talent'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Stylist">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Based</label>
            <Input value={form.based} onChange={field('based')} placeholder="City, Country" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={form.phone} onChange={field('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Website / Instagram</label>
            <Input value={form.url} onChange={field('url')} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Stylist">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This will permanently delete <strong>{stylist.name}</strong>. This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">
              {deleting ? 'Deleting…' : 'Delete Stylist'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
