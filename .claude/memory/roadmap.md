---
name: roadmap
description: Agreed next features and future build priorities for MoreCreative
metadata: 
  node_type: memory
  type: project
  originSessionId: 894511e4-c9c1-417f-888d-fdd211440a28
---

# Roadmap

## Recently completed (2026-11-02)

- **Credit Notes**: full feature on Sales Invoices. Same `invoices` table with `document_type='credit_note'` + `linked_invoice_id`. CN-YYYY-XXXX numbering. Line items copied as negatives — auto-reduces GP/profit totals. Purple badge in list, "CN issued" on originals. PDF renders with purple banner, credit amount in red.
- **Finance label rename**: Sales Invoice summary bar → "Total Received" / "Total Owed". Purchase tab retains "Total Paid" / "Total Pending". Shared `SummaryBar` component with optional `paidLabel`/`pendingLabel` props.
- **Talent Pool row numbers**: sequential `#` column left of drag handle in Project → Overview → Talent Pool. `text-gray-500 font-medium tabular-nums`.
- **Team Earnings zero salary fix**: UNIQUE constraint on `(user_profile_id, month_key)` in `monthly_salary_payments`. Saves use upsert. Zero amount is valid ("not yet paid") — shows "AED 0" not "—". Deduplicated stale rows from DB.
- **Talent import template**: Country (dropdown via hidden `_Countries` sheet + named range `CountryList`) + Notes columns. Import preview shows "Export flagged (N)" CSV download for duplicates/fuzzy matches.
- **Talent double-click**: double-clicking a talent row on `/talents` navigates to the talent detail page.

## Recently completed (2026-10-29)

- **Brand Show status**: `project_brands.status` column (In Conversation / Confirmed / Rejected / Cancelled). Dropdown in header bar; header gradient colour driven by status (default = red).
- **Lineup grid view + status filters**: toggle between list and grid (4-up cards) on Project → Overview tab. Status filter pills for both brands and Talent Pool. Grid card shows talent name previews; "Manage Talents" modal for full table + searchable add.
- **Team Earnings salary returns**: `salary_returns` table (user_profile_id, month_key, amount, note). Salary cell in Team Earnings shows base → per-return deductions → net. Hover to add; hover each line to delete. Multiple entries per person per month.
- **Invoice status filtering in P&L**: Only `received` sales invoices and `paid`/`partial` purchase invoices count toward gross profit — applies to project Finance tab AND Team Earnings. Draft/Sent invoices still shown in tables but excluded from calculations. `received` badge added to project invoice table.

## Recently completed (2026-09-05 to 2026-09-08)

- **Banking module** — full /banking page (admin + finance only). AED + EUR transaction tabs, Expense/Income Ledgers, Shareholder tab, Trial Balance with year switcher. Import from raw ENBD exports or master spreadsheet. Auto-categorisation rules engine + "Remember This?" bar. Merchant-based Doc Status automation. Click-to-expand rows with Google Drive document linking. Dynamic accounting categories managed from Upload tab.
- **VAT drill-down** — click-to-expand quarters on Finance → VAT tab now shows contributing invoices (output + input VAT detail side by side)
- **Finance**: "Total Paid" → "Total Received" on Sales Invoices summary bar

## Recently completed (2026-09-04)

- **VAT Liability Summary tab** — new "VAT" tab on /finance. Quarterly breakdown of Output VAT (sales), Input VAT (purchase), Net VAT Payable/(Reclaimable), Return Due Date. UAE quarters, 28-day filing deadline. Current quarter highlighted; overdue past quarters flagged. No DB changes needed.

## Recently completed (2026-08-26)

- **Finance Overview dashboard tab** — new default tab on /finance. Aggregates all 4 tabs: revenue collected/outstanding/collection rate, monthly burn (salary+ops breakdown), annual overhead, purchase outstanding, net revenue with burn-coverage months, Needs Attention alerts (overdue annual expenses, renewals due soon, overdue sales invoices). Clicking alerts jumps to the relevant tab.
- **Purchase invoice partial payment** — `amount_paid` column added to `purchase_invoices`. When status = Partial, Amount Paid field appears; list view shows paid/remaining split; summary bar and Overview correctly split partial POs.
- **AED column on invoice lists** — sortable AED equivalent column added to both Sales and Purchase invoice tables. AED-currency rows show "—".
- **Purchase invoice default sort** — changed from Due Date to Issue Date descending.
- **Brand Show talent time field** — `show_time` (text, HH:MM 24-hour) added to `project_brand_talents`. Displayed inline next to the date in the lineup table. Deal and Creative columns removed from that table.
- **Collapsible sidebar** — desktop sidebar toggles between full (w-56) and icon-only (w-14) mode. State persisted to localStorage key `sidebar-collapsed`. Toggle button at sidebar bottom uses ChevronsLeft/Right icons.
- **Delete note confirmation** — clicking X on a brand show talent note now shows a confirmation modal before deleting.
- **Per-show Excel export (ExcelJS)** — replaced plain xlsx output with fully styled ExcelJS workbook: dark navy title + subtitle rows, slate header row, alternating white/grey data rows, status colour-coding (Confirmed=green, Rejected=red, In Conversation=amber, Proposed=blue), sorted by time then name, border grid, wrapped Comments cell, talent-count footer. Removed Deal Type, Creative, Accepted, Notes columns.

## Recently completed (prior)

