'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { ProjectCategory } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export function AdminClient({ categories }: { categories: ProjectCategory[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('project_categories').insert({ name: name.trim() })
    setSaving(false)
    setName('')
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('project_categories').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage static data used across the app</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Project Categories</h2>
            <p className="text-xs text-gray-400 mt-0.5">These appear in the Category dropdown when creating or editing a project.</p>
          </div>

          <div className="divide-y divide-gray-50">
            {categories.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No categories yet.</p>
            )}
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3 group">
                <span className="text-sm text-gray-900">{cat.name}</span>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-gray-100">
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="New category name…"
                className="flex-1"
              />
              <Button type="submit" disabled={saving || !name.trim()}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
