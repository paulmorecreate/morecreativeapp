@AGENTS.md

# MoreCreative Operations Portal — Claude Context

Internal web app for The MoreCreative, a fashion and entertainment PR agency. Hybrid CRM + project management replacing spreadsheets. Matches talent to brands across events, campaigns, and partnerships.

**Design ethos:** Notion/Linear — simple, fast, minimal clicks.

---

## Stack

- **Next.js 16.2.10** (App Router), TypeScript, Tailwind CSS v4
- **Supabase** (PostgreSQL) for database + auth (email/password only)
- **@supabase/ssr** for server-side sessions
- Row Level Security (RLS) — authenticated users only
- `lucide-react` for icons, `cn()` utility from `lib/utils`
- **No Prisma** — use Supabase JS client directly for all DB operations

## Code Pattern: Server + Client split

Every page follows this pattern:
- `page.tsx` = Server Component — fetches all data server-side, passes as props
- `client.tsx` = Client Component (`'use client'`) — handles all state, forms, modals

Never fetch data inside client components that could be fetched server-side.

---

## Infrastructure

- **Supabase project:** MoreCreativeApp (ID: `bqvqjyvhplgmayirbsyl`) — there is an old project "winickp-dashbboard", never use it
- **Vercel production URL:** `https://morecreativeapp-more-creative.vercel.app` — always use this, not deployment-specific URLs
- **GitHub repo:** `https://github.com/paulmorecreate/morecreativeapp` — pushes to `main` auto-deploy to Vercel
- Credentials are in `.env.local` (gitignored) and mirrored in Vercel env vars

### Required Vercel env vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — required for `/api/admin/users`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_IDS`

---

## Pages

| Route | What it does |
|---|---|
| `/login` | Email/password login |
| `/forgot-password` | Supabase password reset flow |
| `/auth/callback` | Reset redirect handler |
| `/reset-password` | Set new password |
| `/dashboard` | Stat cards, To Do widget, Pending Acceptances, Upcoming Projects |
| `/projects` | Searchable table, Add Project modal, Show Completed toggle |
| `/projects/[id]` | Project detail — Brand + Talent lineup cards |
| `/talents` | Searchable/filterable table, multi-select floating bar (Add to Project, Export PDF) |
| `/talents/[id]` | Talent detail — Edit, Agent/Stylist/People links, Projects, Conversations |
| `/brands` | Searchable/filterable table, multi-select floating bar |
| `/brands/[id]` | Brand detail — Edit, Contacts, Projects, Conversations |
| `/agencies` | Combined Agencies + Agents screen, two sections each with own search |
| `/agencies/[id]` | Agency detail |
| `/agents/[id]` | Agent detail (back link → /agencies) |
| `/stylists` | Table + Add modal, multi-select bar |
| `/stylists/[id]` | Detail — Edit, Contacts, Talents |
| `/photographers` | Table + Add modal |
| `/photographers/[id]` | Detail — Edit, Contacts |
| `/people` | Table + Add modal |
| `/people/[id]` | Detail — Edit, Talents |
| `/admin` | User management + static lookup lists |

**Sidebar nav:** Dashboard, Projects / Talents, Brands, Agencies, Stylists, Photographers, People / Admin

---

## Key UI Conventions

- **All list views:** click-to-sort columns, hover-reveal Delete button, confirmation modal before deletion
- **Multi-select:** floating action bar on Talents, Brands, Stylists
- **Duplicate prevention:** case-insensitive name check on Brand and Talent creation
- **Static lookup data** (categories, industries, talent levels, etc.) managed from `/admin`
- **Countries:** always use `COUNTRIES` from `lib/constants/countries.ts` — 196-country list
- **Mobile:** fully responsive; hamburger top bar on mobile opens a slide-in sidebar drawer
- **PWA:** installable on iPhone via Safari → Add to Home Screen; manifest at `public/manifest.json`

---

## Global Components

| File | Purpose |
|---|---|
| `components/shell.tsx` | Layout wrapper — sidebar + TodoFab |
| `components/sidebar.tsx` | Nav links, user email, version, sign out |
| `components/todo-widget.tsx` | Full To Do table on dashboard |
| `components/todo-fab.tsx` | Floating quick-add button (every page) |
| `components/list-report-pdf.tsx` | Generic PDF table export |
| `components/talent-report-pdf.tsx` | Full talent detail PDF |

---

## Database Tables

```
events, talents, brands, agents, conversations,
talent_agents, talent_stylists, talent_people,
talent_event_details, project_brands, project_brand_talents, project_talents,
project_categories, industries, agent_types, talent_categories,
stylists, stylist_contacts, photographers, photographer_contacts,
agencies, brand_categories, talent_levels,
todos, people, user_profiles
```

### Key columns

**todos:** `id`, `title`, `completed` (bool), `created_at` (timestamptz), `priority` (text: low/medium/high), `assigned_to` (text[], default {}), `deadline` (date), `date_added` (date)

**user_profiles:** `id` (uuid FK → auth.users), `email`, `color` (hex), `first_name`, `surname`, `created_at`

### To Do widget behaviour
- Default sort: date_added ascending (oldest first)
- Inline editing, optimistic updates
- Row background colour = assigned user's colour (set in Admin → Users)
- Overdue deadlines shown in red with "Overdue" badge

---

## API Routes

- `/api/admin/users` — GET/POST/DELETE/PATCH; uses service role key to manage Supabase auth users
- `/api/telegram-webhook` — POST; validates `X-Telegram-Bot-Api-Secret-Token`; plain text message → inserts todo; allowlisted chat IDs only

---

## Telegram Bot

- `/id` command returns the sender's chat ID
- Allowlisted user IDs stored in `TELEGRAM_ALLOWED_CHAT_IDS` Vercel env var (comma-separated)
- Uses `createAdminClient()` (service role) to bypass RLS when inserting todos

---

## Auth / Middleware

- `middleware.ts` protects all routes
- Public routes: `/login`, `/forgot-password`, `/auth/callback`, `/api/telegram-webhook`
- **Vercel Deployment Protection must be OFF** — otherwise external users can't log in

---

## What NOT to do

- Don't use Prisma — Supabase JS client only
- Don't use the old Supabase project `winickp-dashbboard`
- Don't fetch data in client components when it can be fetched server-side in `page.tsx`
- Don't add `agent_type` to agents (field removed from UI)
- Don't reference `talent_contacts` (no longer used)
- Don't add TikTok or Status fields to Brand UI (removed; DB columns kept but unused)
- Don't add Agents as a separate nav item (merged into /agencies)

---

## Roadmap (next to build)

1. **Deals module** — pipeline tracker for live deal flow; stages, MC role, shortlisted talents, blockers, fee/commission
2. **Ambassadorships** — Brand ↔ Talent long-term partnership records with renewal alerts
3. **Talent availability** — block-out date ranges, conflict detection on booking
4. **Scouting pipeline** — pre-roster stages (prospect → in conversation → signed)
5. **Campaigns** — brief, casting, deliverables list (separate from Projects which = events/red carpet)
6. **Product Placements** — lightweight record: talent, brand, product, event, outcome

---

## Versioning

Current version: see `package.json`. Version is displayed in the sidebar footer and on the login screen.
