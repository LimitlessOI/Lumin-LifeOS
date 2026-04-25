# AGENT RULES — COMPACT ENFORCEMENT
> Generated: 2026-04-25T03:37:16.334Z | Regenerate: `npm run gen:rules`
> Normal sessions: read THIS instead of NSSOT + Companion (~26k tokens). Full NSSOT only for constitutional edits/conflicts/onboarding.

## HIERARCHY
NSSOT `docs/SSOT_NORTH_STAR.md` > Companion `docs/SSOT_COMPANION.md` > `CLAUDE.md` > Amendments > else

## SUPREME LAWS (§2.6 — no exceptions)

| Law | Enforcement |
|-----|-------------|
| No lies/mislead (§2.6) | HALT |
| KNOW/THINK/GUESS/DON'T KNOW | Required |
| No shortcut on reads/verify/receipts | Pre-commit |
| Wasteful gate? → council (§2.6 ¶8) | Gate-change |
| QUICK_LAUNCH must stay current | Session end |
| **System must always improve, never regress** | Baseline check hard-blocks |
| TSOS (§2.11a): builder P0 | Preflight, receipts |
| Report Adam (§2.11b): score+evidence, why A vs B, residue | End-slice |
| Machine channel (§2.14) | `docs/TSOS_SYSTEM_LANGUAGE.md` only |
| Operator ask (§2.15) | **Do** or **HALT**; §2.11b **INTENT DRIFT** if ≠ ask |
| Supervisor (§2.11c) | **System** /build first; **audit**; IDE product = **GAP-FILL** only |

## §2.11 BUILDER-FIRST (machine-enforced)

1. `npm run builder:preflight` — fail-closed; fixes URL/key/GITHUB_TOKEN errors
2. `POST /api/v1/lifeos/builder/build` `{ domain, task, spec, target_file, commit_message: "[system-build] ..." }`
3. `committed:true` → done, write receipt. `committed:false` → call `/execute`. Builder down → **GAP-FILL: <exact reason>**, fix platform same session.

Commit-msg hook hard-blocks `routes/`, `services/`, `public/overlay/`, `db/migrations/` without `[system-build]` or `GAP-FILL:`. `--no-verify` forbidden without Adam's explicit request.

Platform exceptions (no builder): `startup/`, `middleware/`, composition-only `core/` wiring, SSOT docs.

§2.11b: what/score+evidence/why/risk; **system’s goal** + **where it breaks** (§2.11c). INTENT DRIFT (§2.15). §2.14: `[TSOS-MACHINE]` → `TSOS_SYSTEM_LANGUAGE.md`.

## §2.12 TECHNICAL DECISIONS

Load-bearing forks (arch, security, data, APIs) → council `POST /api/v1/lifeos/gate-change/run-preset` or `npm run lifeos:gate-change-run`. Cite `proposal.id`. Else `COUNCIL: NOT RUN` + `OPINION ONLY`. No synthetic “panel in chat.”

## SESSION PROTOCOL

| Phase | Required actions |
|-------|-----------------|
| START | `builder:preflight`; QUICK_LAUNCH; lane log; amendment handoff + last 3–5 receipts |
| BUILD | `POST /builder/build` → committed → receipt. GAP-FILL if blocked. |
| VERIFY | `node --check` all staged .js; `node scripts/verify-project.mjs --project <id>`; receipts match runtime |
| END | §2.11b report if load-bearing; update Change Receipts (atomic); update Handoff Notes; update CONTINUITY_LOG; update QUICK_LAUNCH queue |

## SSOT EDIT RULES

Read full file before any edit (chunked reads count). Atomic: one file → amendment updated → next file. No blind patches from memory. Receipt = what/why/current state/next.

SSOT-class (full read): `SSOT_NORTH_STAR.md`, `SSOT_COMPANION.md`, `NORTH_STAR_*`, `AMENDMENT_*`, `CONTINUITY_*` (policy), `CONTINUITY_INDEX.md`

## PROHIBITED

Lying/misleading. Silent failed checks. "Done" w/o receipts. Product w/o **/build** try (§2.11c). `--no-verify` w/o Adam. SSOT w/o read. Synthetic council. Skip QUICK_LAUNCH. Env gaslighting. §2.14 w/o TSOS. §2.15 drift. §2.11c: IDE product default w/o logged fail.

## ENDPOINTS

`/lifeos/builder/build` `/execute` `/domains` `/ready` — `/lifeos/gate-change/*` — `/railway/env` `/bulk` `/deploy` → `docs/SYSTEM_CAPABILITIES.md`

## CURRENT STATE

Priority queue: `docs/QUICK_LAUNCH.md → ## Current Priority Queue`
Latest session: `docs/CONTINUITY_LOG.md` (newest entry at top)
LifeOS handoff: `docs/projects/AMENDMENT_21_LIFEOS_CORE.md → ## Agent Handoff Notes`
TC handoff: `docs/projects/AMENDMENT_17_TC_SERVICE.md → ## Agent Handoff Notes`
