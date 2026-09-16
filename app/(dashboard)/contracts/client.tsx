'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { FileText, Search, Upload, X, Trash2, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { Contract } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatDate, cn } from '@/lib/utils'
import { extractPdfText } from '@/lib/pdf-extract'

type SimpleRecord = { id: string; name: string }

type ModalStep = 'closed' | 'upload' | 'extracting' | 'preview'

type SortKey = 'title' | 'created_at'

interface Props {
  contracts: Contract[]
  brands: SimpleRecord[]
  talents: SimpleRecord[]
}

export function ContractsClient({ contracts, brands, talents }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const [step, setStep] = useState<ModalStep>('closed')
  const [isDragging, setIsDragging] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [pendingTitle, setPendingTitle] = useState('')
  const [pendingText, setPendingText] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [expanded, setExpanded] = useState<string | null>(null)

  function closeModal() {
    setStep('closed')
    setExtractError(null)
    setIsDragging(false)
    setPendingText('')
    setPendingTitle('')
  }

  async function processFile(file: File) {
    if (file.type !== 'application/pdf') {
      setExtractError('Please drop a PDF file.')
      return
    }
    setExtractError(null)
    setStep('extracting')

    try {
      const text = await extractPdfText(file)
      // Use filename (without extension) as the default title
      const defaultTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
      setPendingTitle(defaultTitle)
      setPendingText(text)
      setStep('preview')
    } catch {
      setExtractError('Could not read this PDF. Try re-saving it and uploading again.')
      setStep('upload')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!pendingText) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('contracts').insert({
      title: pendingTitle || null,
      extracted_text: pendingText,
      status: 'active',
      brands_involved: [],
      created_by: user?.email ?? null,
    })

    setSaving(false)
    closeModal()
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('contracts').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortAsc ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />
  }

  const q = search.toLowerCase()
  const filtered = contracts
    .filter(c => {
      if (!q) return true
      return (
        c.title?.toLowerCase().includes(q) ||
        c.extracted_text?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sortAsc ? cmp : -cmp
    })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
        <Button onClick={() => { setExtractError(null); setStep('upload') }}>
          <Upload className="w-3.5 h-3.5" />
          Upload Contract
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search full contract text…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-8 h-8 mb-3 text-gray-300" />
            <p className="text-sm">
              {contracts.length === 0
                ? 'No contracts yet. Upload your first one.'
                : 'No contracts match that search.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center px-5 py-3 border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide font-medium gap-4">
              <button className="flex items-center gap-1" onClick={() => toggleSort('title')}>
                Contract <SortIcon col="title" />
              </button>
              <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort('created_at')}>
                Added <SortIcon col="created_at" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(c => {
                const isOpen = expanded === c.id
                // Highlight search term in preview
                const preview = c.extracted_text?.slice(0, 300) ?? ''
                return (
                  <div key={c.id} className="group">
                    <div
                      className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 text-sm">{c.title ?? 'Untitled contract'}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {search && c.extracted_text
                            ? getSnippet(c.extracted_text, q)
                            : preview}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(c) }}
                          className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isOpen && c.extracted_text && (
                      <div className="px-5 pb-5">
                        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono border border-gray-100">
                          {c.extracted_text}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Upload modal */}
      {step !== 'closed' && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'upload' && 'Upload Contract PDF'}
                {step === 'extracting' && 'Reading contract…'}
                {step === 'preview' && 'Contract ready to save'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">

              {step === 'upload' && (
                <div>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-14 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                      isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <Upload className="w-8 h-8 text-gray-300" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Drop a PDF contract here</p>
                      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
                  {extractError && (
                    <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {extractError}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-gray-400 text-center">
                    The PDF text is extracted in your browser and stored as searchable text. The file itself is never uploaded.
                  </p>
                </div>
              )}

              {step === 'extracting' && (
                <div className="flex flex-col items-center justify-center py-14 gap-4">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Extracting contract text…</p>
                </div>
              )}

              {step === 'preview' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Contract name</label>
                    <input
                      value={pendingTitle}
                      onChange={e => setPendingTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="Contract name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Extracted text <span className="text-gray-300">({pendingText.length.toLocaleString()} characters — fully searchable)</span>
                    </label>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed max-h-48 overflow-y-auto font-mono border border-gray-100 whitespace-pre-wrap">
                      {pendingText.slice(0, 600)}{pendingText.length > 600 ? '…' : ''}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <button onClick={() => setStep('upload')} className="text-xs text-gray-400 hover:text-gray-600">
                      ← Upload different file
                    </button>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save to system'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {deleteTarget && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete contract?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-700">{deleteTarget.title ?? 'This contract'}</span> will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function getSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query)
  if (idx === -1) return text.slice(0, 200)
  const start = Math.max(0, idx - 80)
  const end = Math.min(text.length, idx + 120)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}
