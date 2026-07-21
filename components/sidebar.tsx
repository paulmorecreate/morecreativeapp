'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, Calendar, Settings, LogOut, Scissors, Camera, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

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
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

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
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
          <span className="text-black font-bold text-xs tracking-wide">MC</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">More Creative</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {primaryNav.map(item => <NavLink key={item.href} {...item} />)}
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
      </div>
    </aside>
  )
}
