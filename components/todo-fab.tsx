'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type UserProfile = {
  id: string
  email: string
  color: string | null
  first_name: string | null
  surname: string | null
}

function displayName(u: UserProfile) {
  return u.first_name || u.email.split('@')[0]
}

export function TodoFab() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('')
  const [deadline, setDeadline] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch user profiles once on mount
  useEffect(() => {
    createClient().from('user_profiles').select('*').then(({ data }) => {
      if (data) setUserProfiles(data)
    })
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setText('')
      setPriority('')
      setDeadline('')
      setAssignedTo([])
      setSuccess(false)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggleUser(id: string) {
    setAssignedTo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    await createClient().from('todos').insert({
      title: text.trim(),
      priority: priority || null,
      deadline: deadline || null,
      assigned_to: assignedTo,
    })
    setText('')
    setPriority('')
    setDeadline('')
    setAssignedTo([])
    setSuccess(true)
    setSubmitting(false)
    router.refresh()
    setTimeout(() => {
      setSuccess(false)
      inputRef.current?.focus()
    }, 1500)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-80 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Quick Add To Do</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="p-4 space-y-3">
            {/* Title */}
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 transition-colors"
              disabled={submitting}
            />

            {/* Deadline */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50 outline-none focus:border-gray-400 transition-colors"
                disabled={submitting}
              />
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50 outline-none"
                disabled={submitting}
              >
                <option value="">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Assigned To */}
            {userProfiles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Assign To</label>
                <div className="flex flex-wrap gap-1.5">
                  {userProfiles.map(u => {
                    const selected = assignedTo.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        disabled={submitting}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          selected ? 'border-gray-600 text-gray-800' : 'border-gray-200 text-gray-400 hover:border-gray-400'
                        }`}
                        style={selected && u.color ? { backgroundColor: u.color } : {}}
                      >
                        {displayName(u)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Submit row */}
            <div className="flex items-center justify-between pt-1">
              <span className={`text-xs transition-colors ${success ? 'text-green-600' : 'text-gray-400'}`}>
                {success ? '✓ Added to your list' : 'Press Enter to add'}
              </span>
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="text-xs font-medium px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '…' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-gray-900 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 transition-all"
        title="Quick add to do"
      >
        {open ? <X className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
      </button>
    </div>
  )
}
