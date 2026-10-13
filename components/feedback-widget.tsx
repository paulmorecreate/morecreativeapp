'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user
      if (!user) return
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, surname, email')
        .eq('id', user.id)
        .single()
      if (profile) {
        const name = [profile.first_name, profile.surname].filter(Boolean).join(' ')
        setUserName(name || profile.email || user.email || null)
      } else {
        setUserName(user.email ?? null)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, page: pathname, userName, type }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setMessage('')
      setType('suggestion')
      setOpen(false)
    }, 2500)
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
      {/* Collapsed tab */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'bg-gray-800 text-white text-xs font-medium px-2.5 py-3 rounded-l-lg shadow-lg hover:bg-gray-700 transition-colors',
          '[writing-mode:vertical-rl] rotate-180 select-none',
          open && 'invisible'
        )}
      >
        Feedback
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="absolute right-0 w-72 bg-white border border-gray-200 rounded-l-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Send Feedback</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <p className="text-sm font-medium text-gray-900">Thanks!</p>
              <p className="text-xs text-gray-500">Your feedback has been sent.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug / Something&apos;s broken</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What would you like to change or report?"
                  rows={4}
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>
              <p className="text-xs text-gray-400 truncate">Page: {pathname}</p>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {sending ? 'Sending…' : 'Send Feedback'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
