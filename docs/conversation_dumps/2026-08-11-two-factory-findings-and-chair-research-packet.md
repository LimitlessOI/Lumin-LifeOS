<!-- SYNOPSIS: Conversation capture — Chair research packet + two-factory run findings, 2026-08-11. -->

# Two factories, and what the Chair sent back — 2026-08-11

Captured per SO-004. Participants: Adam (founder), Chair/GPT (assessment + research packet), Cursor (build).

## What Adam asked for

> "i need this asap so yes duplicate the factory audit it first make sure its healthy first fix whats not then duplicate and have conductor and architect were together to create a plan to split up the project by two people and then how to put it all together. And let's see if we can speed this up."

Explicit ordering: **audit before duplicate.** Cloning an unhealthy lane produces two unhealthy lanes.

## What the run found

1. **Capacity truth.** factory-1 healthy. factory-2 existed, held its own branch and its own git index, and had no dependencies installed — it could write files but could not run a single test. It would have accepted work while being unable to verify anything it produced. Fixed by symlinking the primary lane's `node_modules`.

2. **Execution truth.** Two lanes buy **1.38x**, not 2x, on the Overlay: 16 slices, 5 waves, widest wave 7, floored at 5 by the dependency chain.

3. **Blueprint truth.** The Overlay blueprint contains a real dependency cycle — `012 → 014 → 013 → 012`, with `015` knotted in and `016` depending on everything — inside a blueprint ARC had marked `ready_to_execute: true`. Five of sixteen steps are topologically impossible. Verified against the frozen fixture rather than trusting our own scheduler, since "zero waves" is equally consistent with a scheduler bug.

Two bugs in the analysis itself were found and fixed: the fixture encodes store identity in migration *filenames* rather than `CREATE TABLE` text, and slices carry `steps` rather than `step_ids`. Both produced a comfortable, wrong "0 blocked". The plan document was also rendering wave-by-wave, silently dropping the five knotted steps.

## The Chair's assessment

> "This was a very successful failure to start manufacturing. The factories did exactly what they're supposed to do: they proved that adding execution capacity would not solve the actual problem."

> "The 1.38× number is more valuable than a theoretical 2×."

On the audit pattern: a factory should not count as healthy because its directory or branch exists. It must prove, every time it comes online, that it can mutate its own workspace, run its own verification stack, and *fail* to mutate another lane.

On the cycle: architectural, not implementation. It routes to Architect/Presiding Steward, because breaking it requires deciding which dependency is conceptually wrong, which step needs decomposition, or whether an iterative loop was intended. Builders may propose candidate repairs; the resulting structure must be resealed.

On the analytics bugs: "planning analytics cannot trust their own normalized representation until they prove source coverage." Hence the invariant — if 16 source steps enter planning, exactly 16 must be accounted for in the report.

On the seven schema decisions, he agreed with the stop: "Seven missing store contracts should stop sixteen slices rather than be silently inferred seven different ways by two factories." Once answered, they must be frozen into a hashed **Schema Decision Artifact** consumed identically by both lanes, "otherwise we'll confuse specification divergence with builder divergence."

## The most important thing in the research packet

2026 multi-agent research on **diversity collapse**: adding cooperating agents can *reduce* intellectual diversity, because strong agents talking densely converge prematurely and authority-heavy structures suppress dissent.

Two laws follow:

- **Independence before consensus** — freeze evidence → independent analysis → seal → reveal → disagreement analysis → consensus. Not "everyone enters a room and starts talking." Applies to major decisions throughout the system, not only factory testing.
- **Correlated-failure detection** — "Two independent factories using the same flawed library aren't two proofs. They're one failure duplicated."

The second law immediately indicted the evening's own fix: factory-2's `node_modules` is a symlink to factory-1's, so the two lanes share a dependency tree and their agreement about any dependency-originated defect means nothing. Effective independence for the pair as configured: **1.0 perspectives**. This was recorded rather than hidden, and convergence between them no longer raises confidence.

## Decisions made

- Audit before duplication is now factory law, machine-checked, and health is a precondition for receiving work (fail-closed: no proof means not healthy).
- Parallelism is always reported as makespan with a critical-path floor, so lane count can never be presented as speed.
- Cycles are architectural; the defect is routed to the Architect and no builder may resolve one by finding an order that happens to run.
- The seven schema answers will be frozen with provenance and a hash before either lane builds against them.
- Threshold correction made while implementing: corroboration requires retaining 0.75 of theoretical independence, not N-of-N. Demanding perfect orthogonality from two lanes that share a runtime would have made the gate unreachable and therefore ignored.

## Still open, needing Adam

- The **seven store contracts** (`TaskStore`, `AuthorityLedger`, `ReceiptLedger`, `CapsuleStore`, `TemplateStore`, `DeviceRegistry`, `PreferenceStore`) in `docs/products/builderos/FOUNDER_DECISION_SET_OVERLAY.md`. Until answered, 11 slices are blocked by founder decision.
- Who breaks the **dependency cycle** — 5 slices blocked by architecture.
- Zero slices are blocked by manufacturing, environment, tooling or builder execution.
