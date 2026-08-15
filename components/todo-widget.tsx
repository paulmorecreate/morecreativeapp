'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Todo = {
  id: string
  title: string
  completed: boolean
  created_at: string
  date_added: string | null // "YYYY-MM-DD" — user-editable, falls back to created_at
  priority: 'low' | 'medium' | 'high' | null
  assigned_to: string[]
  deadline: string | null // "YYYY-MM-DD"
}

type UserProfile = {
  id: string
  email: string
  color: string | null
  first_name: string | null
  surname: string | null
}

type SortField = 'title' | 'date' | 'assigned' | 'deadline' | 'priority' | null
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 5
const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }
const PRIORITY_STYLES = {
  high:   { label: 'High', bg: 'bg-red-50',   text: 'text-red-600' },
  medium: { label: 'Med',  bg: 'bg-amber-50',  text: 'text-amber-600' },
  low:    { label: 'Low',  bg: 'bg-gray-100',  text: 'text-gray-500' },
}

function displayName(u: UserProfile) {
  return u.first_name || u.email.split('@')[0]
}

function rowColor(todo: Todo, users: UserProfile[]): string | null {
  if (todo.assigned_to?.length === 1) {
    return users.find(u => u.id === todo.assigned_to[0])?.color ?? null
  }
  return null
}

function assignedText(ids: string[], users: UserProfile[]) {
  if (!ids?.length) return ''
  return ids.map(id => {
    const u = users.find(u => u.id === id)
    return u ? displayName(u) : ''
  }).filter(Boolean).join(', ')
}

// Format any date string ("YYYY-MM-DD" or ISO timestamp) as "21 Jul"
function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Effective date for display and sorting: user-set date_added, else created_at date portion
function effectiveDateAdded(todo: Todo): string {
  return todo.date_added ?? todo.created_at.split('T')[0]
}

// Deadline is overdue if it is strictly before today (today itself is not overdue)
function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = deadline.split('-').map(Number)
  return new Date(y, m - 1, d) < today
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-300 inline ml-0.5" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-gray-600 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 text-gray-600 inline ml-0.5" />
}

function AssignedCell({ ids, users }: { ids: string[]; users: UserProfile[] }) {
  if (!ids?.length) return <span className="text-gray-300">—</span>
  const assigned = ids.map(id => users.find(u => u.id === id)).filter(Boolean) as UserProfile[]
  if (!assigned.length) return <span className="text-gray-300">—</span>
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assigned.map(u => (
        <span key={u.id} className="flex items-center gap-1">
          {u.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
              style={{ backgroundColor: u.color, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }}
            />
          )}
          <span>{displayName(u)}</span>
        </span>
      ))}
    </div>
  )
}

function UserToggle({ profile, selected, onToggle }: { profile: UserProfile; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${displayName(profile)} (${profile.email})`}
      className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
        selected ? 'border-gray-600 text-gray-800' : 'border-gray-200 text-gray-400 hover:border-gray-400'
      }`}
      style={selected && profile.color ? { backgroundColor: profile.color } : {}}
    >
      {displayName(profile)}
    </button>
  )
}

