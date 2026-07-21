'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, KeyRound, X } from 'lucide-react'
import { ProjectCategory, Industry, AgentType, TalentCategory, BrandCategory, TalentLevel } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Props = {
  categories: ProjectCategory[]
  industries: Industry[]
  agentTypes: AgentType[]
  talentCategories: TalentCategory[]
  brandCategories: BrandCategory[]
  talentLevels: TalentLevel[]
}

type AppUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null)
  const [addForm, setAddForm] = useState({ email: '', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.sort((a: AppUser, b: AppUser) => a.email.localeCompare(b.email)))
    } else {
      const text = await res.text()
      let data: { error?: string } = {}
      try { data = JSON.parse(text) } catch {}
      setError(data.error ?? 'Failed to load users')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to create user')
    } else {
      setShowAddModal(false)
      setAddForm({ email: '', password: '' })
      loadUsers()
    }
    setSaving(false)
  }

  async function handleDelete(user: AppUser) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error ?? 'Failed to delete user')
    } else {
      loadUsers()
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordTarget) return
    setFormError('')
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: passwordTarget.id, password: newPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to update password')
    } else {
      setPasswordTarget(null)
      setNewPassword('')
    }
    setSaving(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 col-span-2">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">People who can sign in to the app</p>
        </div>
        <Button onClick={() => { setShowAddModal(true); setFormError('') }}>
          <Plus className="w-3.5 h-3.5" />
          Add User
        </Button>
      </div>

      {loading && (
        <div className="px-5 py-4 text-sm text-gray-400">Loading…</div>
      )}
      {error && (
        <div className="px-5 py-4 text-sm text-red-500">{error}</div>
      )}
      {!loading && !error && (
        <div className="divide-y divide-gray-50">
          {users.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No users found.</p>
          )}
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 group">
              <div>
                <p className="text-sm text-gray-900">{u.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Added {formatDate(u.created_at)}
                  {u.last_sign_in_at && ` · Last sign in ${formatDate(u.last_sign_in_at)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setPasswordTarget(u); setNewPassword(''); setFormError('') }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title="Set password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="text-gray-200 hover:text-red-500 transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <Modal title="Add User" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser} className="space-y-3">
            {formError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input
                type="email"
                required
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="name@morecreative.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <Input
                type="password"
                required
                minLength={6}
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Creating…' : 'Create user'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {passwordTarget && (
        <Modal title={`Set password for ${passwordTarget.email}`} onClose={() => setPasswordTarget(null)}>
          <form onSubmit={handleSetPassword} className="space-y-3">
            {formError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">New password</label>
              <Input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Set password'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPasswordTarget(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
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

export function AdminClient({ categories, industries, agentTypes, talentCategories, brandCategories, talentLevels }: Props) {
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

  async function addAgentType(name: string) {
    await supabase.from('agent_types').insert({ name })
    router.refresh()
  }
  async function deleteAgentType(id: string) {
    await supabase.from('agent_types').delete().eq('id', id)
    router.refresh()
  }

  async function addTalentCategory(name: string) {
    await supabase.from('talent_categories').insert({ name })
    router.refresh()
  }
  async function deleteTalentCategory(id: string) {
    await supabase.from('talent_categories').delete().eq('id', id)
    router.refresh()
  }

  async function addBrandCategory(name: string) {
    await supabase.from('brand_categories').insert({ name })
    router.refresh()
  }
  async function deleteBrandCategory(id: string) {
    await supabase.from('brand_categories').delete().eq('id', id)
    router.refresh()
  }

  async function addTalentLevel(name: string) {
    await supabase.from('talent_levels').insert({ name })
    router.refresh()
  }
  async function deleteTalentLevel(id: string) {
    await supabase.from('talent_levels').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users and static data used across the app</p>
      </div>

      <div className="grid grid-cols-2 gap-5 max-w-3xl">
        <UsersSection />
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
        <StaticList
          title="Agent Types"
          description="Appear in the Agent Type dropdown when creating or editing an agent."
          items={agentTypes}
          onAdd={addAgentType}
          onDelete={deleteAgentType}
        />
        <StaticList
          title="Talent Categories"
          description="Appear in the Category dropdown when creating or editing a talent."
          items={talentCategories}
          onAdd={addTalentCategory}
          onDelete={deleteTalentCategory}
        />
        <StaticList
          title="Brand Categories"
          description="Appear in the Category dropdown when creating or editing a brand."
          items={brandCategories}
          onAdd={addBrandCategory}
          onDelete={deleteBrandCategory}
        />
        <StaticList
          title="Talent Levels"
          description="Appear in the Talent Level dropdown when creating or editing a talent."
          items={talentLevels}
          onAdd={addTalentLevel}
          onDelete={deleteTalentLevel}
        />
      </div>
    </div>
  )
}
