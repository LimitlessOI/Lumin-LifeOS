<!-- SYNOPSIS: VERIFY list — what we must learn from Sherry and contracts -->

# 07 — Gaps & VERIFY (study queue)

We do **not** yet know everything about insurance billing for Sherry. This is the honest hole list.

## Ask Sherry (clinical + billing practice)

| # | Question | Why |
|---|----------|-----|
| 1 | Global maternity (59400-style) vs itemized antepartum+delivery+postpartum? | Controls charge capture |
| 2 | Which CPT list does she actually use for home birth / birth center / transfer? | Code catalog |
| 3 | Does WRM bill UB-04 facility charges? | Claim type |
| 4 | How is newborn billed (same claim vs baby chart)? | Dollar anatomy |
| 5 | Standard VOB questions she always asks? | VOB HUD |
| 6 | Which payers need auth for home birth? | Prevent $0 |
| 7 | What does she call charting vs billing notes? | Future mic assist |
| 8 | When does she write off vs keep chasing? | Forever-chase policy |
| 9 | Secondary insurance workflow today? | Missed dollars |
| 10 | Common denial reasons she sees? | Appeal playbooks |

## Obtain from practice files

| Artifact | Use |
|----------|-----|
| Payer contracts / allowed schedules | Underpay detection |
| ClientCare fee schedule export | Billed vs allowed |
| Sample EOBs/ERAs (redacted) | CARC library |
| Credentialing / NPI / taxonomy / group # | Clean claims |
| Timely filing limits by payer | Calendar |

## Obtain from ClientCare (system can pull)

| Pull | Surface |
|------|---------|
| CPT fees | Services / CPT by Provider / SuperBill |
| Allowed amounts | Allowed Amount report |
| Open balances | Sent Bills + AR + Aging |
| Unbilled births | Birth Activity + forever-chase seed |
| Billing notes backlog | Home Billing Notes (91 historically) |

## Study rule

Until a row moves from VERIFY → KNOW with source, assistants must not speak as if amounts or code choices are certain.