export function TodoWidget({ todos, userProfiles }: { todos: Todo[]; userProfiles: UserProfile[] }) {
  const router = useRouter()
  const [localTodos, setLocalTodos] = useState(todos)
  const [showCompleted, setShowCompleted] = useState(false)
  // Default: oldest first by date added
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editAssigned, setEditAssigned] = useState<string[]>([])
  const [editDateAdded, setEditDateAdded] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('')
  const [newAssigned, setNewAssigned] = useState<string[]>([])
  const [newDeadline, setNewDeadline] = useState('')
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUsers, setFilterUsers] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const editTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocalTodos(todos) }, [todos])

  const pendingCount = localTodos.filter(t => !t.completed).length

  const visible = localTodos
    .filter(t => showCompleted || !t.completed)
    .filter(t => !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(t => filterUsers.length === 0 || filterUsers.some(uid => t.assigned_to?.includes(uid)))

  const sorted = [...visible].sort((a, b) => {
    if (!sortField) return 0
    let cmp = 0
    if (sortField === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortField === 'date') cmp = effectiveDateAdded(a).localeCompare(effectiveDateAdded(b))
    else if (sortField === 'priority') cmp = (PRIORITY_RANK[a.priority ?? ''] ?? 0) - (PRIORITY_RANK[b.priority ?? ''] ?? 0)
    else if (sortField === 'assigned') cmp = assignedText(a.assigned_to, userProfiles).localeCompare(assignedText(b.assigned_to, userProfiles))
    else if (sortField === 'deadline') {
      // nulls sort last regardless of direction
      if (!a.deadline && !b.deadline) cmp = 0
      else if (!a.deadline) return 1
      else if (!b.deadline) return -1
      else cmp = a.deadline.localeCompare(b.deadline)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  useEffect(() => {
    if (editingId) setTimeout(() => editTitleRef.current?.focus(), 30)
  }, [editingId])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function startEdit(todo: Todo) {
    if (todo.completed) return
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditPriority(todo.priority ?? '')
    setEditAssigned(todo.assigned_to ?? [])
    setEditDateAdded(effectiveDateAdded(todo))
    setEditDeadline(todo.deadline ?? '')
    setConfirmingId(null)
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) { setEditingId(null); return }
    const id = editingId
    const updates = {
      title: editTitle.trim(),
      priority: (editPriority || null) as 'low' | 'medium' | 'high' | null,
      assigned_to: editAssigned,
      date_added: editDateAdded || null,
      deadline: editDeadline || null,
    }
    setLocalTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    setEditingId(null)
    await createClient().from('todos').update(updates).eq('id', id)
    router.refresh()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    await createClient().from('todos').insert({
      title: newTitle.trim(),
      priority: newPriority || null,
      assigned_to: newAssigned,
      deadline: newDeadline || null,
    })
    setNewTitle(''); setNewPriority(''); setNewAssigned([]); setNewDeadline('')
    setAdding(false)
    router.refresh()
  }

  async function toggleComplete(todo: Todo) {
    await createClient().from('todos').update({ completed: !todo.completed }).eq('id', todo.id)
    router.refresh()
  }

  async function deleteTodo(id: string) {
    await createClient().from('todos').delete().eq('id', id)
    router.refresh()
  }

  function toggleAssign(userId: string, current: string[], set: (v: string[]) => void) {
    set(current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">To Do</h2>
          {pendingCount > 0 && (
            <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </div>
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 text-gray-700 placeholder-gray-400 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors shrink-0">
          <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900" />
          Show Completed
        </label>
      </div>
      {/* Assigned To filter pills */}
      {userProfiles.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 bg-gray-50/40">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide shrink-0">Filter</span>
          <button
            onClick={() => setFilterUsers([])}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
              filterUsers.length === 0 ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            All
          </button>
          {userProfiles.map(u => {
            const active = filterUsers.includes(u.id)
            return (
              <button
                key={u.id}
                onClick={() => setFilterUsers(prev =>
                  prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                )}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                  active ? 'border-gray-600 text-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
                style={active && u.color ? { backgroundColor: u.color } : {}}
              >
                {u.color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: u.color, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }} />
                )}
                {displayName(u)}
              </button>
            )
          })}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-100">
            <th className="w-8 px-3 py-3" />
            <th className="text-left align-top px-3 py-3 font-bold text-gray-800 text-xs uppercase tracking-wider cursor-pointer hover:text-black select-none" onClick={() => toggleSort('title')}>
              Task <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className="text-left align-top px-3 py-3 font-bold text-gray-800 text-xs uppercase tracking-wider cursor-pointer hover:text-black select-none w-24" onClick={() => toggleSort('date')}>
              Date Added <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className="text-left align-top px-3 py-3 font-bold text-gray-800 text-xs uppercase tracking-wider cursor-pointer hover:text-black select-none w-32" onClick={() => toggleSort('assigned')}>
              Assigned To <SortIcon field="assigned" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className="text-left align-top px-3 py-3 font-bold text-gray-800 text-xs uppercase tracking-wider cursor-pointer hover:text-black select-none w-28" onClick={() => toggleSort('deadline')}>
              Deadline <SortIcon field="deadline" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className="text-left align-top px-3 py-3 font-bold text-gray-800 text-xs uppercase tracking-wider cursor-pointer hover:text-black select-none w-20" onClick={() => toggleSort('priority')}>
              Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} />
            </th>
            <th className="w-8 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">

          {/* Add row */}
          <tr className="bg-gray-50/30">
            <td className="px-3 py-2.5">
              <Plus className="w-3.5 h-3.5 text-gray-300" />
            </td>
            <td className="px-3 py-2.5" colSpan={6}>
              <form onSubmit={handleAdd} className="flex items-center gap-3 flex-wrap">
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Add a new item…"
                  disabled={adding}
                  className="flex-1 min-w-32 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none"
                />
                {newTitle.trim() && (
                  <>
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={e => setNewDeadline(e.target.value)}
                      title="Deadline"
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white outline-none"
                    />
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white outline-none"
                    >
                      <option value="">Priority…</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    {userProfiles.length > 0 && (
                      <div className="flex items-center gap-1">
                        {userProfiles.map(u => (
                          <UserToggle key={u.id} profile={u} selected={newAssigned.includes(u.id)} onToggle={() => toggleAssign(u.id, newAssigned, setNewAssigned)} />
                        ))}
                      </div>
                    )}
                    <button type="submit" disabled={adding} className="text-xs font-medium text-white bg-gray-900 px-2.5 py-1 rounded-md hover:bg-gray-700 transition-colors">
                      {adding ? '…' : 'Add'}
                    </button>
                  </>
                )}
              </form>
            </td>
          </tr>

          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-400">
                {localTodos.length === 0 ? 'Nothing here yet.' : (searchQuery || filterUsers.length > 0) ? 'No tasks match.' : !showCompleted ? 'All done!' : 'No items.'}
              </td>
            </tr>
          )}

          {(showAll ? sorted : sorted.slice(0, PAGE_SIZE)).map(todo => {
            const bgColor = rowColor(todo, userProfiles)
            const overdue = isOverdue(todo.deadline)
            const isEditing = editingId === todo.id
            const isConfirming = confirmingId === todo.id

            if (isEditing) {
              return (
                <tr key={todo.id} className="bg-blue-50/30">
                  <td className="px-3 py-2.5">
                    <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      ref={editTitleRef}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      className="w-full text-sm text-gray-900 bg-transparent outline-none border-b border-gray-400 focus:border-gray-700 pb-px"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={editDateAdded}
                      onChange={e => setEditDateAdded(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white outline-none w-full"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {userProfiles.map(u => (
                        <UserToggle key={u.id} profile={u} selected={editAssigned.includes(u.id)} onToggle={() => toggleAssign(u.id, editAssigned, setEditAssigned)} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white outline-none w-full"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white outline-none w-full"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={saveEdit} className="text-xs font-medium text-gray-900 hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
                    </div>
                  </td>
                </tr>
              )
            }

            if (isConfirming) {
              return (
                <tr key={todo.id} className="bg-amber-50/40">
                  <td className="px-3 py-2.5">
                    <div className="w-4 h-4 rounded border border-gray-300" />
                  </td>
                  <td className="px-3 py-2.5" colSpan={5}>
                    <span className="text-sm text-gray-600">Mark <span className="font-medium">{todo.title}</span> as complete?</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { toggleComplete(todo); setConfirmingId(null) }} className="text-xs font-medium text-white bg-gray-900 px-2.5 py-1 rounded-md hover:bg-gray-700">Yes</button>
                      <button onClick={() => setConfirmingId(null)} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
                    </div>
                  </td>
                </tr>
              )
            }

            return (
              <tr
                key={todo.id}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
                className={`group transition-colors ${todo.completed ? 'opacity-60' : 'cursor-pointer'} ${!bgColor ? 'hover:bg-gray-50/50' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => todo.completed ? toggleComplete(todo) : setConfirmingId(todo.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      todo.completed ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {todo.completed && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-gray-900" onClick={() => startEdit(todo)}>
                  <span className={todo.completed ? 'line-through text-gray-400' : ''}>{todo.title}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-400 text-xs w-24" onClick={() => startEdit(todo)}>
                  {fmtDate(effectiveDateAdded(todo))}
                </td>
                <td className="px-3 py-2.5 text-gray-600 text-xs w-32" onClick={() => startEdit(todo)}>
                  <AssignedCell ids={todo.assigned_to} users={userProfiles} />
                </td>
                <td className="px-3 py-2.5 w-28" onClick={() => startEdit(todo)}>
                  {todo.deadline ? (
                    <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {overdue && <AlertCircle className="w-3 h-3 shrink-0" />}
                      {fmtDate(todo.deadline)}
                      {overdue && <span className="text-[10px] font-medium bg-red-100 text-red-600 px-1 py-0.5 rounded ml-0.5">Overdue</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 w-20" onClick={() => startEdit(todo)}>
                  {todo.priority ? (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLES[todo.priority].bg} ${PRIORITY_STYLES[todo.priority].text}`}>
                      {PRIORITY_STYLES[todo.priority].label}
                    </span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-2.5 w-8">
                  <button
                    onClick={e => { e.stopPropagation(); deleteTodo(todo.id) }}
                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            )
          })}
          {sorted.length > PAGE_SIZE && (
            <tr>
              <td colSpan={7} className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/40">
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors flex items-center gap-1"
                >
                  {showAll
                    ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> Show {sorted.length - PAGE_SIZE} more</>
                  }
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
