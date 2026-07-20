'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

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
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0">
              <span className="text-black font-bold text-[10px] tracking-wide">MC</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">More Creative</span>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
