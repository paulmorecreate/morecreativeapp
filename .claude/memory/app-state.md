---
name: app-state
description: "Current state of the app — what's built, what pages exist, what works"
metadata: 
  node_type: memory
  type: project
  originSessionId: 894511e4-c9c1-417f-888d-fdd211440a28
---

# App State (as of 2026-10-15)

## What's built and working

### Auth
- Login page at /login (email/password via Supabase) with "Forgot your password?" link
- Forgot password flow: /forgot-password → Supabase reset email → /auth/callback → /reset-password
- middleware.ts protects all routes; /forgot-password, /auth/callback, and /api/telegram-webhook are public
- Users: Paul (paul@themorecreative.com), Nima (nima@...) — managed via Admin page
- **Vercel Deployment Protection must be OFF** — Joyce couldn't log in until Paul disabled it

### Pages

- `/dashboard` — 3 stat cards (Talents, Brands, Active Projects), **To Do widget**, **Pending Acceptances panel** (filters by `status='In Conversation'`; inline status dropdown per row — selecting Confirmed or Rejected removes row optimistically; implemented as `components/pending-acceptances.tsx` client component), Upcoming Projects panel
  - **Locked users excluded from To Do widget**: `dashboard/page.tsx` fetches locked user IDs via admin client (same `banned_until` check as Meetings page) and filters `userProfiles` before passing to `TodoWidget`. Locked users no longer appear in assignee display or filter chips.
  - **Pending Acceptances only covers `project_brand_talents`** — talents in the Talent Pool (`project_talents`) are not included, even if they have "In Conversation" status.
- `/projects` — searchable table, Add Project modal, hover-reveal Delete with confirmation. Completed projects shown in a permanent "Completed" section below the active table (no toggle — always visible if any exist). Header subtitle shows "X active, Y completed".
  - Delete cascade: explicitly removes invoices, invoice_line_items, project_income, project_expenses before deleting the event record
  - Warning modal mentions all associated data that will be removed
- `/projects/[id]` — header with Mark as Completed / Edit / Delete; tab bar: **Overview** and **Finance** (Finance visible to admin/finance roles only)
  - **Overview tab**: Brand (Show) cards + Talent Pool table (drag-and-drop, notes, **status**, deal, creative)
    - Brand (Show) cards, talents under each show, and pool talents all sorted alphabetically
    - "Add Talent to Project" modal has two modes: **Existing** (search roster) and **New** (full inline talent creation form — all fields, agent/stylist/people linking, same form as `/talents` page)
    - "+ Add Talent" dropdown on brand show card: searches ALL talents (not just pool), has "+ New talent" inline creation option
    - Brand card `overflow-hidden` removed so dropdown isn't clipped; `rounded-t-xl` added to header for visual rounding
    - **Brand (Show) bar**: brushed `#FF0031` gradient (`from-[#b80024] via-[#ff3355] to-[#b80024]`). Notes strip always visible below bar. Talent table collapses/expands via chevron.
    - **Default collapsed**: all brand shows load collapsed. "collapse all · expand all" text links next to the "Lineup" heading.
    - **Talent Pool row numbers**: sequential `#` column on the left side of each row (before drag handle). `text-gray-500 font-medium tabular-nums`. Header `<th>` aligned right.
    - **Excel export per show**: Export button on each brand bar exports all talents with columns: Talent, Category, Instagram, Status, Deal Type, Creative, Stylist, Accepted, Notes, Comments. Uses `xlsx` package.
    - **Movie Schedule export**: "Export Schedule" button (FileDown icon) appears next to "+ Add Brand" when ≥1 brand has a `show_date` set. Uses `exceljs` (installed). Generates a rich Excel file: dark navy title row, green date-header row (one col per festival day from `project.start_date` to `end_date`), one data row per **Confirmed** talent-brand pairing placed in the correct date column (salmon red cell, bold "Talent - BRAND TICKET" + notes). Notes combine `entry.notes` + `project_brand_talent_notes` (threaded comments). Exception section appended below for Confirmed talents whose brand has no show_date (amber header, yellow rows, columns: Talent / Brand / Notes). Non-Confirmed statuses excluded from both sections.
    - **Inline new brand**: "Add Brand (Show)" modal has mode toggle — can create a brand from scratch (full brand form) without leaving the modal. Brand is inserted to DB first, then show is linked.
  - **Finance tab**: P&L Summary cards (Total Income, Total Expenses, Gross Profit — 3 cards, MC Commission removed 2026-10-15), then **Profit Share section**, Income table, Expenses table, Sales Invoices table, Purchase Invoices table
    - Income: description, type, amount, currency, status (pending/invoiced), date — add/edit/delete with modals
    - Expenses: description, category (from expense_categories), amount, currency, date — add/edit/delete with modals; can create new category inline
    - **Profit Share section** (built 2026-10-15): sits between summary cards and Income table. Shows MORECREATIVE (% + AED amount) and Team (% + total AED + per-member breakdown). Set Up / Edit mode: enter MC %, Team % auto-calculates as remainder, pick team members from user_profiles via searchable multi-select. All team members always get equal share of the team portion. If Gross Profit ≤ 0, team members show AED 0.00 (MC absorbs the full loss). Admin/finance/super_user can edit; General role sees read-only.
    - **Profit Share payment tracking** (built 2026-10-17): each row (MC + each employee) has a "Mark paid" pill button. Clicking strikes through the amount and turns the pill green. Toggling again marks unpaid. Optimistic UI, writes immediately to `mc_paid` / `paid` columns. Only shown for canEdit users.
    - **Sales Invoices**: invoice list for this project, click to open `/finance/[id]`, hover-to-delete, New Sales Invoice button (auto-generates number, pre-links to project). Shows **Amount** column (total incl. VAT from line items); partial invoices show "X paid · Y due" sub-line. Partial status badge = amber.
    - **Credit Notes** (built 2026-11-02): "Issue Credit Note" button on each sales invoice row (in `ProjectFinanceTab`). Generates `CN-YYYY-XXXX` number (independent sequence from invoices), copies line items as negatives, navigates to new CN detail. Same `invoices` table with `document_type='credit_note'` and `linked_invoice_id` FK. CNs show purple badge in invoice list; original invoice shows "CN issued" badge; CN amounts shown in red. CN detail page shows "Credit Note" header badge + link to original invoice. PDF renders with purple banner, "Issued To" label, "Credit Note Number", amount in red. Negative line items auto-reduce finance totals (GP, profit share) without any extra code.
    - **Purchase Invoices**: purchase invoice list for this project, click to open `/finance/purchase/[id]`, hover-to-delete, New Purchase Invoice button (pre-links to project)
    - **P&L totals include invoices**: `Total Income` = income entries + sales invoice totals (line items + VAT, converted to AED); `Total Expenses` = expense entries + purchase invoice gross amounts (× fx_rate). Gross Profit recalculates accordingly.
  - **URL param**: `?tab=finance` opens directly on Finance tab (set when navigating back from invoice detail)
