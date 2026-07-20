'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, Star, AlertTriangle } from 'lucide-react'
import { Stylist, StylistContact } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

const SPECIALTY_OPTS = [
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Celebrity', label: 'Celebrity' },
  { value: 'Editorial', label: 'Editorial' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Personal Styling', label: 'Personal Styling' },
  { value: 'Red Carpet', label: 'Red Carpet' },
]

type Props = {
  stylist: Stylist
  contacts: StylistContact[]
}

export function StylistDetailClient({ stylist, contacts }: Props) {
  const router = useRouter()

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: stylist.name ?? '',
    specialty: stylist.specialty ?? '',
    based: stylist.based ?? '',
    ig_link: stylist.ig_link ?? '',
    website: stylist.website ?? '',
    notes: stylist.notes ?? '',
  })

  const [contactOpen, setContactOpen] = useState(false)
  const [editContact, setEditContact] = useState<StylistContact | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', role: '', email: '', phone: '', notes: '' })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function contactField(k: keyof typeof contactForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContactForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('stylists').update({
      name: form.name || null,
      specialty: form.specialty || null,
      based: form.based || null,
      ig_link: form.ig_link || null,
      website: form.website || null,
      notes: form.notes || null,
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

  function openAddContact() {
    setContactForm({ name: '', role: '', email: '', phone: '', notes: '' })
    setEditContact(null)
    setContactOpen(true)
  }

  function openEditContact(c: StylistContact) {
    setContactForm({ name: c.name ?? '', role: c.role ?? '', email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' })
    setEditContact(c)
    setContactOpen(true)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactSaving(true)
    const supabase = createClient()
    const payload = {
      stylist_id: stylist.id,
      name: contactForm.name || null,
      role: contactForm.role || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      notes: contactForm.notes || null,
    }
    if (editContact) {
      await supabase.from('stylist_contacts').update(payload).eq('id', editContact.id)
    } else {
      await supabase.from('stylist_contacts').insert(payload)
    }
    setContactSaving(false)
    setContactOpen(false)
    setEditContact(null)
    router.refresh()
  }

  async function deleteContact(id: string) {
    const supabase = createClient()
    await supabase.from('stylist_contacts').delete().eq('id', id)
    router.refresh()
  }

  async function setPrimaryContact(id: string) {
    const supabase = createClient()
    await supabase.from('stylist_contacts').update({ is_primary: false }).eq('stylist_id', stylist.id)
    await supabase.from('stylist_contacts').update({ is_primary: true }).eq('id', id)
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
            <div className="flex items-center gap-3 mt-1">
              {stylist.specialty && <span className="text-sm text-gray-500">{stylist.specialty}</span>}
              {stylist.based && <span className="text-sm text-gray-400">{stylist.based}</span>}
            </div>
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
                <dt className="text-xs text-gray-400 mb-0.5">Specialty</dt>
                <dd className="text-sm text-gray-900">{stylist.specialty ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Based</dt>
                <dd className="text-sm text-gray-900">{stylist.based ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Instagram</dt>
                <dd className="text-sm">
                  {stylist.ig_link ? (
                    <a href={stylist.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-900 hover:text-black">
                      View profile <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  ) : <span className="text-gray-300">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Website</dt>
                <dd className="text-sm">
                  {stylist.website ? (
                    <a href={stylist.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-900 hover:text-black">
                      Visit <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  ) : <span className="text-gray-300">—</span>}
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

        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
              <button onClick={openAddContact} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {contacts.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No contacts yet.</p>}
              {contacts.map(c => (
                <div key={c.id} className="px-5 py-3 group flex items-start justify-between">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => setPrimaryContact(c.id)}
                      title={c.is_primary ? 'Primary contact' : 'Set as primary'}
                      className={`mt-0.5 shrink-0 transition-colors ${c.is_primary ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'}`}
                    >
                      <Star className="w-3.5 h-3.5" fill={c.is_primary ? 'currentColor' : 'none'} />
                    </button>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {c.name ?? '—'}
                        {c.is_primary && <span className="ml-2 text-xs text-amber-600 font-normal">Primary</span>}
                      </div>
                      {c.role && <div className="text-xs text-gray-400 mt-0.5">{c.role}</div>}
                      <div className="flex items-center gap-3 mt-1">
                        {c.email && <a href={`mailto:${c.email}`} className="text-xs text-gray-500 hover:text-black">{c.email}</a>}
                        {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                      </div>
                      {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                    <button onClick={() => openEditContact(c)} className="text-gray-300 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => deleteContact(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={contactOpen} onClose={() => { setContactOpen(false); setEditContact(null) }} title={editContact ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Name</label>
              <Input value={contactForm.name} onChange={contactField('name')} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Role</label>
              <Input value={contactForm.role} onChange={contactField('role')} placeholder="e.g. Assistant" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={contactForm.email} onChange={contactField('email')} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={contactForm.phone} onChange={contactField('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={contactForm.notes} onChange={contactField('notes')} rows={2} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setContactOpen(false); setEditContact(null) }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={contactSaving} className="flex-1">{contactSaving ? 'Saving…' : editContact ? 'Save Changes' : 'Add Contact'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Stylist">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Specialty</label>
              <Select value={form.specialty} onChange={field('specialty')} options={SPECIALTY_OPTS} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Based</label>
              <Input value={form.based} onChange={field('based')} placeholder="City, Country" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram URL</label>
              <Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Website</label>
              <Input value={form.website} onChange={field('website')} placeholder="https://…" />
            </div>
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
            <p className="text-sm text-red-700">
              This will permanently delete <strong>{stylist.name}</strong> and all associated contacts. This cannot be undone.
            </p>
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
