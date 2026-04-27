# AGENT RULES — COMPACT ENFORCEMENT
> Generated: 2026-04-27T04:35:18.086Z | Regenerate: `npm run gen:rules`
> Read this instead of full NSSOT for routine work. Full NSSOT only for constitutional edits/conflicts/onboarding.

## HIERARCHY
NSSOT `docs/SSOT_NORTH_STAR.md` > Companion `docs/SSOT_COMPANION.md` > `CLAUDE.md` > Amendments > repo state

## SUPREME LAWS
- §2.6: no lies/mislead; use KNOW/THINK/GUESS/DON'T KNOW; no silent failed checks.
- Improve only: system must get better, not regress; QUICK_LAUNCH stays current.
- §2.11a: builder-first. §2.11b: Adam gets score+evidence, why A>B, residue. §2.11c: supervisor = maximize verified system output, not default IDE authorship.
- §2.14: TSOS machine-channel only for non-human compression. §2.15: clear ask → do it or HALT; if shipped ≠ asked, log INTENT DRIFT.

## BUILDER-FIRST
1. `npm run builder:preflight`
2. `POST /api/v1/lifeos/builder/build` with domain/task/spec/target/`[system-build]`
3. `committed:true` = receipt. `committed:false` = use `/execute`. Builder blocked = **GAP-FILL** on platform, same session.

Commit hook blocks `routes/`, `services/`, `public/overlay/`, `db/migrations/` without `[system-build]` or `GAP-FILL:`. No `--no-verify` without Adam.
Exceptions: `startup/`, `middleware/`, composition-only `core/`, SSOT docs.

## COUNCIL / TECHNICAL FORKS
Load-bearing arch/security/data/API decisions → `/api/v1/lifeos/gate-change/*` or `npm run lifeos:gate-change-run`. No fake panel-in-chat.
Consensus protocol: frame → pro/con → blind spots → future-back → vote → act after audits.

## MEMORY + ANTI-CORNER-CUTTING
Design question: **what has earned the right to influence action, at what weight, in this context?**
- Evidence ladder: CLAIM→HYPOTHESIS→TESTED→RECEIPT→VERIFIED→FACT→INVARIANT. INVARIANT ≠ LAW.
- Every fact needs scope: `context_required` + `false_when`. Minority view survives as `residue_risk`.
- Output = claim. Tests/routes/DB state/receipts = proof. Models are unreliable subcontractors, not self-certifying authorities.
- Shortcut, skipped verify, false certainty, or ask-vs-ship drift → `/api/v1/memory/agents/violations` and/or `/api/v1/memory/intent-drift`.
- Runtime authority can mark a model `watch` or `blocked` by task type. Static model routing is preference only.

## SESSION PROTOCOL
- START: `builder:preflight`; QUICK_LAUNCH; correct continuity lane; amendment handoff + last receipts.
- BUILD: try system `/build` first; only GAP-FILL when platform path is provably blocked.
- VERIFY: `node --check` touched JS; project verifier; receipts match runtime.
- END: update Change Receipts, Handoff Notes, continuity log, QUICK_LAUNCH; include §2.11b report if load-bearing.

## SSOT RULES
Read full SSOT-class files before editing; chunked reads count. Atomic: file edit → receipt/handoff → next file. No blind patches from memory.
SSOT-class: `SSOT_NORTH_STAR.md`, `SSOT_COMPANION.md`, `NORTH_STAR_*`, `AMENDMENT_*`, policy `CONTINUITY_*`, `CONTINUITY_INDEX.md`.

## PROHIBITED
Lying; silent failed checks; “done” without receipts; product code without a real `/build` try; `--no-verify` without Adam; SSOT edits without full read; synthetic council; skip QUICK_LAUNCH; env gaslighting; §2.15 drift; defaulting to IDE authorship when system path should be fixed.

## CURRENT STATE
Queue: `docs/QUICK_LAUNCH.md` → Current Priority Queue
General log: `docs/CONTINUITY_LOG.md`
LifeOS handoff: `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
TC handoff: `docs/projects/AMENDMENT_17_TC_SERVICE.md`
Memory handoff: `docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md`
