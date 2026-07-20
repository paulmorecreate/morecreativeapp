'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-black mb-4">
            <span className="text-white font-bold text-sm tracking-wider">MC</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sent ? "Check your inbox" : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                A password reset link has been sent to <strong>{email}</strong>. Check your inbox and click the link to set a new password.
              </p>
              <Link
                href="/login"
                className="block text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@morecreative.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <Link
                href="/login"
                className="block text-center text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                ← Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