- `/finance` — **Five tabs** (Annual Expenses merged into Running Costs): **Overview** (default), **Sales Invoices**, **Purchase Invoices**, **Running Costs**, **VAT** (Admin + Finance + Super User roles only)
  - **Overview tab**: Cross-tab dashboard. Revenue row (Collected/Outstanding/Collection Rate %); Costs row (Monthly Burn with salary+ops breakdown, Annual Overhead amortised, Purchase Outstanding); Net Revenue card; Needs Attention alerts. Annual Overhead card shows amortised value (amount ÷ recurrence_years).
  - **Sales Invoices**: AED summary bar (`Total Received` / `Total Owed` labels — renamed 2026-11-02), status filter pills, search, due date range filter. Columns: Billed To → Project → Invoice # → Issue Date → Due Date → Amount → VAT → AED → Status.
  - **Purchase Invoices**: same layout. Columns: Supplier → Project → Invoice # → Issue Date → Due Date → Gross Amount → VAT → AED → Status.
  - **Running Costs**: Three sections — Salaries, Operating Costs, **Annual Expenses**. Summary bar shows "True Annual Total" = (salary + ops monthly × 12) + Σ(annual_expense.amount_aed / recurrence_years). Annual Expenses section: each expense shows actual amount + "every Xy" sub-text when recurrence > 1; "Per Year" column shows amortised value. Add/edit/delete modals for all sections.
  - **VAT**: Quarterly VAT return summary. Click-to-expand quarters showing individual invoices.
  - `tab=` URL param supported: overview/sales/purchase/running/vat (annual removed)
  - **annual_expenses** now has `recurrence_years` column (int, default 1, values 1/2/3)
- `/finance/[id]` — Sales invoice detail/edit: all fields, line items, VAT toggle, PDF download
  - **Partial status UI**: when status = Partial, an amber callout appears in the Invoice Details card with "Amount Received" input and live "Still Outstanding" display. Totals section shows Amount Paid as read-only (no duplicate input).
  - **Back navigation**: `?from=finance` param added when opening from /finance list. Detail page passes `returnTo="/finance"` to client; back arrow / Save & Close / Delete all respect it. Without the param (opened from a project), navigates to the linked project as before.
- `/finance/purchase/[id]` — Purchase invoice detail/edit: supplier, invoice #, currency (AED/GBP/USD/EUR), net amount, VAT rate %, gross amount (auto-computed), FX rate to AED, issue/due dates, status (pending/partial/paid), project link, notes. No line items — records a third-party invoice as received.
- `/schedule` — 12-month calendar grid (3-col desktop). Year navigation. Events seeded from annual fashion/entertainment calendar. Jan–Aug = 2027, Sep–Dec = 2026. Per-month cards with Global (blue), Regional (green), Custom (purple) sections. Hover each event row to: create project (CalendarPlus), edit (Pencil), delete (Trash). Once a project is created from an event, `project_id` FK is set on `schedule_events` and the icon turns green + links to the project (no re-creation allowed). Past months dimmed. Add/edit via modal. Sidebar nav: between Opportunities and Finance.
  - **Importance levels** (built 2026-08-13): High / Medium / Low per event. Colour-coded 4px left border stripe: High = rose-500, Medium = amber-400, Low = slate-300. Stored in `schedule_events.importance` column. Dropdown in Add/Edit modal.
- `/opportunities` — Deal pipeline. Pipeline summary bar (5 stage cards, click to filter). Searchable table. Add Opportunity modal (redirects to detail on save).
- `/opportunities/[id]` — Deal detail with sections:
  - Deal header: stage badge, MC role badge, consideration type badge, edit inline
  - Financials card: gross fee, MC commission (calculated), net to talent (auto: gross × (1 - commission%/100))
  - Details card: counterpart, internal owner, event date, notes
  - Talent Shortlist: add from roster, status per talent (colour-coded dropdown: Proposed/Approached/Declined/Confirmed), remove
  - Client Contacts: name, role, company, email, remove
  - Blockers: description, due date, resolve checkbox, remove
