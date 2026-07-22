'use client'

import { useState, useRef, useEffect } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function TodoFab() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setText('')
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setSubmitting(true)
    await createClient().from('todos').insert({ title: text.trim() })
    setText('')
    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => {
      setSuccess(false)
      inputRef.current?.focus()
    }, 1500)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-72 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Quick Add To Do</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="p-4">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 transition-colors"
              disabled={submitting}
            />
            <div className="flex items-center justify-between mt-3">
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
