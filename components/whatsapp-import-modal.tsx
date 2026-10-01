'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface ExtractedContact {
  name: string
  role: string
  email: string
  phone: string
  selected: boolean
}

interface ExtractedTodo {
  title: string
  selected: boolean
}

interface ImportResult {
  summary: string
  followUp: string
  status: 'open' | 'closed'
  dateRange: string
  contacts: ExtractedContact[]
  todos: ExtractedTodo[]
}

type Step = 'upload' | 'analysing' | 'preview'

interface Props {
  open: boolean
  onClose: () => void
  entityType: 'brand' | 'talent' | 'stylist' | 'photographer' | 'person' | 'agency' | 'agent'
  entityId: string
}

export function WhatsAppImportModal({ open, onClose, entityType, entityId }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [chatText, setChatText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [status, setStatus] = useState<'open' | 'closed'>('open')
  const [dateRange, setDateRange] = useState('')
  const [contacts, setContacts] = useState<ExtractedContact[]>([])
  const [todos, setTodos] = useState<ExtractedTodo[]>([])

  function handleClose() {
    setStep('upload')
    setFileName('')
    setChatText('')
    setError('')
    setSummary('')
    setFollowUp('')
    setStatus('open')
    setDateRange('')
    setContacts([])
    setTodos([])
    onClose()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setChatText(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  async function handleAnalyse() {
    if (!chatText) return
    setStep('analysing')
    setError('')
    try {
      const res = await fetch('/api/ai/whatsapp-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatText }),
      })
      if (!res.ok) throw new Error()
      const data: ImportResult = await res.json()
      setSummary(data.summary ?? '')
      setFollowUp(data.followUp ?? '')
      setStatus(data.status ?? 'open')
      setDateRange(data.dateRange ?? '')
      setContacts((data.contacts ?? []).map(c => ({ ...c, selected: true })))
      setTodos((data.todos ?? []).map(t => ({ ...t, selected: true })))
      setStep('preview')
    } catch {
      setError('Analysis failed. Please try again.')
      setStep('upload')
    }
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    await supabase.from('conversations').insert({
      entity_type: entityType,
      entity_id: entityId,
      channel: 'whatsapp',
      content: summary || null,
      follow_up: followUp || null,
      status,
    })

    if (entityType === 'brand') {
      for (const c of contacts.filter(c => c.selected)) {
        await supabase.from('contacts').insert({
          brand_id: entityId,
          name: c.name || null,
          role: c.role || null,
          email: c.email || null,
          phone: c.phone || null,
          is_primary: false,
        })
      }
    }

    for (const t of todos.filter(t => t.selected)) {
      await supabase.from('todos').insert({
        title: t.title,
        completed: false,
        date_added: new Date().toISOString().split('T')[0],
      })
    }

    setSaving(false)
    router.refresh()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import WhatsApp Chat">
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Export the chat in WhatsApp (Chat info → Export Chat → Without Media) and upload the .txt file here.
          </p>
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-gray-300 mx-auto mb-2" />
            {fileName
              ? <p className="text-sm font-medium text-gray-700">{fileName}</p>
              : <p className="text-sm text-gray-400">Click to select _chat.txt</p>
            }
          </div>
          <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleAnalyse} disabled={!chatText} className="flex-1">Analyse Chat</Button>
          </div>
        </div>
      )}

      {step === 'analysing' && (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <p className="text-sm text-gray-500">Analysing conversation…</p>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-5">
          {dateRange && (
            <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">{dateRange}</p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Summary</label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={7} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Follow-up required</label>
            <Input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="What needs to happen next?" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <div className="flex gap-1">
              {(['open', 'closed'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors capitalize ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {entityType === 'brand' && contacts.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Contacts found — add to brand?</label>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {contacts.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={e => setContacts(cs => cs.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 accent-gray-900"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800">
                        {c.name}{c.role && <span className="font-normal text-gray-400"> · {c.role}</span>}
                      </p>
                      {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todos.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Add as to-dos?</label>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {todos.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={e => setTodos(ts => ts.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-gray-900"
                    />
                    <p className="text-xs text-gray-700">{t.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !summary} className="flex-1">
              {saving ? 'Saving…' : 'Save to Record'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