- `/talents` — searchable/filterable table, click-to-sort, multi-select with floating action bar (Add to Project, **Export PDF**, **Export Excel**, Export Report). **Row coloring + user filter** (see below). **Double-click row** navigates to talent detail page. **Import template** includes Country (Excel dropdown via hidden `_Countries` sheet + named range `CountryList`) and Notes (col K) columns. Import preview shows "Export flagged (N)" button to download CSV of duplicates/fuzzy matches before committing.
  - **Excel export** (built 2026-10-15): uses `exceljs`. Format: mc logo top-left + "Talent List / The MoreCreative" title. Black header row (white text). 4 columns: #, NAME (bold), FIELD (category), INSTAGRAM. Alternating white / `#F7F7F7` row tint. Row height 15pt. Tier sections not yet defined — single flat list.
- `/talents/[id]` — detail with Edit modal, Agent/Stylist/People linking, Projects, Conversations, Delete
- `/brands` — searchable/filterable table, click-to-sort, multi-select with floating action bar. **Row coloring + user filter.** Link column shows `@handle` for Instagram URLs or domain for others (sky blue, prominent). Search includes brand notes. **267 brands** as of 2026-08-19 (was 63; 204 imported from Google Sheet "BRANDS" tab — contacts parsed and added; 8 brands flagged for manual review: MAM, Sanne, Whoop, and 4 exact-match-with-accent variants).
- `/brands/[id]` — detail with Edit modal, Contacts, Projects, Conversations (Log/Edit/Delete/Import WhatsApp), Delete. Contracts section removed.
- `/agencies` — combined Agencies + Agents screen; two sections each with own search, sort, Add modal. **Duplicate name prevention** on both Agency and Agent creation (case-insensitive). **Separate row coloring + user filter for each section.**
- `/agencies/[id]` — Agency detail with permanent Details card (country, website, notes) — always shows even when notes empty. Agents section + Conversations (Log/Edit/Delete/Import WhatsApp).
- `/agents/[id]` — Agent detail (back link → /agencies). Conversations (Log/Edit/Delete/Import WhatsApp).
- `/stylists` — table with search, sort, Delete, Add modal; multi-select floating bar. **Row coloring + user filter.**
- `/stylists/[id]` — detail with Edit, Contacts, Talents section (search + full create), Conversations (Log/Edit/Delete/Import WhatsApp).
- `/people` — table with search, sort, Delete, Add modal. **Duplicate name prevention** on creation. **Row coloring + user filter.**
- `/people/[id]` — detail with Edit, Talents section (search + full create), Conversations (Log/Edit/Delete/Import WhatsApp).
- `/photographers` — table with search, sort, Delete, Add modal. **Duplicate name prevention** on creation. **Row coloring + user filter.**
- `/photographers/[id]` — detail with Edit, Contacts, Talents section (search + full create), Conversations (Log/Edit/Delete/Import WhatsApp).

### "Last Updated" column + user filter (built 2026-08-13, updated 2026-08-19)
All 6 list pages (Talents, Brands, Agencies, Agents, Stylists, Photographers, People) now:
- Show a **"Last Updated" column** (sortable) displaying date + first name as a compact **rounded pill badge** (e.g. "19-Aug-2026 (Paul)"). The pill's background is the user's hex colour. Rows themselves are plain white.
- Date logic: uses `updated_at`/`updated_by` if an explicit update exists; falls back to `created_at`/`created_by` when no update has been recorded.
- Show a "Last Updated By" dropdown filter (only appears when records with audit data exist). Agencies page has two independent filters — one per section.
- User data (`user_profiles`) fetched server-side in `page.tsx`, passed as `userProfiles` prop to client.
- **Row-level background coloring was removed** — colour now lives only in the pill, not the row.
- `/admin` — **Tab-based layout**: Users | Lookups | Finance | Audit | Diagnostics
  - **Users tab**: compact rows (colour dot + name + role badge + always-visible action icons), click to expand name inputs, colour picker, role selector. Admin role only.
    - **Lock/unlock**: LockKeyhole icon locks user via `ban_duration: '876600h'` (~100 years); LockKeyholeOpen unlocks via `ban_duration: 'none'`. Both show confirmation modals (amber for lock, green for unlock). Locked users show red "Locked" badge and 60% opacity row. `isLocked` checked as `!!banned_until && new Date(banned_until) > new Date()`.
    - API PATCH handler supports `action: 'lock'` and `action: 'unlock'` in addition to password reset.
  - **Lookups tab**: 3-column grid of all static lists (Project Categories, Industries, Agent Types, Talent Categories, Brand Categories, Talent Levels, Expense Categories)
  - **Finance tab**: Currency Rates panel + Invoice Settings panel. Visible to Admin + Finance roles only.
  - **Audit tab**: Two searchable, paginated tables (admin only):
    - **Login Audit** — last 200 sign-ins; columns: email, logged in at, session duration (formatted "X min" / "Xh Ym" using `last_seen_at − logged_in_at`), browser, OS, IP. Default 10 rows + "Show more" button. Live search by email.
    - **Record Activity** — last 300 entries from `audit_activity` Postgres VIEW (unions 9 entity tables: talents, brands, events, agencies, agents, stylists, photographers, people, opportunities). Columns: entity type, name, action (created/updated), by, at. Default 10 rows + "Show more". Live search by name/email; entity type dropdown filter.
  - **Diagnostics tab** (built 2026-09-08, admin only): Live Supabase free plan usage.
    - **Supabase Free Plan Usage** panel: progress bars for Database Size (vs 500 MB limit) and Auth Users MAU (vs 50k limit). Footer shows remaining capacity. Green/amber/red bar colours based on % used.
    - **Table Storage Breakdown** panel: all 55 public tables sorted by size (bytes + row estimate), mini blue bar chart per row, "Show all N tables" toggle (default 10 shown).
    - Backed by `get_db_diagnostics()` Postgres function (SECURITY DEFINER — reads `pg_database_size`, `pg_total_relation_size`, `pg_tables`, `auth.users`). Called via `/api/admin/diagnostics` route (service role, admin-role-gated).

