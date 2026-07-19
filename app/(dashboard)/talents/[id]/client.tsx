'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, Star, Info } from 'lucide-react'
import { Talent, TalentEventDetail, Conversation, TalentContact, TalentCategory } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, truncate } from '@/lib/utils'

const COUNTRIES = [
  'Australia','Austria','Belgium','Brazil','Canada','China','Denmark','Finland',
  'France','Germany','Greece','India','Ireland','Italy','Japan','Mexico',
  'Netherlands','New Zealand','Norway','Poland','Portugal','Russia','Saudi Arabia',
  'South Korea','Spain','Sweden','Switzerland','Turkey','UAE','UK','USA',
].map(c => ({ value: c, label: c }))

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

type AgentLink = {
  id: string
  agent_id: string
  agent: { id: string; name: string; agent_type: string | null } | null
}

type TalentProject = {
  id: string
  project_brand: {
    id: string
    show_date: string | null
    project: { id: string; name: string; start_date: string | null; location: string | null; status: string; category: string | null } | null
    brand: { id: string; name: string } | null
  } | null
}

type Props = {
  talent: Talent
  talentProjects: TalentProject[]
  eventDetails: (TalentEventDetail & { event?: { name: string } | null })[]
  conversations: Conversation[]
  agentLinks: AgentLink[]
  talentContacts: TalentContact[]
  talentCategories: TalentCategory[]
}

