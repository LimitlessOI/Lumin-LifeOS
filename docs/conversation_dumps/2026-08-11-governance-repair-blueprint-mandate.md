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

## Addendum 2 — B1–B8 closed, second audit, design freeze ready (same day, v1.2.0)

Mandate for this pass, verbatim on the load-bearing constraint:

*"Do not solve 'Builder may not invent' by allowing Architect to invent
anything Builder asks for."* … *"Where enforcement can be deterministic, make
it deterministic."* … *"Optimize for finding what we got wrong. Reality is the
scorecard."*

**What the repo inspection actually overturned** (the blueprint was wrong six
times — recorded as R1–R6 in §18.0.1):

1. Every new session status proposed in §5.2 violates the live `CHECK`
   constraint in `db/migrations/20260625_blueprint_intake.sql`.
2. `existing_tables` is produced by regexing `db/migrations/*.sql`, **not**
   `information_schema`, so the adversarial counter A3 was unimplementable as
   written.
3. `services/blueprint-intake.js:78-80` truncates the generator's grounding
   context to 15 tables against a repo with 200+. **A generator that cannot
   see a table will invent it** — a root cause the first audit missed entirely
   while focusing on the prompt's wording.
4. `services/intake-blueprint-executor.js:486-497` skips the session/ARC gate
   whenever a blueprint is passed inline — and the existing regression harness
   does exactly that. The gate was never where we thought it was.
5. `DO_NOT_INVENT.json` already exists in 12+ mission folders, written by
   `pre-arc-enrichment.js`, and is handed to a model as a string in a context
   summary. A no-invention rule already "existed" and enforced nothing — the
   precise failure mode this repair must not repeat.
6. "sha256 over canonical JSON" was undefined, which would have made every
   freshness check unreliable.

**Anti-laundering resolution:** Architect resolutions are **citation-only** —
seven closed verbs, each requiring an evidence path + sha256 + an
identifier-containment check. Any literal the Architect introduces that is not
present in the cited bytes is automatically Class B and routes to the office
with real authority. Naming is founder-only jurisdiction.

**`internal_factory_only` abolished** as a governance modifier and replaced by
a computed `consequence_class`. Consequence: the governance repair missions
themselves classify as `C4_AUTHORITY_OR_SAFETY` — the factory fixing its own
governance gets the strictest lane, not an internal fast lane.

**Reuse over invention:** 11 existing mechanisms bound instead of new parallel
ones, including the already-required-and-wired
`BUILDEROS_INTAKE_REGRESSION_HARNESS.json` — the frozen fixture is docs-only
today, so **nothing in CI currently runs the exam**. Registration adds metadata
only; session bytes stay untouched.

Second triple audit (§19) added A11–A23, notably receipt forgery (Builder can
write `products/receipts/` today under `SAFE_WRITE_PATHS`) and gate bypass by
inlining artifacts. Verdict: **DESIGN FREEZE READY**, blocked only on founder
answers §20 OPEN-1…OPEN-5 plus a design-freeze receipt naming v1.2.0. Still no
code, no missions, no redeploy.