### To Do Widget
Full sortable table on the Dashboard. Columns: Task | Date Added | Assigned To | Deadline | Priority. Inline editing, optimistic updates, row colour by assigned user, overdue badges, search, filter pills, Show Completed toggle, Add row, FAB on every page.

### Opportunities module (updated 2026-10-20)
- `/opportunities` — pipeline bar iterates `opportunity_stages` table dynamically (not hardcoded). Searchable table. Active opps shown above; "Converted to Project (N)" collapsible section below. Delete + Convert buttons always visible (not hover-only).
- `/opportunities/[id]` — added: Location, Category fields; Documents section (Google Drive link + title + notes, with a static link to the Opportunities folder); Convert to Project button. If already converted, shows green "Converted to project" banner + "View Project" button instead.
- **Stage**: DB-backed via `opportunity_stages` table. Managed from Admin → Lookups. Inline "Add new" sentinel (`__add_new__`) in stage/mc_role dropdowns. Both default to placeholder (no pre-selected value).
- **Convert to Project**: creates an `events` row (name, location, category, event_date), copies `opportunity_talents` → `project_talents`. Writes `converted_project_id` back to the opportunity. Re-clicking Convert on an already-converted opp shows "Already Converted → Go to Project" instead of creating a duplicate.
- `STAGE_COLORS` keyed by display name (e.g. `'Pitch'`, `'Proposal Sent'`), not slugs.
- `MC_ROLES`: Talent Broker | Brand Broker | Consultant | Co-Agent
- `CONSIDERATION_TYPES`: Cash Fee | Gift | Gift + Fee | Experience | TBC

### Invoice status rule for P&L / profit calculations
**Critical business rule (agreed 2026-10-29):** Only invoices that have been paid/received count toward gross profit — applies to both the project Finance tab P&L and the Team Earnings commission calculations:
- **Sales invoices** (`invoices` table): only `status = 'received'` counts. Draft / Sent are shown in the table but excluded from totals.
- **Purchase invoices** (`purchase_invoices` table): only `status = 'paid'` or `status = 'partial'` counts. Pending invoices excluded.
This filter must be maintained in both `app/(dashboard)/projects/[id]/client.tsx` (PLSummary + grossProfit) and `app/(dashboard)/profit-share/page.tsx`.

### Finance / P&L AED conversion
- `currency_rates` table stores EUR, USD, GBP → AED rates
- `toAED(amount, currency, rates)` helper in project Finance tab converts for P&L summary
- AED amounts pass through unchanged; unknown currencies default to 1:1

### Telegram Bot
- `/id` command returns sender's chat ID
- Allowlisted IDs in `TELEGRAM_ALLOWED_CHAT_IDS`: Paul (430347256), Nima (8868769915)
- Plain text → inserts todo

### PWA
- Installable on iPhone via Safari → Add to Home Screen
- `public/manifest.json`, icons at 192/512px, apple-touch-icon

### Global components
- `components/add-talent-form.tsx` — shared full talent creation form used inside Link Talent modals on Stylists/Photographers/People detail pages. Props: talentCategories, talentLevels, allAgents, agentTypes, allStylists, allPeople, existingNames, onSuccess(newTalentId), onCancel. Handles all talent fields + agent/stylist/people sub-sections. `onSuccess` called after DB writes; parent does the context-specific link insert.
- `components/shell.tsx` — layout + TodoFab; **heartbeat ping** on mount + every 5 min (`fetch('/api/auth/heartbeat', { method: 'POST' })`) to track session duration
- `components/sidebar.tsx` — nav; Opportunities link (not indented, under Projects); Finance link (admin/finance only); **email at bottom is a clickable button** — opens a "Change Password" modal (new password + confirm, calls `supabase.auth.updateUser`)
- `components/todo-widget.tsx`, `components/todo-fab.tsx`
- `components/invoice-pdf.tsx`, `components/list-report-pdf.tsx`, `components/talent-report-pdf.tsx`
- `components/pending-acceptances.tsx` — client component for Dashboard Pending Acceptances; receives server-fetched entries as props; inline status dropdown; optimistic removal on Confirmed/Rejected
- `components/audit-stamp.tsx` — shared component rendering "Added by / Last edited by" footer on every entity detail page; shows `created_by`, `created_at`, `updated_by`, `updated_at`; shows "unknown" for pre-existing records

### WhatsApp Chat Import (built 2026-10-01)
- "Import WhatsApp" button in Conversations section on: Brands, Talents, Stylists, Photographers, People, Agencies, Agents
- Upload .txt export (WhatsApp → Chat info → Export Chat → Without Media)
- Calls `/api/ai/whatsapp-import` → Claude Sonnet extracts: summary, follow-up, status, date range, contacts (brand only), todos
- Preview step: editable summary/follow-up, status toggle, checkboxes for contacts + todos
- Save inserts: conversation entry (channel='whatsapp'), brand contacts if applicable, selected todos
- `components/whatsapp-import-modal.tsx` — shared component, entityType union covers all 7 entity types

