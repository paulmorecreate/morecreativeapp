---
name: feedback
description: How Paul likes the work done — preferences and things to avoid
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4204cef3-c6ac-4f88-9764-dc164e501c86
---

# Feedback & Preferences

## Commits and Git Pushes
Paul controls when both commits and pushes happen. He has explicitly said "please don't push to git until I say so" — always wait for "ok push to git" before running any `git push`. Commits mid-session are also Paul's call; offer to commit but don't be surprised if he handles it himself.

**Why:** He wants to review all changes before they go to remote and trigger a Vercel deploy. He explicitly instructed this twice in the same session (once for commit, once for push).
**How to apply:** Build everything, commit locally when ready, but never push until Paul says "ok push to git" or equivalent explicit instruction.

## URL confusion
The Vercel deployment-specific URL (e.g. `-obm6e2hom-more-creative.vercel.app`) is frozen — always direct Paul to `morecreativeapp-more-creative.vercel.app`.

**Why:** Paul couldn't see the Edit button because he was on an old frozen deployment URL.
**How to apply:** After every deploy, remind him to use the production URL.

## Supabase project
Always use project "MoreCreativeApp" (ID: bqvqjyvhplgmayirbsyl). There is an old project "winickp-dashbboard" that must never be used.

**Why:** Early in the project, the wrong Supabase project was connected. Paul had to manually correct it.
**How to apply:** Before any Supabase MCP tool call, confirm the project ID is bqvqjyvhplgmayirbsyl.

## Modal inside a table — always use createPortal

`components/ui/modal.tsx` now uses `createPortal` to render to `document.body`. Never revert this.

**Why:** When a Modal was rendered inside a `<tbody>` via a React Fragment (`<><tr/><Modal/></>`), browsers silently stripped it as invalid HTML — the modal never appeared. Four attempts to fix the textarea height failed because the modal wasn't rendering at all. Fix was to use `createPortal`.

**How to apply:** Any modal rendered from inside a table row must use a portal. The existing Modal component already does this — don't remove it.

## Colour as a pill badge, not a cell/row background

When showing a user's colour as a visual indicator in a table, use a compact **rounded pill** (`rounded-full`, tight padding) around the text — not a cell background (`style={{ backgroundColor }}` on `<td>`) and not a row background.

**Why:** Paul described the cell-background approach as "ugly box" and asked for "a round shape around the text rather than this ugly box."
**How to apply:** Any time user colour needs to appear in a table (e.g. Last Updated column, assigned-to indicators), wrap the text in `<span className="inline-flex items-center px-2 py-0.5 rounded-full" style={{ backgroundColor: color }}>`.

## No Prisma
The brief mentioned Prisma but it was skipped in favour of Supabase JS client directly. Paul did not object.

**Why:** Simpler setup, easier Vercel deployment.
**How to apply:** Don't introduce Prisma. Use supabase client for all DB operations.

## Middleware must never use getUser() — use getSession()

`middleware.ts` must use `supabase.auth.getSession()`, not `supabase.auth.getUser()`.

**Why:** `getUser()` makes a network round-trip to Supabase on every request. Vercel Edge middleware has a ~1.5s timeout. Any Supabase latency or blip causes a 504 MIDDLEWARE_INVOCATION_TIMEOUT that takes the whole site down. `getSession()` reads the JWT from the cookie locally — no network call, no timeout risk.
**How to apply:** Always use `getSession()` in middleware for the auth gate. Use `getUser()` inside page server components where tamper-proof auth is needed.

## No paid API calls for internal features — Paul is on Supabase free tier

Paul does not want to incur API costs for internal app features. When the Anthropic API was proposed for contract PDF extraction (~$0.01–0.03/call), he rejected it immediately.

