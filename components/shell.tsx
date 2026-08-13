'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { TodoFab } from './todo-fab'

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const ping = () => fetch('/api/auth/heartbeat', { method: 'POST' }).catch(() => {})
    ping()
    const id = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/mc-logo.jpg" alt="MoreCreative Operations Portal" width={24} height={24} className="rounded-md shrink-0 object-cover" />
            <span className="text-white font-semibold text-xs tracking-tight">MoreCreative Operations Portal</span>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>

      <TodoFab />
    </div>
  )
}
