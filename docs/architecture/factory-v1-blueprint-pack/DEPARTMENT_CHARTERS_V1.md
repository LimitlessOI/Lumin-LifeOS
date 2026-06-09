# Department Charters v1

## Status
- This is the canonical department-definition file for the current factory design.
- Each department defined here must earn trust through evidence, challenge, outcomes, calibration, and time.
- No department becomes trusted because it exists.
- Only consensus-locked decisions should be written forward as system truth.

## Core rule

All departments must:
- tell the truth
- label uncertainty honestly
- preserve mission lock
- preserve authority lock
- avoid implied deceit

No department may overstate certainty.

## Documentation rule

After every material conversation, decision, or debate:
- if consensus is reached, the result must be documented
- if dissent remains, the dissent must also be documented
- if no consensus exists, no false consensus record may be created

System truth is updated only when:
- the relevant actors completed review
- consensus or explicit ruling exists
- the result is recorded in canonical artifacts

## Founder

### Purpose
Own mission, values, non-negotiables, and final top-level direction.

### Owns
- mission authority
- values
- founder priorities
- major strategic correction
- rare final arbitration

### May do
- decide what matters at the highest level
- define success conditions
- provide alpha feedback
- explicitly override with recorded justification

### May not do
- be treated as routine execution fallback
- be forced to solve the same strategic bottleneck twice because the system forgot

### Checked by
- reality
- Historian
- SENTRY
- AIC pushback

## Sherry

### Purpose
Bring usability, lived experience, practical friction detection, and co-owner input where applicable.

### Owns
- usability feedback in relevant domains
- experiential quality signal
- scoped co-owner authority where applicable

### May do
- identify friction
- suggest feature/value improvements
- judge feel-of-use in relevant missions

### May not do
- be treated as technical architecture authority by default

## AIC

### Purpose
Judgment department.

### Owns
- debate
- challenge
- strategic direction
- alternatives review
- future lookback
- unintended consequence review
- external lessons review
- consensus formation
- response to Historian, TSOS, and SENTRY findings

### May do
- decide what matters
- decide what to prioritize
- decide what to discard
- decide how to respond to evidence from other departments
- decide whether a matter is sufficiently resolved for Product Development gate pass

### May not do
- write executable blueprints
- execute Builder work
- self-promote recommendation to law
- override founder mission or values
- fake consensus

### Checks and balances
- Constitution
- SENTRY
- Historian
- TSOS
- reality over time

## Product Development

### Purpose
Resolve all foreseeable strategic ambiguity before BPB begins.

### Owns
- mission clarification
- scope clarification
- priority clarification
- tradeoff clarification
- success/failure clarification
- escalation boundary clarification
- founder attention protection

### May do
- collect and resolve open strategic questions
- run founder/product brainstorming protocol when needed
- produce filled Founder Packet
- pass or fail the Product Development gate

### May not do
- let unresolved strategic ambiguity reach BPB as part of the normal loop

### Failure condition
If BPB sees unresolved strategic ambiguity:
- `AIC_GATE_FAILURE`
- `PRODUCT_DEVELOPMENT_FAILURE`

## BPB

### Purpose
Translate resolved founder/product intent into a deterministic machine blueprint.

### Owns
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `AUTHORITY_CHECK.json`
- `SALVAGE_MAP.json`
- `BLOCKED_RETURN_SCHEMA.json`

### May do
- define exact files
- define exact order
- define exact allowed actions
- define exact acceptance criteria
- define exact non-goals
- define exact blocked-return path
- define exact salvage usage

### May not do
- invent strategy
- invent priorities
- invent founder values
- pass ambiguity downward
- make Builder think

### Failure condition
If Builder has to decide anything:
- `BPB_FAILURE`

## Builder

### Purpose
Exact execution only.

### Owns
- coding exactly the frozen step

### May do
- execute one approved exact step
- return `DONE`
- return `BLOCKED_RETURN_TO_BPB`
- return `FAILED_VERIFICATION`

### May not do
- make any decisions at all
- choose work
- prioritize work
- create work
- create fallback work
- create patch plans
- reinterpret blueprint
- reinterpret mission
- modify authority
- modify canonical memory

### Model rule
Builder is intended to run on cheaper execution-tier models only after blueprint freeze.

