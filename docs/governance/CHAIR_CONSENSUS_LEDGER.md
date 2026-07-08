<!-- SYNOPSIS: Chair Consensus Ledger -->

# Chair Consensus Ledger

**Status:** HARD REQUIREMENT (founder directive, 2026-07-03). Conferring with the Chair and reaching consensus before strategic decisions or founder communication is a **mandatory gate**, not an optional practice.

**Why this ledger exists:** the founder asked us to *measure* whether conferring with the Chair actually gets us to the **right decision faster** — to prove (or disprove) that two brains beat one, rather than assume it. Every consult is logged here with a time-to-decision and a faster-than-solo judgment so the value is auditable over time.

## How to use it (every strategic decision)

1. Before deciding/acting on anything important, take the concrete diagnosis + proposed action to the Chair (direct chair channel / `founder-interface/message` with `action: counsel`).
2. Record a row below **before** you ship: what was decided, Chair's verdict, whether consensus was reached, and — the metric — did conferring get to the right call **faster** than solo, and *why*.
3. Update the scorecard.

## Metric definitions

- **Consensus:** YES = Chair and conductor aligned before action. NO = unresolved (escalate, do not ship).
- **Faster to right decision:** YES = the consult shortened time-to-correct-decision (confirmed a diagnosis so no re-derivation, caught a gap/risk in one pass, or prevented a wrong turn / rework). NO = the consult added latency without changing or improving the outcome. Record the reason either way — NO rows are the honest signal that keeps this requirement true instead of theater.

## Scorecard (running)

| Metric | Count |
|---|---|
| Total consults | 4 |
| Consensus reached | 4 |
| Faster to right decision (YES) | 4 |
| Faster to right decision (NO) | 0 |
| Rework prevented (caught a gap/risk before ship) | 4 |

## Ledger

| # | Date | Decision | Chair verdict | Consensus | Time to decision | Faster than solo? | Why |
|---|------|----------|---------------|-----------|------------------|-------------------|-----|
| 1 | 2026-07-03 | Loop-selection fix (skip defer-only top task) + dry-run probe plan + keep foundation on BP scheduler (PR #298) | YES on all three; asked for a visible skip-log line | YES | ~1 exchange | **YES** | Confirmed the starvation diagnosis so no time lost second-guessing, and flagged the missing `skipped_defer_only_top` log which was added before ship (a gap I'd have caught only in a later review pass). |
| 2 | 2026-07-03 | Durable-commit-on-plan for `runPlanBuildQueue` — commit the planned queue (with `sentry_signature`) to the repo so it survives redeploys (PR #299) | YES; implement all three in one pass (durable-commit + signature-in-committed-queue + fail-open) | YES | ~1 exchange | **YES** | Confirmed the fix + judged the churn risk low with reasoning, and added the "stamp `sentry_signature` into the *committed* queue (not just local)" requirement I had not scoped — closing the re-plan-waste loop in the same pass instead of a follow-up PR. |
| 3 | 2026-07-03 | Zero-commit cycles with no runtime visibility: build a read-only loop-observability endpoint vs. keep waiting/guessing (PR #301) | YES — observability-first; weights missing `GITHUB_TOKEN` (silent `commitQueueStatusToRepo` failure) highest; add env-presence booleans + last-N decisions | YES | ~1 exchange | **YES** | Confirmed observability-first over more blind waiting (which the founder explicitly warned against), ranked the 3 hypotheses so the endpoint targets the likely cause, and pushed to also surface per-cycle `selected_task/reason/result_detail` — a sharper spec than I'd have built solo. |
| 4 | 2026-07-03 | Real root cause (found via the observability endpoint): SENTRY feed excluded from Docker image → `discoverSentryFixWork` silent `[]`. Fix `.dockerignore` glob + harden logging (PR #302) | YES on all three — bake-not-regenerate (runtime write is a failure surface), log-hardening non-negotiable, glob-audit receipt reads | YES | ~1 exchange | **YES** | Endorsed baking over runtime regeneration with a reason I hadn't fully weighed (cold-start planning must not depend on a runtime write), and confirmed the log-hardening + glob-audit belonged in the SAME pass — preventing a repeat silent-`[]` regression instead of a follow-up. |

## Notes

- NO / negative rows are expected and welcome — the point is an honest measurement, not a highlight reel. If a consult slows us down or the Chair is wrong, log it plainly so the requirement earns its keep.