**Why:** Cost sensitivity — the app is internal and on Supabase free tier. Any feature that requires a paid external API call (Anthropic, OpenAI, etc.) is not acceptable unless Paul explicitly agrees.
**How to apply:** Default to free, client-side, or already-included-in-stack solutions. If a feature genuinely requires a paid API, flag the cost clearly and wait for explicit approval before building.

## Vercel auto-deploy webhook can silently break

The Vercel GitHub webhook stopped firing (pushes to `main` were not triggering deployments). Root cause: Vercel was under the `more-creative` team account (paul@themorecreative.com), connected to `paulmorecreate/morecreativeapp`. The GitHub App integration had no integrations installed — "No Integrations Installed" on the team integrations page.

**Why:** Reconnecting GitHub via the wrong account (personal vs team) breaks the webhook silently — no error, just no deployments.
**How to apply:** If auto-deploys stop working, go to Vercel team → Integrations page and check if GitHub App is installed. Fix: disconnect and reconnect the repo from Settings → Git, using the correct `paulmorecreate` GitHub account. A forced empty commit can confirm the webhook is live.

## Supabase DDL/migrations — use the Management API with PAT

For any Supabase DDL (CREATE TABLE, ALTER, INSERT seed data), use the Supabase Management API: `POST https://api.supabase.com/v1/projects/bqvqjyvhplgmayirbsyl/database/query` with `Authorization: Bearer <PAT>`. PAT is stored in `memory/infrastructure.md`. Do NOT open the Supabase dashboard in the browser. Do NOT try to connect via the pooler with the service role JWT (it's not the DB password).

**Why:** Paul explicitly said "I wanted you to run it using the API" after browser automation. The service role JWT ≠ DB password, so direct pg connections fail. Management API with PAT is the only reliable path.
**How to apply:** Always reach for Management API + PAT first. Never open the Supabase SQL editor via browser automation.

## Timezone: prefer browser detection over DB storage for simple cases

When a feature needs the user's timezone, default to `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser detection) rather than storing a timezone field in `user_profiles`. Paul's response when the DB-storage approach was proposed: "ok let's just use browser time then, seems easy enough."

**Why:** Internal app with a small team. Browser timezone is accurate for their device without any setup friction. No travel edge case was a concern.
**How to apply:** Don't over-engineer per-user timezone storage unless Paul specifically raises a cross-device or travel requirement. Browser timezone first.

## Don't show placeholder rows for missing values in data cells

In cells that show multiple data rows (e.g. salary + commission in Team Earnings), only render a row if the value is actually present. Never show "comm. —" or "salary —" placeholders just to pad layout.

**Why:** Paul explicitly rejected the always-show-both-rows approach: "If there is no commission, then don't include that line against the team member."
**How to apply:** Conditionally render each sub-row (`{commission > 0 && <div>...comm...</div>}`). Do not force empty rows for visual consistency — omit them entirely.

## Right-aligned number cells — put action buttons LEFT of the label

When a data cell shows a labelled number (e.g. "salary AED 48,000") plus action buttons (edit, delete, return), put the action buttons to the LEFT of the label — not after the number. This keeps the AED amount as the rightmost element in every row, so numbers right-align consistently within the column.

**Why:** If buttons sit after the number, "salary AED 11,000 ×" and "comm. AED 2,268" have different rightmost positions — amounts don't align. Paul flagged this as looking "poor" (Align.png, Align2.png).
**How to apply:** In Team Earnings cells: `[× button][salary label][AED amount]` — not `[salary label][AED amount][× button]`.

## Vercel env var UI masks values — blank display ≠ missing

In Vercel's dashboard, all env var values are hidden by default. They look empty but are set. You must click the reveal/eye icon to see the actual value. A var that doesn't exist won't appear in the list at all.

**Why:** Paul saw blank env var values in Vercel and concluded they were missing/deleted. They were set all along — the display is masked for security.
**How to apply:** Don't assume an env var is missing based on the Vercel UI alone. Check whether the variable name appears in the list; if it does, the value is just masked.
