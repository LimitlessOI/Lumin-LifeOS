<!-- SYNOPSIS: Founder capture — stop analyzing Overlay intake failure; blueprint BuilderOS governance repair; keep broken intake as regression fixture, 2026-08-11. -->

# BuilderOS governance repair — analysis stop and blueprint mandate (2026-08-11)

## Context

Same day as the Taloa Universal Overlay consensus + live intake test
(`2026-08-11-taloa-blueprint-consensus-and-live-intake-test.md`). Cursor
delivered a causal audit; ChatGPT/Chair reviewed it and concurred. Adam
accepted the decision to **stop analyzing the incident** and **blueprint the
BuilderOS governance repair itself** before any coding — explicitly rejecting
a narrow `columns: []` patch as insufficient.

## Decision, in the reviewer's words (load-bearing)

*"don't let Claude/Cursor implement only the narrow `columns: []` patch yet.
The audit proves the defect is broader than SQL. The factory needs a general
rule that unresolved architectural specificity must be routed upward, resolved
by the office with jurisdiction, written back into the authoritative
blueprint, and only then allowed downstream."*

*"we've reached the point where we should stop analyzing this incident and
**blueprint the BuilderOS governance repair itself**. That blueprint should
fully specify the five mechanisms before anyone codes them: generalized
no-invention enforcement; typed gate authority; positive/current execution
authorization; immutable canonical identity/SSOT binding; and durable
governance jobs. Then separately specify the Sentry authority taxonomy and
Conductor–Architect–Efficiency coordination rather than allowing Builder to
invent how those offices interact."*

## Regression fixture mandate

*"I would preserve the current broken Overlay intake as a **regression test
fixture**. Don't 'help' the repaired factory by fixing all of its ambiguities
first. After the governance repair, run essentially the same input again and
require BuilderOS itself to detect the missing schema specifications, stale
terminology, identity mismatch, and missing product-level Sentry
authorization."*

Milestone:

*"If it reaches execution without you or Claude having to catch unauthorized
decisions in nested JSON, **that's the milestone.**"*

## What was written (this pass)

- `docs/products/builderos/BUILDEROS_GOVERNANCE_REPAIR_BLUEPRINT_2026-08-11.md`
- Fixture: `docs/products/builderos/fixtures/intake-regression-2026-08-11/`
  (frozen session `000146ae-7ed9-4e23-9477-5139603e32f7` + `EXPECTED_DEFECTS.json`)
- BuilderOS product-home Change Receipt row

## What was deliberately not done

- No code change to `services/blueprint-intake.js` / executor
- No Overlay §44a column fill “to help” the next intake
- No Overlay execute
- No Sentry registry entry for Overlay yet (that would spoil the fixture exam)

## Next

Implement only after the governance repair blueprint authorizes missions —
starting with generalized no-invention + identity bind, not a SQL-only guard.
Overlay manufacture waits on regression PASS.

## Addendum — Chair/GPT concurrence + triple audit (same day)

Agreed: **no Railway redeploy** (docs/fixture only). Agreed: fixture stays
unfair/immutable. Agreed: harness must prove full
Detect→classify→route→resolve→amend→invalidate→revalidate→authorize→execute
with receipts, and must not manufacture an Nth defect while resolving.
Acceptance criterion locked verbatim: *Overlay reaches execution without
human nested-JSON rescue.*

Independent triple audit landed in blueprint §17. **Manufacturing missions
still blocked** until B1–B8 closures are written into the blueprint and a
design-freeze receipt exists. Blueprint version **1.1.0**.
