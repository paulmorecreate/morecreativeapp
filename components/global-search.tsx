'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Users, Briefcase, Building2, UserCircle, Scissors, Camera, Users2, Calendar, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SearchResult = {
  type: string
  id: string
  name: string
  subtitle?: string
  href: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  talent:       { label: 'Talents',       icon: Users,       color: 'text-purple-500' },
  brand:        { label: 'Brands',        icon: Briefcase,   color: 'text-blue-500'   },
  agency:       { label: 'Agencies',      icon: Building2,   color: 'text-zinc-500'   },
  agent:        { label: 'Agents',        icon: UserCircle,  color: 'text-zinc-500'   },
  stylist:      { label: 'Stylists',      icon: Scissors,    color: 'text-pink-500'   },
  photographer: { label: 'Photographers', icon: Camera,      color: 'text-orange-500' },
  person:       { label: 'People',        icon: Users2,      color: 'text-teal-500'   },
  project:      { label: 'Projects',      icon: Calendar,    color: 'text-green-500'  },
}

interface Props {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const pattern = `%${q}%`
      const [
        { data: talents },
        { data: brands },
        { data: agencies },
        { data: agents },
        { data: stylists },
        { data: photographers },
        { data: people },
        { data: projects },
      ] = await Promise.all([
        supabase.from('talents').select('id, name, nationality').ilike('name', pattern).limit(5),
        supabase.from('brands').select('id, name, country').ilike('name', pattern).limit(5),
        supabase.from('agencies').select('id, name').ilike('name', pattern).limit(5),
        supabase.from('agents').select('id, name').ilike('name', pattern).limit(5),
        supabase.from('stylists').select('id, name').ilike('name', pattern).limit(5),
        supabase.from('photographers').select('id, name').ilike('name', pattern).limit(5),
        supabase.from('people').select('id, name').ilike('name', pattern).limit(5),
        supabase.from('events').select('id, name, location').ilike('name', pattern).limit(5),
      ])
      setResults([
        ...(talents ?? []).map(r => ({ type: 'talent',       id: r.id, name: r.name, subtitle: r.nationality ?? undefined, href: `/talents/${r.id}` })),
        ...(brands ?? []).map(r =>  ({ type: 'brand',        id: r.id, name: r.name, subtitle: r.country ?? undefined,      href: `/brands/${r.id}` })),
        ...(agencies ?? []).map(r => ({ type: 'agency',      id: r.id, name: r.name,                                        href: `/agencies/${r.id}` })),
        ...(agents ?? []).map(r =>  ({ type: 'agent',        id: r.id, name: r.name,                                        href: `/agents/${r.id}` })),
        ...(stylists ?? []).map(r => ({ type: 'stylist',     id: r.id, name: r.name,                                        href: `/stylists/${r.id}` })),
        ...(photographers ?? []).map(r => ({ type: 'photographer', id: r.id, name: r.name,                                  href: `/photographers/${r.id}` })),
        ...(people ?? []).map(r =>  ({ type: 'person',       id: r.id, name: r.name,                                        href: `/people/${r.id}` })),
        ...(projects ?? []).map(r => ({ type: 'project',     id: r.id, name: r.name, subtitle: r.location ?? undefined,     href: `/projects/${r.id}` })),
      ])
      setLoading(false)
    }, 250)
    return () => {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const hasResults = Object.keys(grouped).length > 0

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search talents, brands, agencies…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
          {!loading && query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {!hasResults && !loading && (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">No results for &ldquo;{query}&rdquo;</p>
            )}
            {Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type]
              if (!config) return null
              const Icon = config.icon
              return (
                <div key={type} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    {config.label}
                  </p>
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{item.name}</p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-gray-400">Type at least 2 characters to search all records</p>
          </div>
        )}
      </div>
    </div>
  )
}
