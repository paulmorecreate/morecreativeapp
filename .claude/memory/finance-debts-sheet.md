---
name: finance-debts-sheet
description: "Google Sheet financial dashboard Paul uses — structure, what's in it, and what to build next in the Finance module"
metadata: 
  node_type: memory
  type: project
  originSessionId: 73fbaaf8-5ae9-4c89-9816-4900ba7fbc2b
---

Paul shared a live Google Sheet (ID: `1nSpbpJbfNo74GDcDxjW2kkNddIN35FtHEN27RmacRrQ`) used as the agency's financial dashboard. Read via Google Drive MCP on 2026-08-11.

## Sheet tabs

| Tab | Purpose |
|---|---|
| Dashboard | Cash position, key alerts, projected balance, cash runway |
| Debts | Money owed to talent agencies/managers — AED 707k outstanding |
| Outstanding Expenses | Non-talent debts (consultancy, branding) |
| Salaries & Operating Costs | Monthly payroll: Nima AED 48k, Olga AED 12k, Paul AED 11k = AED 71k/month |
| Annual Expenses | Licence, office lease, insurance, visas — with due dates |
| Projects | Per-project P&L skeleton (currently empty rows) |
| VAT | UAE 5% VAT invoice register, quarterly returns (Q3 due 28/10/2026) |

## Debts tab — the most critical

Columns: Creditor, Debt Type, Currency, Original Amount, FX Rate, Amount Owed (AED), Due Date, Days Until Due, Urgency Level, Priority Rank, Notes, Status, Paid to Date (AED)

- Multi-currency: AED, EUR, USD — live FX via GOOGLEFINANCE (EUR/AED = 4.2373, USD/AED = 3.6725)
- Urgency tiers: OVERDUE (<0 days), CRITICAL (≤7), SOON (≤30), LOW (>30)
- Status: Active / Archived
- Installment splits common (e.g. "Part 1 - Installment 1", "Part 1 - Installment 2")
- Partial payments tracked via "Paid to Date (AED)" column
- Creditors map directly to Agencies/Agents in the CRM (e.g. Ford Management, Elite Milan, Lions NYC)

Example active debts:
- Alexis Ren — USD 11,000 — AED 40,397.50 — Due 30/08/2026 — SOON
- Isabeli Fontana (BR ADV) — EUR 9,250 — AED 39,090.50 — Due 09/08/2026 — CRITICAL
- Ford Management (Barbara) — EUR 12,500 — AED 52,966.25 — Due 30/08/2026 — SOON
- Elite Milan (Stella Maxwell) — EUR 20,000 — AED 84,746 — Due 29/12/2026 — LOW
- Lions NYC (Part 1) — EUR 12,100 — AED 51,134.60 — Due 30/08/2026 — SOON
- Lions NYC (Part 2) — EUR 50,000 — AED 211,300 — Due 29/12/2026 — LOW
- Mariott Hotel Cannes — EUR 15,000 — AED 63,390 — hotel deposit, ~half returning

Total Outstanding: AED 707,065. Total Paid to Date: AED 9,736.

## What's already in the app

- Finance P&L tab on Projects (income/expenses per project)
- Invoices module (invoice numbering format: `2026-0054`)

## Agreed next build: Debts tracker

Paul agreed this is the highest-value addition. Plan discussed:
- New Debts section in Finance
- Fields: creditor name (linkable to Agency/Agent), debt type, currency, original amount, FX-to-AED, due date, auto-calculated urgency, installment support, paid to date / remaining, Active/Archived status
- Summary card on Finance dashboard: total outstanding, CRITICAL count
- Leave Salaries and Annual Expenses as spreadsheet concerns for now

**Why:** AED 707k outstanding, urgency-driven, ties to existing CRM entities (agents/agencies).
