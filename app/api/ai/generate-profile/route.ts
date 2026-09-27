import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { talentId } = await req.json()
  if (!talentId) return NextResponse.json({ error: 'talentId required' }, { status: 400 })

  const supabase = await createClient()

  const [{ data: talent }, { data: projects }] = await Promise.all([
    supabase.from('talents').select('*').eq('id', talentId).single(),
    supabase.from('project_brand_talents')
      .select('project_brand:project_brands(brand:brands(name), project:events(name))')
      .eq('talent_id', talentId),
  ])

  if (!talent) return NextResponse.json({ error: 'Talent not found' }, { status: 404 })

  const brandNames = [...new Set(
    (projects ?? []).map((p: any) => p.project_brand?.brand?.name).filter(Boolean)
  )].join(', ')

  const lines = [
    `Name: ${talent.name}`,
    talent.category && `Category: ${talent.category}`,
    talent.talent_level && `Level: ${talent.talent_level}`,
    talent.nationality && `Nationality: ${talent.nationality}`,
    talent.city && `Based in: ${talent.city}`,
    talent.country && `Country: ${talent.country}`,
    talent.height && `Height: ${talent.height}`,
    talent.languages?.length && `Languages: ${talent.languages.join(', ')}`,
    talent.skills?.length && `Skills: ${talent.skills.join(', ')}`,
    talent.ig_followers && `Instagram followers: ${talent.ig_followers}`,
    talent.tiktok_followers && `TikTok followers: ${talent.tiktok_followers}`,
    brandNames && `Past brand appearances: ${brandNames}`,
    talent.notes && `Notes: ${talent.notes}`,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Write a concise 2–3 sentence AI profile for this talent, suitable for matching against brand casting briefs. Focus on their aesthetic, strengths, market positioning, and any notable attributes. Be specific, not generic. Write in third person.\n\n${lines}`,
    }],
  })

  const profile = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return NextResponse.json({ profile })
}
