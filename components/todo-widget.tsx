'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Todo = { id: string; title: string; completed: boolean; created_at: string }

export function TodoWidget({ todos }: { todos: Todo[] }) {
  const router = useRouter()
  const [showCompleted, setShowCompleted] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const visible = todos.filter(t => showCompleted || !t.completed)
  const pendingCount = todos.filter(t => !t.completed).length

  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  function startEdit(todo: Todo) {
    setEditingId(todo.id)
    setEditValue(todo.title)
  }

  async function saveEdit(id: string) {
    const trimmed = editValue.trim()
    if (trimmed) {
      await createClient().from('todos').update({ title: trimmed }).eq('id', id)
      router.refresh()
    }
    setEditingId(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    await createClient().from('todos').insert({ title: newTitle.trim() })
    setNewTitle('')
    setAdding(false)
    router.refresh()
  }

  async function toggleComplete(todo: Todo) {
    await createClient().from('todos').update({ completed: !todo.completed }).eq('id', todo.id)
    router.refresh()
  }

  async function deleteTodo(id: string) {
    await createClient().from('todos').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">To Do</h2>
          {pendingCount > 0 && (
            <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={e => setShowCompleted(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900"
          />
          Show Completed
        </label>
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100">
        <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a new item… (press Enter)"
          disabled={adding}
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none"
        />
        {newTitle.trim() && (
          <button type="submit" disabled={adding} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            {adding ? '…' : 'Add'}
          </button>
        )}
      </form>

      <div className="divide-y divide-gray-50">
        {visible.length === 0 && (
          <p className="px-5 py-4 text-sm text-gray-400">
            {todos.length === 0 ? 'Nothing here yet.' : !showCompleted ? 'All done!' : 'No items.'}
          </p>
        )}
        {visible.map(todo => (
          <div key={todo.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
            <button
              onClick={() => toggleComplete(todo)}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                todo.completed
                  ? 'bg-gray-900 border-gray-900'
                  : 'border-gray-300 hover:border-gray-600'
              }`}
            >
              {todo.completed && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            {editingId === todo.id ? (
              <input
                ref={editRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => saveEdit(todo.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit(todo.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 text-sm text-gray-900 bg-transparent outline-none border-b border-gray-300 focus:border-gray-600 pb-px"
              />
            ) : (
              <span
                className={`flex-1 text-sm cursor-pointer ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                onDoubleClick={() => !todo.completed && startEdit(todo)}
              >
                {todo.title}
              </span>
            )}

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {!todo.completed && editingId !== todo.id && (
                <button onClick={() => startEdit(todo)} className="text-gray-300 hover:text-gray-600" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => deleteTodo(todo.id)} className="text-gray-300 hover:text-red-500" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
