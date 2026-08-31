'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, KeyRound, X, ChevronDown, LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { ProjectCategory, Industry, AgentType, TalentCategory, BrandCategory, TalentLevel, InvoiceSettings, UserRole, ExpenseCategory, CurrencyRate } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

function formatSessionDuration(loginAt: string, lastSeenAt: string): string {
  const mins = Math.round((new Date(lastSeenAt).getTime() - new Date(loginAt).getTime()) / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

type RecordAuditRow = {
  entity_type: string
  id: string
  record_name: string
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string | null
}

const ENTITY_ROUTES: Record<string, string> = {
  talent: '/talents',
  brand: '/brands',
  project: '/projects',
  agency: '/agencies',
  agent: '/agents',
  stylist: '/stylists',
  photographer: '/photographers',
  person: '/people',
}

function entityRoute(type: string, id: string): string | null {
  const base = ENTITY_ROUTES[type]
  return base ? `${base}/${id}` : null
}

type Props = {
  categories: ProjectCategory[]
  industries: Industry[]
  agentTypes: AgentType[]
  talentCategories: TalentCategory[]
  brandCategories: BrandCategory[]
  talentLevels: TalentLevel[]
  invoiceSettings: InvoiceSettings | null
  expenseCategories: ExpenseCategory[]
  currencyRates: CurrencyRate[]
  isAdmin: boolean
  canViewFinance: boolean
  loginAudit: LoginAuditRow[]
  recordAudit: RecordAuditRow[]
}

type LoginAuditRow = {
  id: string
  email: string
  ip_address: string | null
  browser: string | null
  os: string | null
  logged_in_at: string
  last_seen_at: string
}

type AppUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  banned_until?: string | null
}

type UserProfile = { id: string; email: string; color: string | null; first_name: string | null; surname: string | null; role: UserRole | null }

const USER_COLORS = [
  { label: 'Blue',   value: '#93c5fd' },
  { label: 'Green',  value: '#86efac' },
  { label: 'Purple', value: '#d8b4fe' },
  { label: 'Pink',   value: '#f9a8d4' },
  { label: 'Amber',  value: '#fcd34d' },
  { label: 'Teal',   value: '#5eead4' },
  { label: 'Orange', value: '#fdba74' },
  { label: 'Indigo', value: '#a5b4fc' },
  { label: 'Lime',   value: '#bef264' },
  { label: 'Rose',   value: '#fda4af' },
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  finance: 'Finance',
  general: 'General',
}

function roleBadgeClass(role: UserRole | null) {
  if (role === 'admin') return 'bg-gray-900 text-white'
  if (role === 'finance') return 'bg-blue-50 text-blue-700 border border-blue-100'
  return 'bg-gray-100 text-gray-500'
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

function UsersSection({ isAdmin }: { isAdmin: boolean }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null)
  const [lockTarget, setLockTarget] = useState<AppUser | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<AppUser | null>(null)
  const [addForm, setAddForm] = useState({ email: '', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const [res, { data: profileData }] = await Promise.all([
      fetch('/api/admin/users'),
      createClient().from('user_profiles').select('*'),
    ])
    if (res.ok) {
      const data = await res.json()
      setUsers(data.sort((a: AppUser, b: AppUser) => a.email.localeCompare(b.email)))
    } else {
      const text = await res.text()
      let data: { error?: string } = {}
      try { data = JSON.parse(text) } catch {}
      setError(data.error ?? 'Failed to load users')
    }
    setProfiles(profileData ?? [])
    setLoading(false)
  }, [])

  async function setUserColor(user: AppUser, color: string) {
    const profile = profiles.find(p => p.id === user.id)
    const newColor = profile?.color === color ? null : color
    await createClient().from('user_profiles').upsert({
      id: user.id, email: user.email, color: newColor,
      first_name: profile?.first_name ?? null, surname: profile?.surname ?? null, role: profile?.role ?? 'general',
    })
    setProfiles(prev => {
      const existing = prev.find(p => p.id === user.id)
      if (existing) return prev.map(p => p.id === user.id ? { ...p, color: newColor } : p)
      return [...prev, { id: user.id, email: user.email, color: newColor, first_name: null, surname: null, role: 'general' }]
    })
  }

  async function saveUserName(user: AppUser, field: 'first_name' | 'surname', value: string) {
    const profile = profiles.find(p => p.id === user.id)
    const update = { id: user.id, email: user.email, color: profile?.color ?? null, first_name: profile?.first_name ?? null, surname: profile?.surname ?? null, role: profile?.role ?? 'general', [field]: value || null }
    await createClient().from('user_profiles').upsert(update)
    setProfiles(prev => {
      const existing = prev.find(p => p.id === user.id)
      if (existing) return prev.map(p => p.id === user.id ? { ...p, [field]: value || null } : p)
      return [...prev, { id: user.id, email: user.email, color: null, first_name: null, surname: null, role: 'general', [field]: value || null }]
    })
  }

  async function setUserRole(user: AppUser, role: UserRole) {
    const profile = profiles.find(p => p.id === user.id)
    await createClient().from('user_profiles').upsert({
      id: user.id, email: user.email, color: profile?.color ?? null,
      first_name: profile?.first_name ?? null, surname: profile?.surname ?? null, role,
    })
    setProfiles(prev => {
      const existing = prev.find(p => p.id === user.id)
      if (existing) return prev.map(p => p.id === user.id ? { ...p, role } : p)
      return [...prev, { id: user.id, email: user.email, color: null, first_name: null, surname: null, role }]
    })
  }

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
    if (!res.ok) alert(data.error ?? 'Failed to delete user')
    else loadUsers()
  }

  function handleToggleLock(u: AppUser) {
    const isLocked = !!u.banned_until && new Date(u.banned_until) > new Date()
    if (isLocked) setUnlockTarget(u)
    else setLockTarget(u)
  }

  async function handleConfirmUnlock() {
    if (!unlockTarget) return
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: unlockTarget.id, action: 'unlock' }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) alert(data.error ?? 'Failed to unlock user')
    else {
      setUsers(prev => prev.map(x => x.id === unlockTarget.id ? { ...x, banned_until: null } : x))
      setUnlockTarget(null)
    }
  }

  async function handleConfirmLock() {
    if (!lockTarget) return
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lockTarget.id, action: 'lock' }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) alert(data.error ?? 'Failed to lock user')
    else {
      setUsers(prev => prev.map(x => x.id === lockTarget.id ? { ...x, banned_until: new Date(Date.now() + 876600 * 60 * 60 * 1000).toISOString() } : x))
      setLockTarget(null)
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
    if (!res.ok) setFormError(data.error ?? 'Failed to update password')
    else { setPasswordTarget(null); setNewPassword('') }
    setSaving(false)
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center max-w-xl">
        <p className="text-sm text-gray-400">User management is restricted to Admin users.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-xl">
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

      {loading && <div className="px-5 py-4 text-sm text-gray-400">Loading…</div>}
      {error && <div className="px-5 py-4 text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="divide-y divide-gray-50">
          {users.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No users found.</p>}
          {users.map(u => {
            const profile = profiles.find(p => p.id === u.id)
            const role = profile?.role ?? 'general'
            const displayName = [profile?.first_name, profile?.surname].filter(Boolean).join(' ')
            const isExpanded = expandedUserId === u.id
            const isLocked = !!u.banned_until && new Date(u.banned_until) > new Date()

            return (
              <div key={u.id}>
                {/* Compact row */}
                <div
                  className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 group transition-colors ${isLocked ? 'opacity-60' : ''}`}
                  onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                >
                  <div
                    className="w-6 h-6 rounded-full shrink-0 border border-gray-200"
                    style={{ backgroundColor: profile?.color ?? '#f3f4f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{displayName || u.email}</p>
                    {displayName && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
                  </div>
                  {isLocked
                    ? <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-red-50 text-red-600 border border-red-100">Locked</span>
                    : <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${roleBadgeClass(role)}`}>{ROLE_LABELS[role]}</span>
                  }
                  <div
                    className="flex items-center gap-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setPasswordTarget(u); setNewPassword(''); setFormError('') }}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Set password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleLock(u)}
                      className={`transition-colors ${isLocked ? 'text-amber-500 hover:text-amber-700' : 'text-gray-400 hover:text-amber-500'}`}
                      title={isLocked ? 'Unlock user' : 'Lock user out'}
                    >
                      {isLocked ? <LockKeyholeOpen className="w-3.5 h-3.5" /> : <LockKeyhole className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded editing panel */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-3 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div className="flex gap-2">
                      <input
                        defaultValue={profile?.first_name ?? ''}
                        onBlur={e => saveUserName(u, 'first_name', e.target.value.trim())}
                        placeholder="First name"
                        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 outline-none focus:border-gray-400 flex-1"
                      />
                      <input
                        defaultValue={profile?.surname ?? ''}
                        onBlur={e => saveUserName(u, 'surname', e.target.value.trim())}
                        placeholder="Surname"
                        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 outline-none focus:border-gray-400 flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-12 shrink-0">Colour</span>
                      {USER_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setUserColor(u, c.value)}
                          title={c.label}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            profile?.color === c.value ? 'border-gray-700 scale-110' : 'border-transparent hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12 shrink-0">Role</span>
                      <div className="flex gap-1">
                        {(['admin', 'finance', 'general'] as UserRole[]).map(r => (
                          <button
                            key={r}
                            onClick={() => setUserRole(u, r)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              role === r ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-500 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <Modal title="Add User" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser} className="space-y-3">
            {formError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input type="email" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="name@morecreative.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <Input type="password" required minLength={6} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creating…' : 'Create user'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {passwordTarget && (
        <Modal title={`Set password for ${passwordTarget.email}`} onClose={() => setPasswordTarget(null)}>
          <form onSubmit={handleSetPassword} className="space-y-3">
            {formError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">New password</label>
              <Input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Set password'}</Button>
              <Button type="button" variant="secondary" onClick={() => setPasswordTarget(null)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {unlockTarget && (
        <Modal title="Unlock user account" onClose={() => setUnlockTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
              <LockKeyholeOpen className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div className="text-xs text-green-800 leading-relaxed">
                <p className="font-medium mb-0.5">{unlockTarget.email}</p>
                <p>This user will be able to sign in again immediately.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setUnlockTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmUnlock}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Unlocking…' : 'Unlock account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {lockTarget && (
        <Modal title="Lock user account" onClose={() => setLockTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <LockKeyhole className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-medium mb-0.5">{lockTarget.email}</p>
                <p>This user will be immediately locked out. They will not be able to sign in until you unlock their account.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setLockTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmLock}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Locking…' : 'Lock account'}
              </button>
            </div>
          </div>
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
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
      <div className="px-4 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-gray-50 flex-1">
        {items.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">None yet.</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2.5 group">
            <span className="text-sm text-gray-900">{item.name}</span>
            <button onClick={() => onDelete(item.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-gray-100">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="New item…" className="flex-1" />
          <Button type="submit" disabled={saving || !name.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </form>
      </div>
    </div>
  )
}

function CurrencyRatesPanel({ rates: initial }: { rates: CurrencyRate[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(initial.map(r => [r.currency, String(r.rate_to_aed)]))
  )
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initial.filter(r => r.currency !== 'AED')[0]?.updated_at ?? null
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await Promise.all(
      Object.entries(rates).map(([currency, rate]) =>
        supabase.from('currency_rates').update({ rate_to_aed: parseFloat(rate) || 1, updated_at: new Date().toISOString() }).eq('currency', currency)
      )
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await fetch('/api/update-currency-rates')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const newRates: Record<string, string> = {}
      for (const r of data.rates as { currency: string; rate_to_aed: number; updated_at: string }[]) {
        newRates[r.currency] = String(r.rate_to_aed)
      }
      setRates(prev => ({ ...prev, ...newRates }))
      setUpdatedAt(new Date().toISOString())
      setRefreshed(true)
      setTimeout(() => setRefreshed(false), 3000)
    } catch {
      setRefreshError('Could not fetch live rates. Try again.')
    }
    setRefreshing(false)
  }

  function fmtUpdated(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Currency Rates → AED</h2>
          <p className="text-xs text-gray-400 mt-0.5">Used to convert income and expenses to AED in the project P&L</p>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-1">Last updated: {fmtUpdated(updatedAt)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors mt-0.5"
        >
          {refreshing ? 'Fetching…' : refreshed ? '✓ Updated' : '↻ Refresh Live Rates'}
        </button>
      </div>
      {refreshError && (
        <p className="px-5 pt-3 text-xs text-red-600">{refreshError}</p>
      )}
      <form onSubmit={handleSave} className="p-5 space-y-3">
        {initial.filter(r => r.currency !== 'AED').map(r => (
          <div key={r.currency} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-10">1 {r.currency}</span>
            <span className="text-sm text-gray-400">=</span>
            <Input
              type="number"
              step="0.0001"
              value={rates[r.currency] ?? ''}
              onChange={e => setRates(prev => ({ ...prev, [r.currency]: e.target.value }))}
              className="w-28"
            />
            <span className="text-sm text-gray-400">AED</span>
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Rates'}</Button>
        </div>
      </form>
    </div>
  )
}

function InvoiceSettingsPanel({ settings }: { settings: InvoiceSettings | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    company_name: settings?.company_name ?? 'MoreCreative/',
    company_phone: settings?.company_phone ?? '',
    company_address: settings?.company_address ?? '',
    company_vat_number: settings?.company_vat_number ?? '',
    bank_account_holder: settings?.bank_account_holder ?? '',
    bank_name: settings?.bank_name ?? '',
    bank_account_number: settings?.bank_account_number ?? '',
    bank_iban: settings?.bank_iban ?? '',
    bank_swift: settings?.bank_swift ?? '',
    eur_bank_account_holder: settings?.eur_bank_account_holder ?? '',
    eur_bank_name: settings?.eur_bank_name ?? '',
    eur_bank_account_number: settings?.eur_bank_account_number ?? '',
    eur_bank_iban: settings?.eur_bank_iban ?? '',
    eur_bank_swift: settings?.eur_bank_swift ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (settings?.id) {
      await supabase.from('invoice_settings').update({ ...form, updated_at: new Date().toISOString() }).eq('id', settings.id)
    } else {
      await supabase.from('invoice_settings').insert(form)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Invoice Settings</h2>
        <p className="text-xs text-gray-400 mt-0.5">Company address and bank details printed on every invoice PDF</p>
      </div>
      <form onSubmit={handleSave} className="p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Company Name</label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Phone</label>
              <Input value={form.company_phone} onChange={e => setForm(f => ({ ...f, company_phone: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-gray-600">Address</label>
              <Textarea value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">VAT Number</label>
              <Input value={form.company_vat_number} onChange={e => setForm(f => ({ ...f, company_vat_number: e.target.value }))} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bank Details — AED / Default</p>
          <p className="text-xs text-gray-400 mb-3">Used on invoices in AED, GBP, and USD</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Account Holder Name</label>
              <Input value={form.bank_account_holder} onChange={e => setForm(f => ({ ...f, bank_account_holder: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Bank Name</label>
              <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Account Number</label>
              <Input value={form.bank_account_number} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">IBAN</label>
              <Input value={form.bank_iban} onChange={e => setForm(f => ({ ...f, bank_iban: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">SWIFT / BIC</label>
              <Input value={form.bank_swift} onChange={e => setForm(f => ({ ...f, bank_swift: e.target.value }))} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bank Details — EUR</p>
          <p className="text-xs text-gray-400 mb-3">Used on invoices in EUR</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Account Holder Name</label>
              <Input value={form.eur_bank_account_holder} onChange={e => setForm(f => ({ ...f, eur_bank_account_holder: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Bank Name</label>
              <Input value={form.eur_bank_name} onChange={e => setForm(f => ({ ...f, eur_bank_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Account Number</label>
              <Input value={form.eur_bank_account_number} onChange={e => setForm(f => ({ ...f, eur_bank_account_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">IBAN</label>
              <Input value={form.eur_bank_iban} onChange={e => setForm(f => ({ ...f, eur_bank_iban: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">SWIFT / BIC</label>
              <Input value={form.eur_bank_swift} onChange={e => setForm(f => ({ ...f, eur_bank_swift: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}</Button>
        </div>
      </form>
    </div>
  )
}

type Tab = 'users' | 'lookups' | 'finance' | 'audit'

export function AdminClient({ categories, industries, agentTypes, talentCategories, brandCategories, talentLevels, invoiceSettings, expenseCategories, currencyRates, isAdmin, canViewFinance, loginAudit, recordAudit }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  // Login audit
  const [loginSearch, setLoginSearch] = useState('')
  const [loginLimit, setLoginLimit] = useState(10)

  // Record audit
  const [recordSearch, setRecordSearch] = useState('')
  const [recordType, setRecordType] = useState('')
  const [recordLimit, setRecordLimit] = useState(10)

  const filteredLogin = loginAudit.filter(r => {
    const q = loginSearch.toLowerCase()
    return !q || r.email.toLowerCase().includes(q) || (r.browser ?? '').toLowerCase().includes(q) || (r.os ?? '').toLowerCase().includes(q)
  })

  const recordTypes = Array.from(new Set(recordAudit.map(r => r.entity_type))).sort()
  const filteredRecord = recordAudit.filter(r => {
    const q = recordSearch.toLowerCase()
    const matchType = !recordType || r.entity_type === recordType
    const matchSearch = !q || r.record_name.toLowerCase().includes(q) || (r.created_by ?? '').toLowerCase().includes(q) || (r.updated_by ?? '').toLowerCase().includes(q)
    return matchType && matchSearch
  })

  async function addCategory(name: string) { await supabase.from('project_categories').insert({ name }); router.refresh() }
  async function deleteCategory(id: string) { await supabase.from('project_categories').delete().eq('id', id); router.refresh() }
  async function addIndustry(name: string) { await supabase.from('industries').insert({ name }); router.refresh() }
  async function deleteIndustry(id: string) { await supabase.from('industries').delete().eq('id', id); router.refresh() }
  async function addAgentType(name: string) { await supabase.from('agent_types').insert({ name }); router.refresh() }
  async function deleteAgentType(id: string) { await supabase.from('agent_types').delete().eq('id', id); router.refresh() }
  async function addTalentCategory(name: string) { await supabase.from('talent_categories').insert({ name }); router.refresh() }
  async function deleteTalentCategory(id: string) { await supabase.from('talent_categories').delete().eq('id', id); router.refresh() }
  async function addBrandCategory(name: string) { await supabase.from('brand_categories').insert({ name }); router.refresh() }
  async function deleteBrandCategory(id: string) { await supabase.from('brand_categories').delete().eq('id', id); router.refresh() }
  async function addTalentLevel(name: string) { await supabase.from('talent_levels').insert({ name }); router.refresh() }
  async function deleteTalentLevel(id: string) { await supabase.from('talent_levels').delete().eq('id', id); router.refresh() }
  async function addExpenseCategory(name: string) { await supabase.from('expense_categories').insert({ name }); router.refresh() }
  async function deleteExpenseCategory(id: string) { await supabase.from('expense_categories').delete().eq('id', id); router.refresh() }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users and static data used across the app</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b border-gray-200">
        {(['users', 'lookups', ...(canViewFinance ? ['finance'] : []), ...(isAdmin ? ['audit'] : [])] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersSection isAdmin={isAdmin} />}

      {activeTab === 'lookups' && (
        <div className="grid grid-cols-3 gap-4 max-w-4xl">
          <StaticList title="Project Categories" description="Category dropdown on projects." items={categories} onAdd={addCategory} onDelete={deleteCategory} />
          <StaticList title="Industries" description="Industry dropdown on brands." items={industries} onAdd={addIndustry} onDelete={deleteIndustry} />
          <StaticList title="Agent Types" description="Agent type dropdown on agents." items={agentTypes} onAdd={addAgentType} onDelete={deleteAgentType} />
          <StaticList title="Talent Categories" description="Category dropdown on talents." items={talentCategories} onAdd={addTalentCategory} onDelete={deleteTalentCategory} />
          <StaticList title="Brand Categories" description="Category dropdown on brands." items={brandCategories} onAdd={addBrandCategory} onDelete={deleteBrandCategory} />
          <StaticList title="Talent Levels" description="Talent level dropdown on talents." items={talentLevels} onAdd={addTalentLevel} onDelete={deleteTalentLevel} />
          <StaticList title="Expense Categories" description="Category dropdown on expenses." items={expenseCategories} onAdd={addExpenseCategory} onDelete={deleteExpenseCategory} />
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-5 max-w-2xl">
          <CurrencyRatesPanel rates={currencyRates} />
          <InvoiceSettingsPanel settings={invoiceSettings} />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6 max-w-4xl">

          {/* Login Audit */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Login Audit</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredLogin.length === loginAudit.length
                    ? `${loginAudit.length} sign-ins`
                    : `${filteredLogin.length} of ${loginAudit.length} sign-ins`}
                </p>
              </div>
              <input
                value={loginSearch}
                onChange={e => { setLoginSearch(e.target.value); setLoginLimit(10) }}
                placeholder="Search by user, browser, OS…"
                className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
              />
            </div>
            {loginAudit.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No logins recorded yet.</p>
            ) : filteredLogin.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No results match your search.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">User</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">When</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Session</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Browser</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">OS</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLogin.slice(0, loginLimit).map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-gray-900">{row.email}</td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(row.logged_in_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {formatSessionDuration(row.logged_in_at, row.last_seen_at)}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{row.browser ?? '—'}</td>
                          <td className="px-5 py-3 text-gray-500">{row.os ?? '—'}</td>
                          <td className="px-5 py-3 text-gray-400 font-mono text-xs">{row.ip_address ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredLogin.length > loginLimit && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setLoginLimit(l => l + 10)}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Show more ({filteredLogin.length - loginLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Record Activity */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Record Activity</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredRecord.length === recordAudit.length
                    ? `${recordAudit.length} records`
                    : `${filteredRecord.length} of ${recordAudit.length} records`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={recordType}
                  onChange={e => { setRecordType(e.target.value); setRecordLimit(10) }}
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all bg-white"
                >
                  <option value="">All types</option>
                  {recordTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input
                  value={recordSearch}
                  onChange={e => { setRecordSearch(e.target.value); setRecordLimit(10) }}
                  placeholder="Search records or users…"
                  className="w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
            </div>
            {recordAudit.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No activity recorded yet.</p>
            ) : filteredRecord.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No results match your search.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Type</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Record</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Added by</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Added</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Last edited by</th>
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Last edited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRecord.slice(0, recordLimit).map(row => (
                        <tr key={`${row.entity_type}-${row.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                              {row.entity_type}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">
                            {(() => {
                              const href = entityRoute(row.entity_type, row.id)
                              return href
                                ? <Link href={href} className="text-gray-900 hover:text-black hover:underline underline-offset-2">{row.record_name}</Link>
                                : <span className="text-gray-900">{row.record_name}</span>
                            })()}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{row.created_by ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{row.updated_by ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {row.updated_by && row.updated_at
                              ? new Date(row.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRecord.length > recordLimit && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setRecordLimit(l => l + 10)}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Show more ({filteredRecord.length - recordLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
