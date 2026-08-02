'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Briefcase, Calendar, Settings, LogOut, Scissors, Camera, Building2, Users2, Receipt } from 'lucide-react'
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

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href ||
      (href !== '/dashboard' && pathname.startsWith(href)) ||
      (href === '/agencies' && pathname.startsWith('/agents'))
    return (
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
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
          <p className="px-3 pt-2 text-xs text-zinc-400 truncate" title={userEmail}>{userEmail}</p>
        )}
        <p className="px-3 text-xs text-zinc-500">v{pkg.version}</p>
      </div>
    </aside>
  )
}