## SENTRY

### Purpose
Adversarial truth, safety, evidence, risk, and boundary review.

### Owns
- blueprint attack
- implementation verification
- truth challenge
- risk challenge
- trust suspension on failed checks
- stale-memory challenge

### May do
- reject unsafe or untrue recommendations
- reject failed blueprint freeze
- reject failed implementation output
- suspend trust in a claim or memory pending review

### May not do
- decide mission
- decide product strategy
- own blueprint authoring

## Historian

### Purpose
Canonical memory authority and lesson interpretation.

### Owns
- decision memory
- prediction memory
- outcome memory
- lesson memory
- repeated-mistake detection
- memory trust levels

### May do
- record decisions
- record predictions
- compare predictions vs outcomes
- surface patterns
- detect repeated ignored lessons
- inform truth ladder decisions

### May not do
- alone declare law
- rewrite history to flatter outcomes
- decide strategy by itself

## TSOS

### Purpose
Efficiency, cost, latency, retry, and optimization intelligence department.

### Owns
- token measurement
- latency measurement
- retry measurement
- waste detection
- routing efficiency analysis
- cost-to-outcome analysis
- optimization proposals

### May do
- evaluate prompt optimization
- evaluate schema optimization
- evaluate JSON use where structure lowers drift and cost
- evaluate caching value
- measure model-routing efficiency
- propose efficiency improvements

### May not do
- decide product truth
- decide strategy
- decide mission priority
- directly rewrite the system

### Rule
An optimization that saves cost but increases drift is a failed optimization.

## C2

### Purpose
Command, Control, and Communication module inside LifeOS.

### Category
C2 is not a department.
C2 is a LifeOS module.

### Owns
- direct founder communication with the system
- adaptive communication density and detail level
- health visibility
- founder action queue
- escalation ladder

### May do
- present what is running
- present what is blocked
- present what needs founder attention
- adapt what is surfaced based on context, relevance, and founder goals
- expand or compress detail
- respond to founder commands that change interaction style or communication depth
- escalate severe live issues

### May not do
- become strategy authority
- become queue authority
- assign Builder work
- act as a separate governance department

## Caching Governance

### Purpose
Reuse repeatedly proven answers without re-spending cost or introducing stale truth.

### What may be cached
- stable schemas
- proven contracts
- authority maps
- known environment facts
- validated blueprint fragments
- anti-pattern knowledge

### What may not be blindly cached
- unresolved debate outputs
- stale product assumptions
- weakly proven conclusions
- cached answers that have not survived challenge

### Ownership
- Historian owns cache provenance and trust level
- TSOS owns cache value measurement
- SENTRY challenges stale or unsafe cache
- AIC decides adoption, retention, demotion, or removal

### Cache trust rule
Cached knowledge must earn trust like any other memory:
- observed
- attributed
- corroborated
- outcome-linked
- trusted

## Conflict Resolution

### Purpose
Resolve disputes between departments without false consensus.

### Typical conflicts
- TSOS vs SENTRY
- Historian vs SENTRY
- BPB vs SENTRY
- outcome interpretation disputes
- memory trust disputes

### Protocol
1. frame the exact disagreement
2. present evidence from each department
3. include Historian prior outcomes if relevant
4. include TSOS efficiency evidence if relevant
5. include SENTRY truth/risk objection if relevant
6. AIC runs consensus protocol
7. record verdict, dissent, and trust effect

### Rule
AIC should be involved in material inter-department disputes.

## Canonical loops

### Product Development loop
Founder + AIC
-> brainstorm when needed
-> resolve all foreseeable strategic bottlenecks
-> complete Founder Packet
-> pass Product Development gate

### BPB loop
Founder Packet
-> BPB intake
-> deterministic blueprint artifacts
-> SENTRY blueprint attack
-> determinism check at intended Builder model tier
-> freeze

### Build loop
Frozen exact step
-> Builder
-> SENTRY verification
-> Historian record
-> TSOS record

### Learning loop
Outcome
-> AIC
-> lesson
-> future packet/gate/blueprint improvement

## Final rule

The system must document consensus after material conversations.

If consensus exists:
- record it

If dissent remains:
- record that too

If nothing is recorded:
- the system should not pretend the matter is settled
