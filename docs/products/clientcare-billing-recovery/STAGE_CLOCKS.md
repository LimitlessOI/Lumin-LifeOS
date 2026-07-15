<!-- SYNOPSIS: Stage map + follow-up clocks — every ClientCare billing scenario -->

# Stage clocks — every client, every billing scenario

**Doctrine:** Global `59400` is the file spine. Midwife does nothing. SYSTEM works every open claim on a clock until paid enough, written no-liability denial, or founder closes.

## Clocks (runtime)

| Clock | Interval | What it does |
|-------|----------|--------------|
| Stage clock tick | **15 min** (`CLIENTCARE_STAGE_CLOCK_INTERVAL_MS`) | Sync `next_due_at` on open claims; if any due → enqueue hands-off |
| Hands-off file | **30 min** (`CLIENTCARE_HANDS_OFF_INTERVAL_MS`) | Execute due workers (file / prepare / follow-up stamp) |
| Boot delays | 8 min clocks / 15 min hands-off | Avoid racing tip at deploy |

## APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/clientcare-billing/stages` | Full scenario → stage → clock map |
| GET | `/api/v1/clientcare-billing/stages/due` | Due-now work queue |
| POST | `/api/v1/clientcare-billing/stages/sync-clocks` | Stamp clocks on all open claims |
| POST | `/api/v1/clientcare-billing/stages/execute-due` | Run due workers now |
| POST | `/api/v1/clientcare-billing/stages/advance/:claimId` | Advance on event (`proved_sent`, `underpaid`, …) |
| GET | `/api/v1/clientcare-billing/forever-chase` | Open queue + scenario/stage/due |
| POST | `/api/v1/clientcare-billing/hands-off/run` | Same executor (due queue first) |

## Scenarios (all)

1. **unpaid_birth_file** — discover → prepare → **file global** → prove Sent Bills → await ERA (**7d**)
2. **claim_status_followup** — check status → recheck (**14d**) → escalate ask (**7d**)
3. **underpayment_chase** — ERA reconcile → demand balance (**7d**) → recheck (**14d**)
4. **denial_correct_resubmit** — review → correct/resubmit (**1d**) → prove
5. **denial_timely_proof** — collect proof → submit (**3d**) → recheck (**14d**)
6. **forever_ask_insurer** — ask now → ask again (**14d**) → escalate (**7d**) forever
7. **billing_notes_repair** — read notes → repair coverage → handoff file
8. **secondary_payer** — confirm primary → file secondary (**1d**) → chase (**14d**)
9. **newborn_claim** — identify → file → chase (**14d**)

Payer override `followup_cadence_days` overrides follow-up/ask/underpay/await clocks when set.

## Config source

`config/clientcare-billing-stages.js`

## Execute order (operators / tip)

1. `POST /forever-chase/sync` — seed births + notes into ledger  
2. `POST /stages/sync-clocks` — stamp scenarios + `due_at`  
3. `POST /stages/execute-due` `{ "limit": 5 }` — file/chase due now  
4. Poll job → prove Sent Bills / stage advance  
5. Clocks keep ticking without Sherry
