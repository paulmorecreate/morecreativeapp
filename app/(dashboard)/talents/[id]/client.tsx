'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Talent, TalentEventDetail, Conversation, TalentCategory, TalentLevel } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { formatDate, truncate } from '@/lib/utils'
import { COUNTRIES } from '@/lib/constants/countries'

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

type AgentLink = { id: string; agent_id: string; agent: { id: string; name: string; agent_type: string | null } | null }
type StylistLink = { id: string; stylist_id: string; stylist: { id: string; name: string } | null }
type PersonLink = { id: string; person_id: string; person: { id: string; name: string; type: string | null } | null }
type SimpleAgent = { id: string; name: string; agent_type: string | null }
type SimpleStylist = { id: string; name: string }
type SimplePerson = { id: string; name: string; type: string | null }

type TalentProject = {
  id: string
  project_brand: {
    id: string; show_date: string | null
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
  stylistLinks: StylistLink[]
  personLinks: PersonLink[]
  talentCategories: TalentCategory[]
  allAgents: SimpleAgent[]
  allStylists: SimpleStylist[]
  allPeople: SimplePerson[]
  agentTypes: { id: string; name: string }[]
  allAgencies: { id: string; name: string }[]
  talentLevels: TalentLevel[]
}

export function TalentDetailClient({ talent, talentProjects, eventDetails, conversations, agentLinks, stylistLinks, personLinks, talentCategories, allAgents, allStylists, allPeople, agentTypes, allAgencies, talentLevels }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logConvoOpen, setLogConvoOpen] = useState(false)
  const [editConvo, setEditConvo] = useState<Conversation | null>(null)
  const [convoSaving, setConvoSaving] = useState(false)
  const [convoForm, setConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [editConvoForm, setEditConvoForm] = useState({ channel: 'note', content: '', follow_up: '', status: 'open' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Agent linking
  const [linkAgentOpen, setLinkAgentOpen] = useState(false)
  const [linkAgentMode, setLinkAgentMode] = useState<'existing' | 'new'>('existing')
  const [linkAgentId, setLinkAgentId] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('')
  const [newAgentAgencyId, setNewAgentAgencyId] = useState('')
  const [linkAgentSaving, setLinkAgentSaving] = useState(false)

  // Stylist linking
  const [linkStylistOpen, setLinkStylistOpen] = useState(false)
  const [linkStylistMode, setLinkStylistMode] = useState<'existing' | 'new'>('existing')
  const [linkStylistId, setLinkStylistId] = useState('')
  const [newStylistName, setNewStylistName] = useState('')
  const [linkStylistSaving, setLinkStylistSaving] = useState(false)

  // People linking
  const [linkPersonOpen, setLinkPersonOpen] = useState(false)
  const [linkPersonMode, setLinkPersonMode] = useState<'existing' | 'new'>('existing')
  const [linkPersonId, setLinkPersonId] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonType, setNewPersonType] = useState('')
  const [linkPersonSaving, setLinkPersonSaving] = useState(false)

  const [form, setForm] = useState({
    name: talent.name ?? '', ig_link: talent.ig_link ?? '', tiktok_link: talent.tiktok_link ?? '',
    ig_followers: talent.ig_followers ?? '', tiktok_followers: talent.tiktok_followers ?? '',
    category: talent.category ?? '', talent_level: talent.talent_level ?? '',
    country: talent.country ?? '', email: talent.email ?? '', phone: talent.phone ?? '', notes: talent.notes ?? '',
  })

  const categoryOpts = talentCategories.map(c => ({ value: c.name, label: c.name }))
  const levelOpts = talentLevels.map(l => ({ value: l.name, label: l.name }))
  const agentTypeOpts = agentTypes.map(t => ({ value: t.name, label: t.name }))

  const linkedAgentIds = new Set(agentLinks.map(l => l.agent_id))
  const availableAgents = allAgents.filter(a => !linkedAgentIds.has(a.id))
  const linkedStylistIds = new Set(stylistLinks.map(l => l.stylist_id))
  const availableStylists = allStylists.filter(s => !linkedStylistIds.has(s.id))
  const linkedPersonIds = new Set(personLinks.map(l => l.person_id))
  const availablePeople = allPeople.filter(p => !linkedPersonIds.has(p.id))

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('talents').delete().eq('id', talent.id)
    router.push('/talents')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('talents').update({
      name: form.name || null, ig_link: form.ig_link || null, tiktok_link: form.tiktok_link || null,
      ig_followers: form.ig_followers || null, tiktok_followers: form.tiktok_followers || null,
      category: form.category || null, talent_level: form.talent_level || null,
      country: form.country || null, email: form.email || null, phone: form.phone || null, notes: form.notes || null,
    }).eq('id', talent.id)
    setSaving(false); setOpen(false); router.refresh()
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
    await supabase.from('conversations').insert({ entity_type: 'talent', entity_id: talent.id, channel: convoForm.channel || null, content: convoForm.content || null, follow_up: convoForm.follow_up || null, status: convoForm.status })
    setConvoSaving(false); setLogConvoOpen(false)
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
    await supabase.from('conversations').update({ channel: editConvoForm.channel || null, content: editConvoForm.content || null, follow_up: editConvoForm.follow_up || null, status: editConvoForm.status }).eq('id', editConvo.id)
    setConvoSaving(false); setEditConvo(null); router.refresh()
  }

  // Agent
  function openLinkAgent() { setLinkAgentMode('existing'); setLinkAgentId(''); setNewAgentName(''); setNewAgentType(''); setNewAgentAgencyId(''); setLinkAgentOpen(true) }
  async function handleLinkAgent(e: React.FormEvent) {
    e.preventDefault(); setLinkAgentSaving(true)
    const supabase = createClient()
    let agentId = linkAgentId
    if (linkAgentMode === 'new' && newAgentName) {
      const { data } = await supabase.from('agents').insert({ name: newAgentName, agent_type: newAgentType || null, agency_id: newAgentAgencyId || null }).select('id').single()
      agentId = data?.id ?? ''
    }
    if (agentId) await supabase.from('talent_agents').insert({ talent_id: talent.id, agent_id: agentId })
    setLinkAgentSaving(false); setLinkAgentOpen(false); router.refresh()
  }
  async function unlinkAgent(linkId: string) {
    await createClient().from('talent_agents').delete().eq('id', linkId); router.refresh()
  }

  // Stylist
  function openLinkStylist() { setLinkStylistMode('existing'); setLinkStylistId(''); setNewStylistName(''); setLinkStylistOpen(true) }
  async function handleLinkStylist(e: React.FormEvent) {
    e.preventDefault(); setLinkStylistSaving(true)
    const supabase = createClient()
    let stylistId = linkStylistId
    if (linkStylistMode === 'new' && newStylistName) {
      const { data } = await supabase.from('stylists').insert({ name: newStylistName }).select('id').single()
      stylistId = data?.id ?? ''
    }
    if (stylistId) await supabase.from('talent_stylists').insert({ talent_id: talent.id, stylist_id: stylistId })
    setLinkStylistSaving(false); setLinkStylistOpen(false); router.refresh()
  }
  async function unlinkStylist(linkId: string) {
    await createClient().from('talent_stylists').delete().eq('id', linkId); router.refresh()
  }

  // Person
  function openLinkPerson() { setLinkPersonMode('existing'); setLinkPersonId(''); setNewPersonName(''); setNewPersonType(''); setLinkPersonOpen(true) }
  async function handleLinkPerson(e: React.FormEvent) {
    e.preventDefault(); setLinkPersonSaving(true)
    const supabase = createClient()
    let personId = linkPersonId
    if (linkPersonMode === 'new' && newPersonName) {
      const { data } = await supabase.from('people').insert({ name: newPersonName, type: newPersonType || null }).select('id').single()
      personId = data?.id ?? ''
    }
    if (personId) await supabase.from('talent_people').insert({ talent_id: talent.id, person_id: personId })
    setLinkPersonSaving(false); setLinkPersonOpen(false); router.refresh()
  }
  async function unlinkPerson(linkId: string) {
    await createClient().from('talent_people').delete().eq('id', linkId); router.refresh()
  }

  const modeBtn = (active: boolean, onClick: () => void, label: string) => (
    <button type="button" onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
      {label}
    </button>
  )

  return (
    <div>
      <div className="mb-6">
        <Link href="/talents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Talents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{talent.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {talent.ig_link && <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><ExternalLink className="w-3 h-3" /> Instagram</a>}
              {talent.tiktok_link && <a href={talent.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"><ExternalLink className="w-3 h-3" /> TikTok</a>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h2>
            <dl className="space-y-3">
              <div><dt className="text-xs text-gray-400 mb-0.5">Category</dt><dd><Badge value={talent.category} /></dd></div>
              <div><dt className="text-xs text-gray-400 mb-0.5">Talent Level</dt><dd className="text-sm text-gray-900">{talent.talent_level ?? <span className="text-gray-300">—</span>}</dd></div>
              <div><dt className="text-xs text-gray-400 mb-0.5">Country</dt><dd className="text-sm text-gray-900">{talent.country ?? <span className="text-gray-300">—</span>}</dd></div>
              <div><dt className="text-xs text-gray-400 mb-0.5">Email</dt><dd className="text-sm text-gray-900">{talent.email ? <a href={`mailto:${talent.email}`} className="hover:underline">{talent.email}</a> : <span className="text-gray-300">—</span>}</dd></div>
              <div><dt className="text-xs text-gray-400 mb-0.5">Phone</dt><dd className="text-sm text-gray-900">{talent.phone ?? <span className="text-gray-300">—</span>}</dd></div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">IG Followers</dt>
                <dd className="text-sm flex items-center gap-1.5">
                  <span className="text-gray-900">{talent.ig_followers ?? <span className="text-gray-300">—</span>}</span>
                  {talent.ig_link && <a href={talent.ig_link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700"><ExternalLink className="w-3 h-3" /></a>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">TikTok Followers</dt>
                <dd className="text-sm flex items-center gap-1.5">
                  <span className="text-gray-900">{talent.tiktok_followers ?? <span className="text-gray-300">—</span>}</span>
                  {talent.tiktok_link && <a href={talent.tiktok_link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700"><ExternalLink className="w-3 h-3" /></a>}
                </dd>
              </div>
            </dl>
          </div>

          {/* Agents */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agent</h2>
              <button onClick={openLinkAgent} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><Plus className="w-3 h-3" /> Link</button>
            </div>
            <div className="divide-y divide-gray-50">
              {agentLinks.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No agent linked.</p>}
              {agentLinks.map(link => (
                <div key={link.id} className="group flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <Link href={`/agents/${link.agent?.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{link.agent?.name ?? '—'}</div>
                    {link.agent?.agent_type && <div className="text-xs text-gray-400 mt-0.5">{link.agent.agent_type}</div>}
                  </Link>
                  <button onClick={() => unlinkAgent(link.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-3 shrink-0" title="Remove link"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Stylists */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stylist</h2>
              <button onClick={openLinkStylist} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><Plus className="w-3 h-3" /> Link</button>
            </div>
            <div className="divide-y divide-gray-50">
              {stylistLinks.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No stylist linked.</p>}
              {stylistLinks.map(link => (
                <div key={link.id} className="group flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <Link href={`/stylists/${link.stylist?.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{link.stylist?.name ?? '—'}</div>
                  </Link>
                  <button onClick={() => unlinkStylist(link.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-3 shrink-0" title="Remove link"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* People */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">People</h2>
              <button onClick={openLinkPerson} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><Plus className="w-3 h-3" /> Link</button>
            </div>
            <div className="divide-y divide-gray-50">
              {personLinks.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No people linked.</p>}
              {personLinks.map(link => (
                <div key={link.id} className="group flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <Link href={`/people/${link.person?.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{link.person?.name ?? '—'}</div>
                    {link.person?.type && <div className="text-xs text-gray-400 mt-0.5">{link.person.type}</div>}
                  </Link>
                  <button onClick={() => unlinkPerson(link.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-3 shrink-0" title="Remove link"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
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
              <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Project Logistics</h2></div>
              {eventDetails.map(detail => (
                <div key={detail.id} className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3">{detail.event?.name ?? 'Unknown Project'}</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[['Carpet Date', detail.carpet_date],['Hotel', detail.hotel],['Ticket', detail.ticket],['Driver', detail.driver],['Makeup', detail.makeup],['Hair', detail.hair],['Dress', detail.dress],['Jewelry', detail.jewelry],['Shoes', detail.shoes],['Content', detail.content],['Agent', detail.agent_contact]].map(([label, val]) => val ? (
                      <div key={label as string}><dt className="text-xs text-gray-400">{label}</dt><dd className="text-sm text-gray-700">{truncate(val as string, 80)}</dd></div>
                    ) : null)}
                  </div>
                  {detail.extra_notes && <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-xs text-gray-500 whitespace-pre-wrap">{detail.extra_notes}</p></div>}
                </div>
              ))}
            </div>
          )}

          {/* Conversations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              <button onClick={() => setLogConvoOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"><Plus className="w-3 h-3" /> Log</button>
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
                    <button onClick={() => openEditConvo(c)} className="text-gray-200 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3" /></button>
                  </div>
                  {c.content && <p className="text-sm text-gray-700">{c.content}</p>}
                  {c.follow_up && <p className="text-xs text-amber-600 mt-1">↳ {c.follow_up}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Conversation */}
      <Modal open={logConvoOpen} onClose={() => setLogConvoOpen(false)} title="Log Conversation">
        <form onSubmit={handleLogConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Channel</label><Select value={convoForm.channel} onChange={convoField('channel')} options={channelOpts} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Status</label><Select value={convoForm.status} onChange={convoField('status')} options={convoStatusOpts} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Content</label><Textarea value={convoForm.content} onChange={convoField('content')} rows={3} placeholder="What was discussed?" /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Follow-up required</label><Input value={convoForm.follow_up} onChange={convoField('follow_up')} placeholder="What needs to happen next?" /></div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLogConvoOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Log It'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Conversation */}
      <Modal open={!!editConvo} onClose={() => setEditConvo(null)} title="Edit Conversation">
        <form onSubmit={handleEditConvo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Channel</label><Select value={editConvoForm.channel} onChange={editConvoField('channel')} options={channelOpts} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Status</label><Select value={editConvoForm.status} onChange={editConvoField('status')} options={convoStatusOpts} /></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Content</label><Textarea value={editConvoForm.content} onChange={editConvoField('content')} rows={3} /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Follow-up required</label><Input value={editConvoForm.follow_up} onChange={editConvoField('follow_up')} /></div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditConvo(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={convoSaving} className="flex-1">{convoSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Link Agent */}
      <Modal open={linkAgentOpen} onClose={() => setLinkAgentOpen(false)} title="Link Agent">
        <form onSubmit={handleLinkAgent} className="space-y-4">
          <div className="flex gap-2">
            {modeBtn(linkAgentMode === 'existing', () => { setLinkAgentMode('existing'); setNewAgentName(''); setNewAgentType('') }, 'Select existing')}
            {modeBtn(linkAgentMode === 'new', () => { setLinkAgentMode('new'); setLinkAgentId('') }, 'Add new agent')}
          </div>
          {linkAgentMode === 'existing' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Agent</label>
              <Select value={linkAgentId} onChange={e => setLinkAgentId(e.target.value)} options={availableAgents.map(a => ({ value: a.id, label: a.name + (a.agent_type ? ` · ${a.agent_type}` : '') }))} placeholder={availableAgents.length ? 'Select agent…' : 'All agents already linked'} />
            </div>
          )}
          {linkAgentMode === 'new' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Agent Name *</label><Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Full name" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Agent Type</label><Select value={newAgentType} onChange={e => setNewAgentType(e.target.value)} options={agentTypeOpts} placeholder="Select type…" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Agency</label><Select value={newAgentAgencyId} onChange={e => setNewAgentAgencyId(e.target.value)} options={allAgencies.map(a => ({ value: a.id, label: a.name }))} placeholder="Select agency (optional)…" /></div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLinkAgentOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={linkAgentSaving || (linkAgentMode === 'existing' ? !linkAgentId : !newAgentName)} className="flex-1">
              {linkAgentSaving ? 'Saving…' : linkAgentMode === 'new' ? 'Create & Link' : 'Link Agent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Stylist */}
      <Modal open={linkStylistOpen} onClose={() => setLinkStylistOpen(false)} title="Link Stylist">
        <form onSubmit={handleLinkStylist} className="space-y-4">
          <div className="flex gap-2">
            {modeBtn(linkStylistMode === 'existing', () => { setLinkStylistMode('existing'); setNewStylistName('') }, 'Select existing')}
            {modeBtn(linkStylistMode === 'new', () => { setLinkStylistMode('new'); setLinkStylistId('') }, 'Add new stylist')}
          </div>
          {linkStylistMode === 'existing' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Stylist</label>
              <Select value={linkStylistId} onChange={e => setLinkStylistId(e.target.value)} options={availableStylists.map(s => ({ value: s.id, label: s.name }))} placeholder={availableStylists.length ? 'Select stylist…' : 'All stylists already linked'} />
            </div>
          )}
          {linkStylistMode === 'new' && (
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Name *</label><Input value={newStylistName} onChange={e => setNewStylistName(e.target.value)} placeholder="Full name" /></div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLinkStylistOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={linkStylistSaving || (linkStylistMode === 'existing' ? !linkStylistId : !newStylistName)} className="flex-1">
              {linkStylistSaving ? 'Saving…' : linkStylistMode === 'new' ? 'Create & Link' : 'Link Stylist'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Link Person */}
      <Modal open={linkPersonOpen} onClose={() => setLinkPersonOpen(false)} title="Link Person">
        <form onSubmit={handleLinkPerson} className="space-y-4">
          <div className="flex gap-2">
            {modeBtn(linkPersonMode === 'existing', () => { setLinkPersonMode('existing'); setNewPersonName(''); setNewPersonType('') }, 'Select existing')}
            {modeBtn(linkPersonMode === 'new', () => { setLinkPersonMode('new'); setLinkPersonId('') }, 'Add new person')}
          </div>
          {linkPersonMode === 'existing' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Person</label>
              <Select value={linkPersonId} onChange={e => setLinkPersonId(e.target.value)} options={availablePeople.map(p => ({ value: p.id, label: p.name + (p.type ? ` · ${p.type}` : '') }))} placeholder={availablePeople.length ? 'Select person…' : 'All people already linked'} />
            </div>
          )}
          {linkPersonMode === 'new' && (
            <div className="space-y-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Name *</label><Input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Full name" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Type</label><Input value={newPersonType} onChange={e => setNewPersonType(e.target.value)} placeholder="e.g. PR, Journalist…" /></div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setLinkPersonOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={linkPersonSaving || (linkPersonMode === 'existing' ? !linkPersonId : !newPersonName)} className="flex-1">
              {linkPersonSaving ? 'Saving…' : linkPersonMode === 'new' ? 'Create & Link' : 'Link Person'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Talent */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Talent">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This will permanently delete <strong>{talent.name}</strong> and all associated data. This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">{deleting ? 'Deleting…' : 'Delete Talent'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Talent */}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Talent">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Name</label><Input value={form.name} onChange={field('name')} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Category</label><Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Talent Level</label><Select value={form.talent_level} onChange={field('talent_level')} options={levelOpts} placeholder="Select…" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Email</label><Input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Phone</label><Input value={form.phone} onChange={field('phone')} placeholder="+1 555 000 0000" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Instagram URL</label><Input value={form.ig_link} onChange={field('ig_link')} placeholder="https://instagram.com/…" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">TikTok URL</label><Input value={form.tiktok_link} onChange={field('tiktok_link')} placeholder="https://tiktok.com/@…" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">IG Followers</label><Input value={form.ig_followers} onChange={field('ig_followers')} placeholder="e.g. 250K" /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">TikTok Followers</label><Input value={form.tiktok_followers} onChange={field('tiktok_followers')} placeholder="e.g. 1.2M" /></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Country</label><Select value={form.country} onChange={field('country')} options={COUNTRIES} placeholder="Select…" /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-gray-700">Notes</label><Textarea value={form.notes} onChange={field('notes')} rows={3} /></div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
