'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BriefSummary = {
  eventType: string
  location: string | null
  date: string | null
  aesthetic: string | null
  budget: string | null
  requirements: string[]
}

type TalentMatch = {
  talentId: string
  talentName: string
  score: 'strong' | 'good' | 'possible'
  reasons: string[]
}

type MatchResult = {
  briefSummary: BriefSummary
  matches: TalentMatch[]
}

const SCORE_CONFIG = {
  strong: { label: 'Strong Match', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'Good Match', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  possible: { label: 'Possible', className: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export function TalentMatchClient() {
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleMatch() {
    if (!brief.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/match-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setResult(data)
      }
    } catch {
      setError('Failed to connect to the matching service')
    } finally {
      setLoading(false)
    }
  }

  const strongMatches = result?.matches.filter(m => m.score === 'strong') ?? []
  const goodMatches = result?.matches.filter(m => m.score === 'good') ?? []
  const possibleMatches = result?.matches.filter(m => m.score === 'possible') ?? []

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/talents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Talents
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h1 className="text-2xl font-semibold text-gray-900">Brief Matcher</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Paste a casting brief, booking request, or any description — we'll match it to your talent roster.</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Casting Brief</label>
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          placeholder="Paste the brief, email, or WhatsApp message here…&#10;&#10;e.g. &quot;Hi, we need a female talent for our fragrance launch in Dubai on 15 Oct. Budget €5k. Needs to be Arabic-speaking, minimum 500k followers, luxury aesthetic.&quot;"
          rows={6}
          className="w-full text-sm text-gray-900 placeholder-gray-300 border-0 outline-none resize-none leading-relaxed"
          disabled={loading}
        />
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">{brief.length > 0 ? `${brief.length} characters` : 'Supports any format — emails, WhatsApp messages, typed notes'}</span>
          <Button onClick={handleMatch} disabled={!brief.trim() || loading}>
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? 'Matching…' : 'Find Matches'}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-gray-500">Analysing brief and matching talents…</p>
          <p className="text-xs text-gray-400">This usually takes 10–20 seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Brief summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-900">Brief Understood</h2>
              <span className="text-xs text-gray-400 ml-auto">{result.matches.length} talent{result.matches.length !== 1 ? 's' : ''} matched</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mb-4">
              {result.briefSummary.eventType && (
                <div><dt className="text-xs text-gray-400">Looking for</dt><dd className="text-sm text-gray-900 mt-0.5">{result.briefSummary.eventType}</dd></div>
              )}
              {result.briefSummary.aesthetic && (
                <div><dt className="text-xs text-gray-400">Aesthetic</dt><dd className="text-sm text-gray-900 mt-0.5">{result.briefSummary.aesthetic}</dd></div>
              )}
              {result.briefSummary.location && (
                <div><dt className="text-xs text-gray-400">Location</dt><dd className="text-sm text-gray-900 mt-0.5">{result.briefSummary.location}</dd></div>
              )}
              {result.briefSummary.date && (
                <div><dt className="text-xs text-gray-400">Date</dt><dd className="text-sm text-gray-900 mt-0.5">{result.briefSummary.date}</dd></div>
              )}
              {result.briefSummary.budget && (
                <div><dt className="text-xs text-gray-400">Budget</dt><dd className="text-sm text-gray-900 mt-0.5">{result.briefSummary.budget}</dd></div>
              )}
            </div>
            {result.briefSummary.requirements.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Key requirements</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.briefSummary.requirements.map((r, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Match groups */}
          {[
            { label: 'Strong Matches', matches: strongMatches },
            { label: 'Good Matches', matches: goodMatches },
            { label: 'Possible Matches', matches: possibleMatches },
          ].filter(g => g.matches.length > 0).map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{group.label}</h3>
              <div className="space-y-2">
                {group.matches.map(match => (
                  <MatchCard key={match.talentId} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: TalentMatch }) {
  const score = SCORE_CONFIG[match.score]
  const initials = match.talentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-gray-900">{match.talentName}</span>
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border', score.className)}>
            {score.label}
          </span>
        </div>
        <ul className="space-y-1">
          {match.reasons.map((reason, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
              <span className="text-gray-300 mt-0.5">·</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Link */}
      <Link
        href={`/talents/${match.talentId}`}
        className="shrink-0 text-gray-300 hover:text-gray-700 transition-colors mt-1"
        title="View talent profile"
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
