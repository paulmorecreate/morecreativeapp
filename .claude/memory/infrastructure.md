---
name: infrastructure
description: "All URLs, credentials, and infrastructure for the More Creative app"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4204cef3-c6ac-4f88-9764-dc164e501c86
---

# Infrastructure

## Supabase
- **Project name:** MoreCreativeApp
- **Project ID:** bqvqjyvhplgmayirbsyl
- **URL:** https://bqvqjyvhplgmayirbsyl.supabase.co
- **Anon key:** in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored)
- **Important:** There is also an old project "winickp-dashbboard" — do NOT use that one. Always use MoreCreativeApp.

## Vercel
- **Production URL:** https://morecreativeapp-more-creative.vercel.app
- The URL with a hash like `-obm6e2hom-` is a frozen old deployment — always use the production URL above
- Connected to GitHub repo via Vercel dashboard — pushes to `main` auto-deploy

## Supabase Personal Access Token (PAT)
- **PAT:** stored in `~/.claude/projects/.../memory/infrastructure.md` on the local machine (not committed)
- Use this with the Supabase Management API to run DDL migrations:
  `POST https://api.supabase.com/v1/projects/bqvqjyvhplgmayirbsyl/database/query`
  `Authorization: Bearer <PAT>`

## GitHub
- **Repo URL:** https://github.com/paulmorecreate/morecreativeapp
- **Branch:** main
- **Remote:** already configured in the local repo (`git remote -v` to confirm)
- **Token:** Do NOT store here. Regenerate at github.com/settings/tokens → "Personal access tokens (classic)" → repo scope. Then: `git remote set-url origin https://<TOKEN>@github.com/paulmorecreate/morecreativeapp.git`

## App Login
- Users managed via Admin page (/admin → Users section) using Supabase Admin API
- SUPABASE_SERVICE_ROLE_KEY must be set in Vercel env vars for user management to work
- Vercel Deployment Protection must be OFF (Settings → Deployment Protection) so non-Vercel users can access the app
- Current users: paul@themorecreative.com, joyce@themorecreative.com

## Supabase Auth setup note
- /auth/callback must be in Supabase Auth → URL Configuration → Redirect URLs for password reset to work
- Add: https://morecreativeapp-more-creative.vercel.app/auth/callback

## Data state (as of 2026-07-20)
- Talents: EMPTY (deleted; backup at backup_talents_2026-07-20.json in project root)
- Brands: EMPTY (deleted; backup at backup_brands_2026-07-20.json in project root)
- 4 projects remain: Cannes 2026, Venice 2026, Milan Fashion Week 2026, Paris Fashion Week 2026
