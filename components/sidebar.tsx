'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Briefcase, Calendar, Settings, LogOut, Scissors, Camera, Building2, Users2, Receipt, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/supabase/types'
import pkg from '@/package.json'

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Calendar },
]

const directoryNav = [
  { href: '/talents', label: 'Talents', icon: Users },
  { href: '/brands', label: 'Brands', icon: Briefcase },
  { href: '/agencies', label: 'Agencies', icon: Building2 },
  { href: '/stylists', label: 'Stylists', icon: Scissors },
  { href: '/photographers', label: 'Photographers', icon: Camera },
  { href: '/people', label: 'People', icon: Users2 },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      setUserEmail(user.email ?? null)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserRole((profile?.role as UserRole) ?? 'general')
    })
  }, [])

  async function changePassword() {
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess(false)
        setNewPassword('')
        setConfirmPassword('')
      }, 1500)
    }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLink({ href, label, icon: Icon, indent }: { href: string; label: string; icon: React.ElementType; indent?: boolean }) {
    const active = pathname === href ||
      (href !== '/dashboard' && pathname.startsWith(href)) ||
      (href === '/agencies' && pathname.startsWith('/agents'))
    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all',
          indent ? 'pl-7 pr-3' : 'px-3',
          active
            ? 'bg-white/10 text-white font-medium'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-zinc-950 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-zinc-800">
        <Image src="/mc-logo.jpg" alt="MoreCreative Operations Portal" width={28} height={28} className="rounded-lg shrink-0 object-cover" />
        <span className="text-white font-semibold text-xs tracking-tight truncate">MoreCreative Operations Portal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {primaryNav.map(item => <NavLink key={item.href} {...item} />)}
          <NavLink href="/opportunities" label="Opportunities" icon={Handshake} />
          {(userRole === 'admin' || userRole === 'finance') && (
            <NavLink href="/finance" label="Finance" icon={Receipt} />
          )}
        </div>
        <div className="my-3 h-px bg-zinc-800 mx-1" />
        <p className="px-3 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Directory</p>
        <div className="space-y-0.5">
          {directoryNav.map(item => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-zinc-800 space-y-0.5">
        <NavLink href="/admin" label="Admin" icon={Settings} />
        <button
          onClick={() => { onClose?.(); signOut() }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
        {userEmail && (
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-3 pt-2 text-xs text-zinc-400 hover:text-white transition-colors text-left w-full truncate"
            title={`${userEmail} — click to change password`}
          >
            {userEmail}
          </button>
        )}
        <p className="px-3 text-xs text-zinc-500">v{pkg.version}</p>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(null) }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-base">Change Password</h2>
            {passwordSuccess ? (
              <p className="text-green-400 text-sm">Password updated successfully.</p>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoFocus
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && changePassword()}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
                {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(null) }}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={changePassword}
                    disabled={passwordLoading}
                    className="px-4 py-2 text-sm bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                  >
                    {passwordLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
