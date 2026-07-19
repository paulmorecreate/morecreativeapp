'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { ProjectCategory, Industry } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Props = {
  categories: ProjectCategory[]
  industries: Industry[]
}

function StaticList({
  title,
  description,
  items,
  onAdd,
  onDelete,
}: {
  title: string
  description: string
  items: { id: string; name: string }[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name.trim())
    setSaving(false)
    setName('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {items.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">None yet.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-3 group">
            <span className="text-sm text-gray-900">{item.name}</span>
            <button
              onClick={() => onDelete(item.id)}
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
            placeholder="New item…"
            className="flex-1"
          />
          <Button type="submit" disabled={saving || !name.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </form>
      </div>
    </div>
  )
}

export function AdminClient({ categories, industries }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function addCategory(name: string) {
    await supabase.from('project_categories').insert({ name })
    router.refresh()
  }

  async function deleteCategory(id: string) {
    await supabase.from('project_categories').delete().eq('id', id)
    router.refresh()
  }

  async function addIndustry(name: string) {
    await supabase.from('industries').insert({ name })
    router.refresh()
  }

  async function deleteIndustry(id: string) {
    await supabase.from('industries').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage static data used across the app</p>
      </div>

      <div className="max-w-lg space-y-5">
        <StaticList
          title="Project Categories"
          description="Appear in the Category dropdown when creating or editing a project."
          items={categories}
          onAdd={addCategory}
          onDelete={deleteCategory}
        />
        <StaticList
          title="Industries"
          description="Appear in the Industry dropdown when creating or editing a brand."
          items={industries}
          onAdd={addIndustry}
          onDelete={deleteIndustry}
        />
      </div>
    </div>
  )
}
