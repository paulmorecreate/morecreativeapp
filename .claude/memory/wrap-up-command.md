---
name: wrap-up-command
description: Where the /wrap-up custom command lives and how Claude Code custom commands work
metadata: 
  node_type: memory
  type: reference
  originSessionId: bea3bad6-8eea-40d1-89e5-8ba0ad4a4d75
---

# /wrap-up Command

Paul types `/wrap-up` at the end of a session to trigger memory saving without prompting.

## File locations

- **Project-level** (primary): `/Users/paulwinick/Documents/Projects/morecreative/app/.claude/commands/wrap-up.md`
- **Global fallback**: `/Users/paulwinick/.claude/commands/wrap-up.md`

## How Claude Code custom commands work

- Custom slash commands live in `.claude/commands/<name>.md` — either project-level or `~/.claude/commands/` globally.
- Claude Code must be **restarted** to pick up new command files added mid-session (or files added between sessions may not appear until restart).
- Plugin commands use a `<plugin>:<command>` prefix; project/user commands have no prefix.
- The newer format is `.claude/skills/<name>/SKILL.md` but `.claude/commands/<name>.md` still works.

## Global command uses dynamic path derivation

The global fallback (`~/.claude/commands/wrap-up.md`) was originally hardcoded to the morecreative project memory path, which broke it in other projects. Fixed on 2026-08-17 — it now derives the memory path at runtime using `pwd | sed ...`. This means `/wrap-up` works in any project, writing memories to that project's own directory.

## Why this matters

Paul was told in a previous session that /wrap-up had been created, but it hadn't — the file was never actually written. It was properly created on 2026-08-13. If it ever says "Unknown command" again, the most likely cause is that Claude Code needs a restart.