export function TalentDetailClient({ talent, talentProjects, eventDetails, conversations, agentLinks, talentContacts, talentCategories }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [contactOpen, setContactOpen] = useState(false)
  const [editContact, setEditContact] = useState<TalentContact | null>(null)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', role: '', email: '', phone: '', notes: '' })

  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })

  const [form, setForm] = useState({
    name: talent.name ?? '',
    ig_link: talent.ig_link ?? '',
    tiktok_link: talent.tiktok_link ?? '',
    ig_followers: talent.ig_followers ?? '',
    tiktok_followers: talent.tiktok_followers ?? '',
    category: talent.category ?? '',
    country: talent.country ?? '',
    notes: talent.notes ?? '',
  })

  const categoryOpts = talentCategories.map(c => ({ value: c.name, label: c.name }))

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
    await supabase.from('talents').update({
      name: form.name || null,
      ig_link: form.ig_link || null,
      tiktok_link: form.tiktok_link || null,
      ig_followers: form.ig_followers || null,
      tiktok_followers: form.tiktok_followers || null,
      category: form.category || null,
      country: form.country || null,
      notes: form.notes || null,
    }).eq('id', talent.id)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  function openAddContact() {
    setContactForm({ name: '', role: '', email: '', phone: '', notes: '' })
    setEditContact(null)
    setContactOpen(true)
  }

  function openEditContact(c: TalentContact) {
    setContactForm({ name: c.name ?? '', role: c.role ?? '', email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '' })
    setEditContact(c)
    setContactOpen(true)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactSaving(true)
    const supabase = createClient()
    const payload = {
      talent_id: talent.id,
      name: contactForm.name || null,
      role: contactForm.role || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      notes: contactForm.notes || null,
    }
    if (editContact) {
      await supabase.from('talent_contacts').update(payload).eq('id', editContact.id)
    } else {
      await supabase.from('talent_contacts').insert(payload)
    }
    setContactSaving(false)
    setContactOpen(false)
    setEditContact(null)
    router.refresh()
  }

  async function deleteContact(id: string) {
    const supabase = createClient()
    await supabase.from('talent_contacts').delete().eq('id', id)
    router.refresh()
  }

  async function setPrimaryContact(id: string) {
    const supabase = createClient()
    await supabase.from('talent_contacts').update({ is_primary: false }).eq('talent_id', talent.id)
    await supabase.from('talent_contacts').update({ is_primary: true }).eq('id', id)
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
      entity_type: 'talent',
      entity_id: talent.id,
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

  return (
    <div>
      <div className="mb-6">
        <Link href="/talents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Talents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{talent.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {talent.ig_link && (
                <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                  <ExternalLink className="w-3 h-3" /> Instagram
                </a>
              )}
              {talent.tiktok_link && (
                <a href={talent.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                  <ExternalLink className="w-3 h-3" /> TikTok
                </a>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Category</dt>
                <dd><Badge value={talent.category} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Country</dt>
                <dd className="text-sm text-gray-900">{talent.country ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">IG Followers</dt>
                <dd className="text-sm text-gray-900">{talent.ig_followers ?? <span className="text-gray-300">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">TikTok Followers</dt>
                <dd className="text-sm text-gray-900">{talent.tiktok_followers ?? <span className="text-gray-300">—</span>}</dd>
              </div>
            </dl>
          </div>

          {/* Agents (read-only) */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agent</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {agentLinks.length === 0 && (
                <p className="px-5 py-4 text-sm text-gray-400">No agent linked.</p>
              )}
              {agentLinks.map(link => (
                <Link key={link.id} href={`/agents/${link.agent?.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{link.agent?.name ?? '—'}</div>
                    {link.agent?.agent_type && <div className="text-xs text-gray-400 mt-0.5">{link.agent.agent_type}</div>}
                  </div>
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-gray-400">
              <Info className="w-3 h-3 shrink-0" />
              Go to the Agents screen to make any changes.
            </div>
          </div>

          {talent.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{talent.notes}</p>
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
              {talentContacts.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No contacts yet.</p>}
              {talentContacts.map(c => (
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

          {/* Projects */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Projects</h2>
              <span className="text-xs text-gray-400">{talentProjects.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {!talentProjects.length && <p className="px-5 py-4 text-sm text-gray-400">Not linked to any projects yet.</p>}
              {talentProjects.map(tp => (
                <Link key={tp.id} href={`/projects/${tp.project_brand?.project?.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{tp.project_brand?.project?.name ?? '—'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tp.project_brand?.brand?.name ?? '—'}
                      {tp.project_brand?.show_date && <span className="ml-2">· {formatDate(tp.project_brand.show_date)}</span>}
                    </div>
                  </div>
                  <Badge value={tp.project_brand?.project?.status} />
                </Link>
              ))}
            </div>
          </div>

          {/* Project Logistics */}
          {eventDetails && eventDetails.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Project Logistics</h2>
              </div>
              {eventDetails.map(detail => (
                <div key={detail.id} className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3">{detail.event?.name ?? 'Unknown Project'}</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Carpet Date', detail.carpet_date],
                      ['Hotel', detail.hotel],
                      ['Ticket', detail.ticket],
                      ['Driver', detail.driver],
                      ['Makeup', detail.makeup],
                      ['Hair', detail.hair],
                      ['Dress', detail.dress],
                      ['Jewelry', detail.jewelry],
                      ['Shoes', detail.shoes],
                      ['Content', detail.content],
                      ['Agent', detail.agent_contact],
                    ].map(([label, val]) => val ? (
                      <div key={label as string}>
                        <dt className="text-xs text-gray-400">{label}</dt>
                        <dd className="text-sm text-gray-700">{truncate(val as string, 80)}</dd>
                      </div>
                    ) : null)}
                  </div>
                  {detail.extra_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 whitespace-pre-wrap">{detail.extra_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conversations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {!conversations?.length && <p className="px-5 py-4 text-sm text-gray-400">No conversations logged.</p>}
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

      {/* Add/Edit Contact Modal */}
      <Modal open={contactOpen} onClose={() => { setContactOpen(false); setEditContact(null) }} title={editContact ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Name</label>
              <Input value={contactForm.name} onChange={contactField('name')} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Role</label>
              <Input value={contactForm.role} onChange={contactField('role')} placeholder="e.g. Personal Assistant" />
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
            <Textarea value={convoForm.content} onChange={convoField('content')} rows={3} placeholder="What was discussed?" />
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
            <Input value={editConvoForm.follow_up} onChange={editConvoField('follow_up')} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditConvo(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Talent Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Talent">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Instagram URL</label>
              <Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok URL</label>
              <Input value={form.tiktok_link} onChange={field('tiktok_link')} placeholder="https://tiktok.com/@…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">IG Followers</label>
              <Input value={form.ig_followers} onChange={field('ig_followers')} placeholder="e.g. 250K" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">TikTok Followers</label>
              <Input value={form.tiktok_followers} onChange={field('tiktok_followers')} placeholder="e.g. 1.2M" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Country</label>
            <Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" />
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
