'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Brand, Opportunity, Conversation, Contact } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'

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

const categoryOpts = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'dressing', label: 'Dressing' },
  { value: 'main', label: 'Main' },
  { value: 'prospect', label: 'Prospect' },
]

const statusOpts = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
]

type Props = {
  brand: Brand
  opportunities: (Opportunity & { talent?: { name: string } | null; event?: { name: string } | null })[]
  conversations: Conversation[]
  contacts: Contact[]
}

export function BrandDetailClient({ brand, opportunities, conversations, contacts }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', role: '', email: '', phone: '', notes: '' })
  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [form, setForm] = useState({
    name: brand.name ?? '',
    link: brand.link ?? '',
    tiktok_link: brand.tiktok_link ?? '',
    category: brand.category ?? 'main',
    status: brand.status ?? 'active',
    contact: brand.contact ?? '',
    budget: brand.budget ?? '',
    industry: brand.industry ?? '',
    country: brand.country ?? '',
    notes: brand.notes ?? '',
  })

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function contactField(k: keyof typeof contactForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContactForm(f => ({ ...f, [k]: e.target.value }))
  }

  function openEditContact(c: Contact) {
    setContactForm({ name: c.name ?? '', role: c.role ?? '', email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' })
    setEditContact(c)
    setContactOpen(true)
  }

  function openAddContact() {
    setContactForm({ name: '', role: '', email: '', phone: '', notes: '' })
    setEditContact(null)
    setContactOpen(true)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactSaving(true)
    const supabase = createClient()
    const payload = {
      brand_id: brand.id,
      name: contactForm.name || null,
      role: contactForm.role || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      notes: contactForm.notes || null,
    }
    if (editContact) {
      await supabase.from('contacts').update(payload).eq('id', editContact.id)
    } else {
      await supabase.from('contacts').insert(payload)
    }
    setContactSaving(false)
    setContactOpen(false)
    setEditContact(null)
    router.refresh()
  }

  async function deleteContact(id: string) {
    const supabase = createClient()
    await supabase.from('contacts').delete().eq('id', id)
    router.refresh()
  }

  function convoField(k: keyof typeof convoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  function editConvoField(k: keyof typeof editConvoForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setEditConvoForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleLogConvo(e: React.FormEvent) {
    e.preventDefault()
    setConvoSaving(true)
    const supabase = createClient()
    await supabase.from('conversations').insert({
      entity_type: 'brand',
      entity_id: brand.id,
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('brands').update({
      name: form.name || null,
      link: form.link || null,
      tiktok_link: form.tiktok_link || null,
      category: form.category || null,
      status: form.status || null,
      contact: form.contact || null,
      budget: form.budget || null,
      industry: form.industry || null,
      country: form.country || null,
      notes: form.notes || null,
    }).eq('id', brand.id)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/brands" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Brands
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{brand.name}</h1>
            {brand.link && (
              <a href={brand.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mt-1">
                <ExternalLink className="w-3 h-3" />
                View profile
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge value={brand.category} />
            <Badge value={brand.status} />
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              {[
                { label: 'Industry', value: brand.industry },
                { label: 'Country', value: brand.country },
                { label: 'Budget', value: brand.budget },
                { label: 'Contact', value: brand.contact },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value ?? <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>

          {(brand.link || brand.tiktok_link) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Links</h2>
              <div className="space-y-2">
                {brand.link && (
                  <a href={brand.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-black">
                    <ExternalLink className="w-3 h-3 text-gray-400" /> Instagram / Website
                  </a>
                )}
                {brand.tiktok_link && (
                  <a href={brand.tiktok_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-black">
                    <ExternalLink className="w-3 h-3 text-gray-400" /> TikTok
                  </a>
                )}
              </div>
            </div>
          )}

          {brand.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{brand.notes}</p>
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-5">
          {/* Contacts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
              <button onClick={openAddContact} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {contacts.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No contacts yet.</p>
              )}
              {contacts.map(c => (
                <div key={c.id} className="px-5 py-3 group flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name ?? '—'}</div>
                    {c.role && <div className="text-xs text-gray-400 mt-0.5">{c.role}</div>}
                    <div className="flex items-center gap-3 mt-1">
                      {c.email && <a href={`mailto:${c.email}`} className="text-xs text-gray-500 hover:text-black">{c.email}</a>}
                      {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                    <button onClick={() => openEditContact(c)} className="text-gray-300 hover:text-gray-600">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteContact(c.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Opportunities</h2>
              <span className="text-xs text-gray-400">{opportunities?.length ?? 0}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {!opportunities?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No opportunities linked.</p>
              )}
              {opportunities?.map(opp => (
                <div key={opp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {opp.talent?.name ?? 'No talent'} — {opp.type ?? 'No type'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{opp.event?.name ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opp.estimated_value && <span className="text-xs text-gray-500">{formatCurrency(opp.estimated_value)}</span>}
                    <Badge value={opp.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations?.length && (
                <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>
              )}
              {conversations?.map(c => (
                <div key={c.id} className="px-5 py-3 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge value={c.status} />
                      <span className="text-xs text-gray-400 capitalize">{c.channel ?? 'note'} · {formatDate(c.created_at)}</span>
                    </div>
                    <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
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
              <Input value={contactForm.role} onChange={contactField('role')} placeholder="e.g. PR Director" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" value={contactForm.email} onChange={contactField('email')} placeholder="email@brand.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Phone</label>
              <Input value={contactForm.phone} onChange={contactField('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={contactForm.notes} onChange={contactField('notes')} rows={2} placeholder="Any context…" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setContactOpen(false); setEditContact(null) }} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={contactSaving} className="flex-1">{contactSaving ? 'Saving…' : editContact ? 'Save Changes' : 'Add Contact'}</Button>
          </div>
        </form>
      </Modal>

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

      <Modal open={open} onClose={() => setOpen(false)} title="Edit Brand">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram / Website URL</label>
              <Input value={form.link} onChange={field('link')} placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok URL</label>
              <Input value={form.tiktok_link} onChange={field('tiktok_link')} placeholder="https://tiktok.com/@..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={form.status} onChange={field('status')} options={statusOpts} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Industry</label>
              <Input value={form.industry} onChange={field('industry')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Country</label>
              <Input value={form.country} onChange={field('country')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Budget</label>
            <Input value={form.budget} onChange={field('budget')} placeholder="e.g. €10,000" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Contact</label>
            <Textarea value={form.contact} onChange={field('contact')} rows={2} placeholder="Name, email, phone…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={4} />
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
