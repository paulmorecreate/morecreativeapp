---
name: project-morecreative
description: "Core project overview — what the app is, the stack, services, and key infrastructure details"
metadata: 
  node_type: memory
  type: project
  originSessionId: 73f3d940-8ddc-4485-90aa-b2ecb055b0e9
---

# MoreCreative — Internal CRM / Project Tracker

Internal web app for The More Creative, a fashion and entertainment PR agency. Hybrid CRM + Project Management replacing spreadsheets. Matches talent to brands across events, campaigns, and partnerships.

**Design feel:** Notion/Linear — simple, fast, minimal clicks.

## Stack
- Next.js 16.2.10 (App Router), TypeScript, Tailwind CSS
- Supabase (PostgreSQL) for database + auth (email/password)
- @supabase/ssr for server-side sessions
- Row Level Security (RLS) — authenticated users only
- lucide-react for icons, cn() utility
- No Prisma — uses Supabase JS client directly

## Pattern: Server + Client pages
- `page.tsx` = Server Component, fetches all data server-side
- `client.tsx` = Client Component (`'use client'`), handles all state/forms/modals
- Server passes data as props to client

## Agency services (the six core offerings)
1. **Campaign Production** — end-to-end campaigns, creative direction, casting, production logistics, deliverables
2. **Talent Management** — curated roster, scouting, negotiation, long-term career strategy
3. **Event & Red Carpet** — fashion weeks, galas, premieres; guest curation, appearance management
4. **Product Placements** — strategic product moments at Fashion Weeks, festivals, award season
5. **Brand Partnerships & Ambassadors** — long-term brand-talent ambassadorships
6. **Strategy & Consulting** — positioning, talent alignment, market timing

## Roadmap suggestions agreed on (not yet built)
- **Campaigns module** — brief, casting, timeline, deliverables (asset type, platform, due date, status)
- **Ambassadorships / Long-term Partnerships** — Brand ↔ Talent with contract period, scope, renewal date
- **Product Placements tracking** — what was placed, at which event, with which talent, outcome notes
- **Talent Scouting pipeline** — prospect → in conversation → signed stages pre-roster
- **Deliverables tracking** — content deliverables per Campaign or Partnership
- **Financial layer** — fee per booking, agency commission, campaign budget

Priority order suggested: Ambassadorships + Campaigns first (highest value, currently invisible), then Scouting pipeline.
