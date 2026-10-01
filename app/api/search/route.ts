import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pattern = `%${q}%`

  const [
    { data: talents },
    { data: brands },
    { data: agencies },
    { data: agents },
    { data: stylists },
    { data: photographers },
    { data: people },
    { data: projects },
  ] = await Promise.all([
    supabase.from('talents').select('id, name, nationality').ilike('name', pattern).limit(5),
    supabase.from('brands').select('id, name, country').ilike('name', pattern).limit(5),
    supabase.from('agencies').select('id, name').ilike('name', pattern).limit(5),
    supabase.from('agents').select('id, name').ilike('name', pattern).limit(5),
    supabase.from('stylists').select('id, name').ilike('name', pattern).limit(5),
    supabase.from('photographers').select('id, name').ilike('name', pattern).limit(5),
    supabase.from('people').select('id, name').ilike('name', pattern).limit(5),
    supabase.from('events').select('id, name, location').ilike('name', pattern).limit(5),
  ])

  const results = [
    ...(talents ?? []).map(r => ({ type: 'talent', id: r.id, name: r.name, subtitle: r.nationality ?? undefined, href: `/talents/${r.id}` })),
    ...(brands ?? []).map(r => ({ type: 'brand', id: r.id, name: r.name, subtitle: r.country ?? undefined, href: `/brands/${r.id}` })),
    ...(agencies ?? []).map(r => ({ type: 'agency', id: r.id, name: r.name, href: `/agencies/${r.id}` })),
    ...(agents ?? []).map(r => ({ type: 'agent', id: r.id, name: r.name, href: `/agents/${r.id}` })),
    ...(stylists ?? []).map(r => ({ type: 'stylist', id: r.id, name: r.name, href: `/stylists/${r.id}` })),
    ...(photographers ?? []).map(r => ({ type: 'photographer', id: r.id, name: r.name, href: `/photographers/${r.id}` })),
    ...(people ?? []).map(r => ({ type: 'person', id: r.id, name: r.name, href: `/people/${r.id}` })),
    ...(projects ?? []).map(r => ({ type: 'project', id: r.id, name: r.name, subtitle: r.location ?? undefined, href: `/projects/${r.id}` })),
  ]

  return NextResponse.json({ results })
}