- **To Do widget overhaul** — sortable table, inline editing, priority, assignment, colour coding, date added, deadline, search, filter pills
- **Telegram bot** — quick task capture from phone; allowlisted users only
- **PWA** — installable on iPhone via Safari → Add to Home Screen
- **Opportunities module** (built 2026-08-03) — full deal pipeline at /opportunities and /opportunities/[id]; stages, MC role, consideration type, talent shortlist with statuses, client contacts, blockers, financials (gross fee, commission %, auto-calculated net to talent)
- **Finance P&L** (built 2026-08-03) — income/expenses per project inside Finance tab; AED conversion via currency_rates table; expense categories editable from Admin; edit/delete modals with confirmation; date field on both
- **Invoice improvements** — Save & Close button, back arrow returns to project Finance tab; hover-to-delete on main Finance list; hover-to-delete on invoice list within project; project delete cascades to all finance records
- **Finance module expansion** (built 2026-08-17) — `/finance` now has 4 tabs:
  - *Sales Invoices* + *Purchase Invoices*: AED paid/pending summary, due date range filter, all columns sortable (default: Due Date desc). Purchase invoice records a received 3rd-party invoice (supplier, currency, net/VAT/gross, fx_rate, status pending/partial/paid). P&L cards on project Finance tab include invoice totals.
  - *Annual Expenses*: track recurring licence/subscription costs; status auto-derived from due date (Overdue/Due Soon/OK); document URL field; sortable (default Due Date asc). Seeded from "Annual Expenses" Google Sheet worksheet.
  - *Running Costs*: two sections — Salaries (monthly salary, payment day) and Operating Costs (monthly/quarterly/annual frequency, monthly equivalent computed). Combined monthly/annual summary bar. Seeded from "Salaries & Operating Costs" worksheet.
- **Schedule importance levels** (built 2026-08-13) — High/Medium/Low per schedule event; 4px colour-coded left border (rose/amber/slate); stored in `schedule_events.importance`
- **Audit trail** (built 2026-08-13) — `created_by`/`updated_by` columns on 9 entity tables; `AuditStamp` component on every detail page; heartbeat session tracking via `/api/auth/heartbeat` updating `login_audit.last_seen_at` every 5 min; central Admin → Audit tab with searchable Login Audit + Record Activity tables (10-row default + "Show more")

## In progress / paused (2026-09-15)

- **Contracts module** — DB table + `/contracts` page built, hidden from nav while Paul rethinks the approach. Core concept confirmed: drop a PDF → extract full text → store for full-text search (no manual form entry, no AI API cost). See app-state.md for full details.

## Next priorities (in order)

1. **AI Agent — Talent Brief Matcher** ← NEW, discussed 2026-09-26
   - Gmail access confirmed (paul@themorecreative.com via MCP)
   - Briefing: paste/email a casting brief → Claude returns ranked talent shortlist with reasons
   - Full plan in [[ai-agent-brief-matcher]] memory
   - **Blocked on:** Paul to confirm the skills list before migration runs
   - Phase 1: DB migration (7 new talent columns) + talent_skills lookup table + form update + Generate Profile API
   - Phase 2: Brief Matcher UI at /talents/match
   - Phase 3: Email scanning integration

2. **Ambassadorships / Long-term Partnerships**
   - Brand ↔ Talent long-term relationship (distinct from one-off project bookings)
   - Fields: start date, end date/renewal date, scope (exclusivity, categories), deliverables, status, notes
   - Renewal alerts (connect to To Do or dashboard)
   - Sits between Brand and Talent records

2. **Talent availability**
   - Mark talent as unavailable for date ranges
   - Conflict detection when booking into a project
   - Calendar view of all projects

3. **Scouting pipeline**
   - Pre-roster stages: prospect → in conversation → signed
   - Follow-up dates, scouting notes, social metrics

4. **Campaigns** (separate from Projects which = events/red carpet)
   - Brief, casting (talents), brand, timeline, deliverables list

5. **Product Placements**
   - Lightweight record: talent, brand, product/category, event/moment, outcome notes

## How Opportunities → Projects (built 2026-10-20)
- **Convert to Project button** is live on both the list page and the detail page.
- Creates an `events` row (copies name, location, category, event_date), copies shortlisted talents to `project_talents`, sets `converted_project_id` on the opportunity.
- Converted opps move to a collapsible "Converted to Project" section on the list; detail shows a green banner + "View Project" link.
- Double-conversion is blocked — re-clicking shows "Already Converted → Go to Project".

## iPhone / Mobile
- PWA done — installable now, full screen, dark status bar
- React Native (Expo) discussed as future option — push notifications are the main thing PWA can't do

## Outreach email composer (discussed 2026-08-26, not yet built)
- Team sends ~30 templated pitch emails per day manually (talent + event + brands + lookbook links + contact name)
- Proposed: Outreach composer built into the app — select project, brands to pitch, contact (agent/stylist), app generates pre-filled email body, one-click Copy or Send via Gmail API, log sent outreach against project
- Paul said "will come back to this" — no build decision yet
- Simpler alternative discussed: Google Sheets + YAMM (Yet Another Mail Merge) Gmail add-on

## AI Module
- Full plan now in [[ai-agent-brief-matcher]]
- Anthropic API key will be needed (`ANTHROPIC_API_KEY` Vercel env var) — not yet added
- First feature: talent-to-brief matching (not general Q&A)

## Deferred
- **Talent Schedule within Brand Show** — Paul wants it re-added at Brand → Talent level inside a project show (not at top project level)

## Case study
- MoreCreative case study written and saved as PDF + .md on Paul's Desktop (2026-07-27)
