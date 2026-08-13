'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Globe, MapPin, Trash2, CalendarPlus, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { ScheduleEvent, ProjectCategory } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  events: ScheduleEvent[]
  categories: ProjectCategory[]
}

const IMPORTANCE_OPTS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const IMPORTANCE_BORDER: Record<string, string> = {
  high: 'border-l-4 border-l-rose-500',
  medium: 'border-l-4 border-l-amber-400',
  low: 'border-l-4 border-l-slate-300',
}

const emptyEventForm = { title: '', category: 'global' as 'global' | 'regional' | 'custom', region: '', importance: 'medium' as 'high' | 'medium' | 'low' }
const emptyProjectForm = { name: '', location: '', category: '', start_date: '', end_date: '', notes: '' }

export function ScheduleClient({ events, categories }: Props) {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [year, setYear] = useState(2026)

  const [addMonth, setAddMonth] = useState<number | null>(null)
  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [savingEvent, setSavingEvent] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editTarget, setEditTarget] = useState<ScheduleEvent | null>(null)
  const [editForm, setEditForm] = useState(emptyEventForm)
  const [savingEdit, setSavingEdit] = useState(false)

  const [projectSource, setProjectSource] = useState<ScheduleEvent | null>(null)
  const [projectForm, setProjectForm] = useState(emptyProjectForm)
  const [savingProject, setSavingProject] = useState(false)

  const byMonth = useMemo(() => {
    const map: Record<number, { global: ScheduleEvent[]; regional: ScheduleEvent[]; custom: ScheduleEvent[] }> = {}
    for (let m = 1; m <= 12; m++) map[m] = { global: [], regional: [], custom: [] }
    for (const e of events) {
      if (e.year === year && map[e.month]) {
        map[e.month][e.category].push(e)
      }
    }
    return map
  }, [events, year])

  function eventField(k: keyof typeof eventForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEventForm(f => ({ ...f, [k]: e.target.value }))
  }

  function projectField(k: keyof typeof projectForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setProjectForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!addMonth) return
    setSavingEvent(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('schedule_events').insert({
      title: eventForm.title,
      month: addMonth,
      year,
      category: eventForm.category,
      region: eventForm.region || null,
      importance: eventForm.importance,
      created_by: user?.email ?? null,
    })
    setSavingEvent(false)
    setAddMonth(null)
    setEventForm(emptyEventForm)
    router.refresh()
  }

  function openEdit(ev: ScheduleEvent) {
    setEditTarget(ev)
    setEditForm({ title: ev.title, category: ev.category, region: ev.region ?? '', importance: ev.importance })
  }

  function editField(k: keyof typeof editForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleEditEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSavingEdit(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('schedule_events').update({
      title: editForm.title,
      category: editForm.category,
      region: editForm.region || null,
      importance: editForm.importance,
      updated_by: user?.email ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', editTarget.id)
    setSavingEdit(false)
    setEditTarget(null)
    router.refresh()
  }

  async function handleDeleteEvent() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('schedule_events').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  function openCreateProject(ev: ScheduleEvent) {
    setProjectForm({ ...emptyProjectForm, name: ev.title })
    setProjectSource(ev)
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectSource) return
    setSavingProject(true)
    const supabase = createClient()
    const payload = Object.fromEntries(
      Object.entries(projectForm).map(([k, v]) => [k, v || null])
    )
    payload.name = projectForm.name
    const { data } = await supabase.from('events').insert(payload).select('id').single()
    if (data?.id) {
      await supabase.from('schedule_events').update({ project_id: data.id }).eq('id', projectSource.id)
    }
    setSavingProject(false)
    setProjectSource(null)
    setProjectForm(emptyProjectForm)
    if (data?.id) router.push(`/projects/${data.id}`)
    else router.refresh()
  }

  const categoryOpts = categories.map(c => ({ value: c.name, label: c.name }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Annual events calendar — hover any event to reveal create-project and delete actions</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-10 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MONTHS.map((monthName, idx) => {
          const month = idx + 1
          const { global: globalEvts, regional: regionalEvts, custom: customEvts } = byMonth[month]
          const totalCount = globalEvts.length + regionalEvts.length + customEvts.length
          const isPast = year < currentYear || (year === currentYear && month < currentMonth)

          return (
            <div
              key={month}
              className={cn(
                'bg-white border rounded-xl flex flex-col',
                isPast ? 'border-gray-100 opacity-60' : 'border-gray-200'
              )}
            >
              {/* Month header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className={cn('font-semibold text-sm', isPast ? 'text-gray-400' : 'text-gray-900')}>
                  {monthName}
                </h2>
                <span className="text-xs text-gray-400">{totalCount} event{totalCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Events */}
              <div className="flex-1 px-3 py-3 space-y-3 min-h-[60px]">
                {globalEvts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Globe className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Global</span>
                    </div>
                    <div className="space-y-0.5">
                      {globalEvts.map(ev => (
                        <EventRow key={ev.id} event={ev} onCreateProject={() => openCreateProject(ev)} onEdit={openEdit} onDelete={setDeleteTarget} />
                      ))}
                    </div>
                  </div>
                )}

                {regionalEvts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Regional</span>
                    </div>
                    <div className="space-y-0.5">
                      {regionalEvts.map(ev => (
                        <EventRow key={ev.id} event={ev} onCreateProject={() => openCreateProject(ev)} onEdit={openEdit} onDelete={setDeleteTarget} />
                      ))}
                    </div>
                  </div>
                )}

                {customEvts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Plus className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Custom</span>
                    </div>
                    <div className="space-y-0.5">
                      {customEvts.map(ev => (
                        <EventRow key={ev.id} event={ev} onCreateProject={() => openCreateProject(ev)} onEdit={openEdit} onDelete={setDeleteTarget} />
                      ))}
                    </div>
                  </div>
                )}

                {totalCount === 0 && (
                  <p className="text-xs text-gray-300 italic">No events yet</p>
                )}
              </div>

              {/* Add event */}
              <div className="px-3 pb-3">
                <button
                  onClick={() => { setAddMonth(month); setEventForm(emptyEventForm) }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-dashed border-gray-200 hover:border-gray-300 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add event
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Event Modal */}
      <Modal
        open={addMonth !== null}
        title={addMonth ? `Add Event — ${MONTHS[addMonth - 1]} ${year}` : 'Add Event'}
        onClose={() => setAddMonth(null)}
      >
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Event name *</label>
            <Input
              value={eventForm.title}
              onChange={eventField('title')}
              required
              autoFocus
              placeholder="e.g. Dubai Design Week"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select
              value={eventForm.category}
              onChange={eventField('category')}
              options={[
                { value: 'global', label: 'Global' },
                { value: 'regional', label: 'Regional' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Region / Market (optional)</label>
            <Input
              value={eventForm.region}
              onChange={eventField('region')}
              placeholder="e.g. ME, CN, UK, US"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Importance</label>
            <Select value={eventForm.importance} onChange={eventField('importance')} options={IMPORTANCE_OPTS} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setAddMonth(null)}>Cancel</Button>
            <Button type="submit" disabled={savingEvent || !eventForm.title.trim()}>
              {savingEvent ? 'Saving…' : 'Add Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        title="Delete event?"
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-sm text-gray-600 mb-5">
          Remove <span className="font-medium text-gray-900">{deleteTarget?.title}</span> from the schedule? This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteEvent} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        open={!!editTarget}
        title="Edit Event"
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleEditEvent} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Event name *</label>
            <Input value={editForm.title} onChange={editField('title')} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select
              value={editForm.category}
              onChange={editField('category')}
              options={[
                { value: 'global', label: 'Global' },
                { value: 'regional', label: 'Regional' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Region / Market (optional)</label>
            <Input value={editForm.region} onChange={editField('region')} placeholder="e.g. ME, CN, UK, US" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Importance</label>
            <Select value={editForm.importance} onChange={editField('importance')} options={IMPORTANCE_OPTS} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={savingEdit || !editForm.title.trim()}>
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        open={projectSource !== null}
        title="Create Project"
        onClose={() => setProjectSource(null)}
      >
        <p className="text-sm text-gray-500 mb-4">Pre-filled from schedule event. Add details then save.</p>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Project name *</label>
            <Input value={projectForm.name} onChange={projectField('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start date</label>
              <Input type="date" value={projectForm.start_date} onChange={projectField('start_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End date</label>
              <Input type="date" value={projectForm.end_date} onChange={projectField('end_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Location</label>
            <Input value={projectForm.location} onChange={projectField('location')} placeholder="City, Country" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category</label>
            <Select
              value={projectForm.category}
              onChange={projectField('category')}
              options={[{ value: '', label: 'Select category…' }, ...categoryOpts]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={projectForm.notes} onChange={projectField('notes')} rows={3} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setProjectSource(null)}>Cancel</Button>
            <Button type="submit" disabled={savingProject || !projectForm.name.trim()}>
              {savingProject ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function EventRow({
  event,
  onCreateProject,
  onEdit,
  onDelete,
}: {
  event: ScheduleEvent
  onCreateProject: (title: string) => void
  onEdit: (ev: ScheduleEvent) => void
  onDelete: (ev: ScheduleEvent) => void
}) {
  return (
    <div className={cn('group flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-gray-50 transition-colors pl-2', IMPORTANCE_BORDER[event.importance])}>
      <span className="flex-1 text-xs text-gray-700 leading-tight">{event.title}</span>
      {event.region && (
        <span className="shrink-0 text-[9px] font-semibold text-gray-400 bg-gray-100 rounded px-1 py-0.5 uppercase">
          {event.region}
        </span>
      )}
      {event.project_id ? (
        <Link
          href={`/projects/${event.project_id}`}
          title="View project"
          className="shrink-0 p-1 rounded text-emerald-500 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all"
          onClick={e => e.stopPropagation()}
        >
          <CalendarPlus className="w-3 h-3" />
        </Link>
      ) : (
        <button
          onClick={() => onCreateProject(event.title)}
          title="Create project from this event"
          className="shrink-0 p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <CalendarPlus className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={() => onEdit(event)}
        title="Edit event"
        className="shrink-0 p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={() => onDelete(event)}
        title="Delete event"
        className="shrink-0 p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