### API routes
- `/api/admin/users` — user management via service role
- `/api/telegram-webhook` — Telegram → todo insertion
- `/api/auth/log-login` — POST; called fire-and-forget after successful login; reads x-forwarded-for + user-agent, inserts into login_audit via service role
- `/api/auth/heartbeat` — POST; updates `last_seen_at` on the most recent `login_audit` row for the current user; used by shell.tsx to track session duration
- `/api/ai/whatsapp-import` — POST; authenticated users; sends chat text to Claude, returns structured JSON (summary, followUp, status, dateRange, contacts, todos)
- `/api/ai/match-brief` — POST; **super_user only**; matches a talent brief against roster using Claude

### DB tables
**Team Earnings (`/profit-share`) — rebuilt 2026-10-30:** Grid view: months = rows, team members = columns. Admin + super_user only.
- **Columns**: each active user is a column. Each month-row cell shows salary (top) + commission (below) if both present; commission row hidden entirely if commission = 0 (no placeholder). Action buttons (×/+) sit LEFT of the "salary" label so the AED amount is always the rightmost element and right-aligns consistently within the column.
- **Salary**: base salary from `salaries` table; override per person per month via `monthly_salary_payments` (click amount to edit inline; delete with × button). One-off salary payments for non-salaried users (Joyce): "+" button on month row label opens modal to pick any user + enter amount/note. **Zero salary is valid** — saves "AED 0" meaning "not yet paid this month" (not a no-op). Cell shows "AED 0" rather than "—". `monthly_salary_payments` has UNIQUE constraint on `(user_profile_id, month_key)`; saves use upsert.
- **Salary returns**: logged per person per month (logged as multiple rows in `salary_returns`). Shown as "−AED X returned" below the salary line. Hover salary to see return button.
- **Commission**: each user's equal share of project GP (only `invoices.status='received'` and `purchase_invoices.status='paid|partial'` count). Driven by `project_profit_share` setup on the project Finance tab.
- **Payout month**: set explicitly per allocation (`payout_month` on `project_profit_share_employees`), NOT driven by project start_date. Set from Pending section or by clicking the row in expanded view. Can reassign to a different month or push back to Pending.
- **Expand/collapse months**: click month label to expand and see per-project sub-rows with Paid/Unpaid toggle per allocation. Project names link to Finance tab of that project (`/projects/[id]?tab=finance`).
- **Add Month**: "+ Add Month" button in header → persists to `team_earnings_months` table so months appear even before any commission is assigned. Manual months merge with commission-derived months in `allMonths`.
- **Upcoming section**: projects marked `preview_only=true` on their Finance tab appear here. Shows project name + team member avatar dots — no amounts. Members sorted alphabetically.
- **Pending section**: allocations with no `payout_month` set yet; shows earned amount + month picker to assign.
- **Footer totals**: per user — salary total + commission total − returns total.
- `salary_returns` table: id, user_profile_id, month_key (YYYY-MM), amount, note. Multiple per person per month.
- `monthly_salary_payments` table: id, user_profile_id, month_key, amount, paid (bool), type ('recurring'), note. Overrides base salary for a specific month.
- `team_earnings_months` table: id, month_key (UNIQUE). Persists manually-added months.
- `project_profit_share.preview_only` column (bool, default false): hides amounts on Team Earnings, shows in Upcoming section.
- `project_profit_share_employees.payout_month` column (text YYYY-MM): explicit payment date per person per project.
- Grid view on Project Lineup is **experimental** — Paul said "not sure if it will be used, but let's see"

events, talents, brands, agents, conversations, talent_agents, talent_stylists, talent_people, **talent_photographers**, talent_event_details, project_brands, project_brand_talents, project_talents, project_categories, industries, agent_types, talent_categories, stylists, stylist_contacts, photographers, photographer_contacts, agencies, brand_categories, talent_levels, todos, people, user_profiles, invoice_settings, invoices, invoice_line_items, project_brand_talent_notes, project_talent_notes, **opportunities**, **opportunity_talents**, **opportunity_contacts**, **opportunity_blockers**, **project_income**, **project_expenses**, **expense_categories**, **currency_rates**, **schedule_events**, **purchase_invoices**, **annual_expenses**, **salaries**, **operating_costs**, **project_profit_share**, **project_profit_share_employees**

**invoices table additional columns (added 2026-11-02):** `document_type` (text, 'invoice' | 'credit_note', default 'invoice'), `linked_invoice_id` (uuid FK → invoices, nullable). CN numbering: `CN-YYYY-XXXX` sequence independent from regular invoices.

**project_talents.status column (added 2026-10-26):** text, DEFAULT 'In Conversation'. Values: In Conversation (orange) | Confirmed (green) | Rejected (red) | Cancelled (grey). Colour-coded inline dropdown in the Talent Pool table. Note: brand talent statuses (`project_brand_talents.status`) do NOT have "Cancelled" — that's Talent Pool only.

**talent_photographers columns:** id, talent_id (FK talents CASCADE), photographer_id (FK photographers CASCADE), created_at. UNIQUE(talent_id, photographer_id). RLS enabled.

**schedule_events columns:** id, title, month (int 1–12), year (int), category ('global'|'regional'|'custom'), region (text nullable), project_id (FK events nullable — set when project created from event), created_at

**opportunities columns:** id, name, stage, mc_role, consideration_type, counterpart_name, internal_owner, gross_fee (numeric), commission_pct (numeric, default 20), event_date, **location** (text nullable), **category** (text nullable), notes, **converted_project_id** (uuid FK → events ON DELETE SET NULL), created_at, updated_at

