import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { brief } = await req.json()
  if (!brief?.trim()) return NextResponse.json({ error: 'Brief text required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_user') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: talents }, { data: brandLinks }] = await Promise.all([
    supabase.from('talents').select('id, name, category, talent_level, nationality, city, country, height, languages, skills, ig_followers, tiktok_followers, ai_profile, notes'),
    supabase.from('project_brand_talents')
      .select('talent_id, project_brand:project_brands(brand:brands(name))'),
  ])

  if (!talents?.length) return NextResponse.json({ error: 'No talents found' }, { status: 500 })

  // Build brand map: talentId → unique brand names (max 6)
  const brandMap = new Map<string, Set<string>>()
  for (const link of brandLinks ?? []) {
    const brandName = (link.project_brand as any)?.brand?.name
    if (!brandName || !link.talent_id) continue
    if (!brandMap.has(link.talent_id)) brandMap.set(link.talent_id, new Set())
    brandMap.get(link.talent_id)!.add(brandName)
  }

  const profileLines = talents.map(t => {
    const parts = [
      `[ID:${t.id}] ${t.name}`,
      t.category && `Category: ${t.category}`,
      t.talent_level && `Level: ${t.talent_level}`,
      t.nationality && `Nationality: ${t.nationality}`,
      t.city && `City: ${t.city}`,
      t.country && `Country: ${t.country}`,
      t.height && `Height: ${t.height}`,
      t.languages?.length && `Languages: ${t.languages.join(', ')}`,
      t.skills?.length && `Skills: ${t.skills.join(', ')}`,
      t.ig_followers && `IG: ${t.ig_followers}`,
      t.tiktok_followers && `TikTok: ${t.tiktok_followers}`,
      brandMap.has(t.id) && `Past brands: ${[...brandMap.get(t.id)!].slice(0, 6).join(', ')}`,
      t.ai_profile && `Profile: ${t.ai_profile}`,
      t.notes && `Notes: ${t.notes}`,
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `You are a talent-matching assistant for The MoreCreative, a fashion and entertainment PR agency based in Dubai. Your job is to match brand casting requests to our talent roster.

CASTING BRIEF:
---
${brief}
---

OUR TALENT ROSTER:
---
${profileLines}
---

Instructions:
1. Extract the key requirements from the brief (event type, location, date, follower requirements, aesthetic, language needs, etc.)
2. Match our talents against those requirements. Only include talents that are genuinely a fit — exclude poor matches entirely.
3. Rank matched talents: "strong" (clearly fits most requirements), "good" (fits key requirements with minor gaps), "possible" (worth considering but notable gaps).
4. Give 1–2 specific reasons per talent that reference the actual brief requirements.

Return ONLY a valid JSON object, no other text, in exactly this format:
{
  "briefSummary": {
    "eventType": "what the brand is looking for",
    "location": "location or null",
    "date": "date if mentioned or null",
    "aesthetic": "brand aesthetic or vibe",
    "budget": "budget if mentioned or null",
    "requirements": ["requirement 1", "requirement 2"]
  },
  "matches": [
    {
      "talentId": "uuid from [ID:uuid]",
      "talentName": "name",
      "score": "strong",
      "reasons": ["specific reason referencing the brief", "another specific reason"]
    }
  ]
}`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''

  let result
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    return NextResponse.json({ error: 'Failed to parse match result' }, { status: 500 })
  }

  if (!result) return NextResponse.json({ error: 'No result returned' }, { status: 500 })
  return NextResponse.json(result)
}