**opportunity_stages columns:** id (uuid), name (text), created_at. RLS enabled. Seeded with: Pitch, Shortlisting, Proposal Sent, Contract, Closed.

**opportunity_documents columns:** id (uuid), opportunity_id (FK opportunities CASCADE), title (text), url (text), notes (text nullable), created_at. RLS enabled.

**opportunity_talents columns:** id, opportunity_id (FK opportunities), talent_id (FK talents), status (Proposed/Approached/Declined/Confirmed), notes, created_at

**opportunity_contacts columns:** id, opportunity_id (FK), name, email, role, company, created_at

**opportunity_blockers columns:** id, opportunity_id (FK), description, resolved (bool), due_date, created_at

**project_income columns:** id, project_id (FK events), description, type, amount, currency, status (pending/invoiced), date, created_at

**project_expenses columns:** id, project_id (FK events), description, category, amount, currency, date, created_at

**expense_categories columns:** id, name, created_at

**currency_rates columns:** currency (PK text), rate_to_aed (numeric), updated_at

**purchase_invoices columns:** id, invoice_number (text, can be blank), supplier (text), project_id (FK events nullable), currency (AED/GBP/USD/EUR), net_amount (numeric 12,2), vat_rate (numeric 5,2 — stored as %, e.g. 5 for 5%), vat_amount (numeric 12,2 — computed+stored), gross_amount (numeric 12,2 — computed+stored), fx_rate (numeric 10,4 — rate to AED), issue_date (date nullable), due_date (date nullable), status (pending/partial/paid/**cancelled**), amount_paid (numeric default 0 — set when status=partial; auto-set to gross_amount when paid, 0 when pending), notes (text nullable), invoice_url (text nullable — link to document), created_at, updated_at. RLS enabled.
- **Cancelled status**: excluded from all totals, overdue checks, and VAT calculations
- **FX rate bug (fixed 2026-10-09)**: invoices created without setting fx_rate defaulted to 1, showing same AED as foreign currency amount. Fix: display + calculation now fall back to live `currency_rates` rate when `fx_rate = 1` and `currency != AED`. New invoices auto-populate fx_rate from live rate when currency is selected; live rate hint shown with "Use this" button if rate has drifted.

**project_profit_share columns:** id, project_id (FK events CASCADE), mc_percentage (numeric 5,2 — MORECREATIVE's share %, 0–100), mc_paid (bool default false), created_at, updated_at. UNIQUE(project_id). RLS enabled.

**salary_returns columns:** id (uuid PK), user_profile_id (FK user_profiles CASCADE), month_key (varchar 7, e.g. '2026-10'), amount (numeric), note (text nullable), created_at. RLS enabled (authenticated CRUD). Multiple entries per person per month allowed.

**project_profit_share_employees columns:** id, project_id (FK events CASCADE), user_profile_id (FK user_profiles CASCADE), paid (bool default false), created_at. UNIQUE(project_id, user_profile_id). RLS enabled.

**annual_expenses columns:** id, item (text), category (text), amount_aed (numeric), due_date (date nullable), notes (text nullable), document_url (text nullable — link to Google Drive doc), created_at, updated_at. RLS enabled. Seeded with 5 rows.

**salaries columns:** id, employee (text), role (text), monthly_salary_aed (numeric), payment_due_day (int nullable — day of month), notes (text nullable), created_at, updated_at. RLS enabled. Seeded with 3 rows.

**operating_costs columns:** id, expense_item (text), category (text), frequency ('monthly'|'quarterly'|'annual'), cost_aed (numeric — stored at stated frequency, monthly equivalent computed on the fly), notes (text nullable), created_at, updated_at. RLS enabled.

**login_audit columns:** id, user_id (FK auth.users, set null on delete), email, ip_address, user_agent, browser, os, logged_in_at (timestamptz default now), **last_seen_at** (timestamptz — updated by heartbeat every 5 min for session duration tracking). RLS enabled; authenticated users can select; inserts use service role only.

**audit_activity VIEW:** Postgres VIEW unioning created_by/updated_by/created_at/updated_at from 9 entity tables (talents, brands, events, agencies, agents, stylists, photographers, people, opportunities). Columns: entity_type, entity_id, name, created_by, updated_by, created_at, updated_at. Ordered by updated_at desc.

**Audit columns on entities:** `created_by` (text, nullable) and `updated_by` (text, nullable) exist on: talents, brands, events (projects), agencies, agents, stylists, photographers, people, opportunities. Set to `user.email` on insert/update from all create/edit handlers. Pre-existing records have NULL (shown as "unknown" in AuditStamp).

**schedule_events.importance column:** text, values 'high' | 'medium' | 'low', nullable (defaults to null = no importance shown).

### Roles
- `user_profiles.role`: admin | finance | general | **super_user**
- **super_user** role: all admin permissions + exclusive access to Match Brief AI feature
- Only paul@themorecreative.com is super_user; only super_users can assign the super_user role to others
- Finance, Banking, Admin pages visible to admin + finance + super_user
- Match Brief button on /talents hidden for non-super-users; /talents/match and /api/ai/match-brief both hard-gated to super_user only
- `user_profiles_role_check` DB constraint updated to include 'super_user'

### Vercel config
- Region: hnd1 (Tokyo) — matches Supabase ap-northeast-1
- All env vars set: SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_*, NEXT_PUBLIC_SUPABASE_*

## Data state (as of 2026-08-19)
- Backups at: `backup_talents_2026-07-20.json`, `backup_brands_2026-07-20.json`
- **267 brands** in DB (imported from Google Sheet 2026-08-18/19); contacts table populated from sheet column B

## Svelte prototype (built 2026-08-25)

A SvelteKit 2 + Svelte 5 (runes) parallel version of the Talents page lives in `app/svelte/`. Runs on port 3001. Purpose: side-by-side framework comparison with the Next.js app. Key facts:
- Uses the same Supabase project (service role key, bypasses RLS — no auth in Svelte app)
- `svelte/.env.local` is a copy of the root `.env.local` (gitignored)
- Mutations use SvelteKit form actions (`?/add`, `?/delete`) — no client-side Supabase
- Icons: `@lucide/svelte` (not the deprecated `lucide-svelte`)
- Only Talents list page built — no detail pages, no PDF export, no "Add to Project"
- Conclusion from discussion: Next.js ecosystem advantage is real for React-specific libs (PDF renderer etc.); Svelte wins on bundle size and boilerplate; Vercel is just the host, not tied to React

### Meetings module (built ~2026-10-20; updated 2026-10-26)

- `/meetings` — Google Calendar-style UI. Requires connecting a Google account via OAuth (`/api/auth/google`). Connected email stored in `google_calendar_tokens` table (row id = `00000000-0000-0000-0000-000000000001`).
- **Three views**: Month, Week, Schedule — segmented control top-right
- **Month view**: multi-day event bars with lane layout (max 3 lanes), overflow count, click day to create
- **Week view**: time grid (56px/hour), timed event blocks, now-line indicator, click slot to create
- **Schedule view**: grouped by day, 60-day lookahead, Join Meet button when hangoutLink present
- **New meeting modal**: title, date, time, duration (15/30/45/60/90/120 min), team attendees (pill toggles), external attendees (free-type email chips), description. Creates Google Meet link via API.
- **Event detail modal**: coloured header, time, attendees (accept/decline badges), description, Open in Calendar + Join Meet links, Cancel (delete) button
- **Upcoming meetings strip** (above calendar): separate API fetch — always from today, independent of calendar view. Shows next N meetings as compact one-liners (date · time · title). 5/10/15 count picker (segmented, default 5). Hidden when no upcoming meetings.
  - **Recurring event deduplication**: events sharing a `recurringEventId` are collapsed — only the next upcoming instance shown. Prevents a daily recurring meeting (e.g. "MORECREATIVE - Daily Call") from filling all N slots.
  - **24-hour visibility**: strip shows all meetings from `startOfDay(today)` not `now`, so a meeting that already started today stays visible until midnight.
- **Timezone**: uses `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser timezone). Display functions (`fmtTime`, `toLocaleDateString`) automatically use browser local time. No per-user timezone stored.
  - Timezone is the **creator's browser timezone** at time of creation. Viewers see the time converted to their own browser timezone automatically. The shared Google account (Joyce's) is only used for API auth — it does not affect timezones.
  - The Google Calendar OAuth token is **shared/single** (hardcoded row id `00000000-0000-0000-0000-000000000001`) — one connected account for the whole team.
- **API routes**: `/api/meetings` GET (fetch range), POST (create event), DELETE (cancel event); `/api/auth/google` (OAuth initiation); `/api/auth/google/callback` (token exchange + store)
- **Switch account** link shown next to connected email in page header

### Banking module (built 2026-09-05 to 2026-09-08; updated 2026-10-09)

Full banking module at `/banking` (admin + finance roles only, also gated in sidebar).

**Tabs:** AED Transactions, EUR Transactions, Expense Ledger, Income Ledger, Shareholder, **Monthly P&L**, Trial Balance, Upload

**Monthly P&L tab (added 2026-10-09):**
- Month-by-month Income / Expenses / Net / Cumulative for a selected year
- Uses `aed_equivalent` from `bank_transactions` (bank-level data, already FX-converted)
- Excludes: uncategorised rows, own-account transfers (`ledger_type = 'transfer'`), shareholder categories (`ledger_type = 'shareholder'`)
- Net P&L ≠ bank balance: P&L is trading profitability; bank balance also includes opening balance and shareholder movements
- Year selector; inline green/red bar columns; uncategorised warning if any exist

**Import:** Two formats auto-detected:
- Raw ENBD bank export (metadata block → account number + currency)
- Master spreadsheet (col 0 = 'Date', col 10 = 'Accounting Category')
- Master upsert: `ignoreDuplicates: false` (overwrites raw); raw import: `ignoreDuplicates: true` (never overwrites manual categorisation)
- Dedup key: `date|account_number|reference|description|credit|debit|balance` (7 columns — balance included to handle repeated-ref VAT charges)
- Timezone-safe date parsing: `DD MMM YYYY` parsed directly via MONTH_MAP, no Date object
- `sort_order` column preserves within-day transaction order from file row index

**Auto-categorisation rules engine:**
- Hardcoded fallback rules in `route.ts`
- User-defined rules in `bank_categorisation_rules` table (run first)
- "Remember This?" sticky bar: appears when a category is set on a previously-uncategorised row; saves a pattern rule + retroactively applies to matching uncategorised rows

**Doc Status automation:**
- Bank charges + Own-account transfers → "Not Required" on import
- Large merchant list also auto "Not Required": NOON, APPLE, DELIVEROO, GOOGLE, CAREEM, MEDICINA, SUPERMARKET, SPINNEYS, KICK, MARKET, AMAZON, ORBIT, FRAMER, ANTHROPIC, EV CHARGING, OSN, COOLING, BOTIM, SONDOS, LEMON, POLAR, FUTURE LINK, PET CORNER, VOX, HIGGSFIELD, ADOBE + more

**Transaction table UX:**
- Click row to expand → shows full description + reference; if Doc Status = Available, shows Google Drive URL field with link icon
- `document_url` column added to `bank_transactions`
- Sortable by all columns (Date, Description, Credit, Debit, Balance, AED Balance, Category, Doc Status, Notes)
- Multi-select category filter (checkbox dropdown)
- "Needs Category" button (amber) + "Missing Doc" button (orange) — filter to problem rows
- Debounced search (300ms) to avoid per-keystroke recompute
- Summary bar: row count, Credit, Debit, Net; EUR tab also shows AED Equiv net

**AED/EUR tabs:**
- AED tab: no AED Equiv column; shows AED Balance
- EUR tab: no AED Equiv column; shows EUR Balance + AED Balance (spot: `balance × fx_rate`)
- Tab labels show unreviewed transaction count badges

**Trial Balance:**
- Year switcher (2025 / 2026 / 2027)
- 2025 → shows "Year-End Balances – 31 Dec 2025" (the audited opening balance figures)
- 2026 → shows "Opening Balances – 1 Jan 2026" + 2026 movements
- 2027+ → movements only
- Opening balances editable inline (hover to edit)

**Accounting Categories (dynamic — built 2026-09-07):**
- Moved from hardcoded to `bank_accounting_categories` table
- `ledger_type` field: expense | income | shareholder | transfer | neutral — drives Trial Balance logic
- Managed from Upload tab: add new category with ledger type, delete existing
- Seeded with all original categories + Audit/Accounting

**DB tables added:**
- `bank_transactions` — full transaction record with sort_order, document_url, fx_rate_to_aed, aed_equivalent, accounting_category, document_status, document_required, notes, etc.
- `bank_opening_balances` — audited prior-year balances (id, account_name, debit_aed, credit_aed, sort_order)
- `bank_categorisation_rules` — pattern, accounting_category, transaction_type, document_required
- `bank_accounting_categories` — name, ledger_type, sort_order
- `monthly_fx_rates` — year, month, currency, rate_to_aed (used for EUR→AED on EUR transactions)

**Finance tab updates (2026-10-09 / 2026-10-13):**
- Purchase Invoices summary bar: "Total Received" renamed to "Total Paid" (2026-10-13)
- Purchase Invoices summary bar: previously said "Total Received" (now fixed)
- VAT tab: click-to-expand quarters showing individual invoices (output VAT: invoice# / billed to / subtotal / VAT AED; input VAT: invoice# / supplier / net amount / VAT AED)

### Feedback widget (built 2026-10-13)
- Fixed right-side "Feedback" tab visible on every page (via `components/feedback-widget.tsx` in `shell.tsx`)
- Collapsed by default; expands to panel with type selector (Suggestion / Bug / General), message textarea, page URL auto-captured
- Submits to `/api/feedback/route.ts` → Resend API → email to paul@themorecreative.com
- `RESEND_API_KEY` must be set in Vercel env vars (added to .env.local; key stored in .env.local only — not committed)
- `resend` package installed (^6.32.1)

### Role-based Finance tab access (updated 2026-10-13)
- **General role** can now see the Finance tab on `/projects/[id]` — view only
- General users see: P&L summary, income, expenses, sales & purchase invoice lists — but NO add/edit/delete buttons, NO row click-through to invoice detail, income status shown as badge not dropdown
- Finance/Banking nav links remain hidden for General role
- `canEditFinance` prop (admin/finance/super_user) controls mutations; `canViewFinance` (+ general) controls tab visibility

### Completed projects sort order (updated 2026-10-13)
- Completed projects section on `/projects` now sorted newest first (`.reverse()` applied client-side after server fetch)

### Contracts module (built 2026-09-15, nav hidden pending rethink)

- **`/contracts` page** exists — list view, full-text search, drag-and-drop PDF upload
- **PDF flow**: `pdfjs-dist` extracts full text client-side (free, no API), stores in `extracted_text` column, user gives it a title, one-click save. No manual form entry.
- **Search**: searches full contract body text client-side; PostgreSQL `tsvector` trigger on `extracted_text` column maintains a search index for future server-side FTS
- **Removed from sidebar nav** — Paul decided to rethink the overall contracts approach before surfacing it
- **`pdfjs-dist` installed** — worker copied to `public/pdf.worker.min.mjs`
- **`contracts` table** in Supabase with: id, brand_id (FK), talent_id (FK), title, contract_type, status, client_name, client_email, brands_involved (text[]), effective_date, end_date, signed_date, fee_amount, fee_currency, fee_aed_equivalent, payment_terms, services_summary, territory, governing_law, exclusivity, document_url, notes, extracted_text, search_vector (tsvector, trigger-maintained), created_by, created_at, updated_at
- **Brands detail page** has a Contracts section (shows contracts where brand_id = this brand) — already wired up
- **`tsconfig.json`** — added `"svelte"` to `exclude` array to fix pre-existing build failure from stray SvelteKit files

## Removed / not relevant
- TikTok field and Status field removed from Brand UI (DB columns kept)
- IG/TK Followers removed from Brands UI
- agent_contacts replaced by email/phone on Agent directly
- talent_contacts no longer used
- Agent Type removed from Add Agent forms
- Agents removed from sidebar nav (merged into /agencies)
- Talent Schedule removed from Project detail
