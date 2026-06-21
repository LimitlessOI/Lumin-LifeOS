<!-- SYNOPSIS: Old Stack Builder Structure Audit v1 -->

# Old Stack Builder Structure Audit v1

## Scope

This audit reviews the old system structure before the new governance rebuild, with emphasis on:

- `server.js`
- `startup/register-runtime-routes.js`
- old builder/runtime orchestration paths
- pre-governance or mixed-governance builder machinery

Goal:

Identify the car parts worth carrying forward into the new system, the structural faults that caused drift, and what should be renamed or separated more cleanly.

## Executive judgment

The old system is not junk.

It has a real spine.
It has real tools.
It has real runtime infrastructure.
It has already solved several hard problems.

But it also mixes:

- composition
- product lanes
- governance layers
- old builder assumptions
- new trust-system ideas

inside one giant running organism.

So the right move is not “throw it away.”
The right move is:

- preserve the spine
- extract the good organs
- stop carrying forward the drift engines
- rebuild the authority model around the proven parts

## Findings

### 1. `server.js` is structurally valuable as a composition root, but still too overloaded

What is right:

- it explicitly states “composition root, do not add feature code here”
- it centralizes boot, middleware, module registration, route wiring, pool/app/server creation
- that is exactly the correct architectural instinct

What is wrong:

- it still imports too much system surface directly
- it reveals a system carrying many architectural eras at once
- it functions as a map of capability, but also as evidence of insufficient boundary collapse

Evidence:
- [server.js](/Users/adamhopkins/Projects/Lumin-LifeOS/server.js:1)

Judgment:

Keep the composition-root discipline.
Do not keep the breadth.

### 2. `startup/register-runtime-routes.js` is one of the strongest “parts car” assets

What is right:

- it is the real runtime map
- it separates route registration from `server.js`
- it is one of the clearest honest inventories of what the system actually exposes

What is wrong:

- it mounts too many lanes into one runtime namespace
- it still reflects a system where Builder, product, memory, TSOS, command center, and experiments are all cohabiting
- it proves capability, but also proves incomplete consolidation

Evidence:
- [startup/register-runtime-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/startup/register-runtime-routes.js:1)

Judgment:

Carry forward the pattern:

- one explicit runtime route registrar
- one honest mounted-surface map

Do not carry forward the sheer breadth as one undifferentiated operating surface.

### 3. The old builder HTTP surface is a real asset

`routes/lifeos-council-builder-routes.js` is one of the most valuable survivable pieces in the repo.

What is right:

- real `/builder/build` surface
- real file injection
- real model routing
- real validation gates
- real output splitting / parsing hardening
- real commit path
- real preflight / readiness logic around it

What is wrong:

- it still carries old BuilderOS assumptions
- it is broader than the new Builder should be
- it mixes execution surface, policy, routing, validation, and historical compatibility into one giant route file

Evidence:
- [routes/lifeos-council-builder-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/lifeos-council-builder-routes.js:1)

Judgment:

This is a prime “adapt and import” part.
Not canonical as-is.
But absolutely worth mining.

### 4. The old governed-loop executor is valuable for lessons, but dangerous as a carried-forward execution model

`services/builderos-governed-loop-executor.js` has real useful ideas:

- boundary audit
- plan generation
- builder dispatch
- verification
- optional retry
- TSOS hook emit
- proof parity scheduling

What is right:

- it shows the old system was already trying to govern build execution instead of just spraying code
- it is much closer to the system you want than naive autonomous runners

What is wrong:

- it still sits inside an older control model
- it is still downstream of planning/execution assumptions you are replacing
- it is too coupled to the old C2/job/executor shape

Evidence:
- [services/builderos-governed-loop-executor.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-governed-loop-executor.js:1)

Judgment:

Mine it for:

- stage ordering
- verification discipline
- dispatch receipts
- failure handling

Do not carry it forward unchanged.

### 5. The overnight backlog runner is one of the clearest drift engines in the repo

`scripts/governed-overnight-backlog-run.mjs` is useful mainly as a record of what to never do again.

What is right:

- it contains real founder-value language
- it contains real local verification / infra-degraded fallback attempts
- it contains evidence that the system was trying to become robust

What is wrong:

- it is still a giant autonomous work invention machine
- it still manufactures work around blockers
- it still risks churn, support-task proliferation, and queue recursion
- it proves why your new authority model is necessary

Evidence:
- [scripts/governed-overnight-backlog-run.mjs](/Users/adamhopkins/Projects/Lumin-LifeOS/scripts/governed-overnight-backlog-run.mjs:1)

Judgment:

Do not carry forward the runner as a runtime control model.
Carry forward only:

- failure lessons
- useful local-fallback ideas
- health classification ideas

### 6. The old auto-builder is not the right foundation for the new Builder

`routes/auto-builder-routes.js` belongs to an older paradigm:

- opportunities
- prioritize
- build-now
- automatic revenue/drone style build behavior

What is right:

- it shows prior intent to automate build generation and prioritization

What is wrong:

- it mixes opportunity logic with build authority
- it is not compatible with your new “Builder makes no decisions” law

Evidence:
- [routes/auto-builder-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/auto-builder-routes.js:1)

Judgment:

Archive as historical pattern.
Do not use it as the new Builder foundation.

## Best car parts to include

### Composition and runtime structure

- `server.js` composition-root discipline
- `startup/register-runtime-routes.js` as honest runtime capability map

### Core builder path

- `routes/lifeos-council-builder-routes.js`
- `scripts/council-builder-preflight.mjs`
- `scripts/verify-builder-output.mjs`
- `scripts/builderos-groq-antipattern-scan.mjs`
- `services/builderos-patch-mode-policy.js`
- `services/builderos-precommit-governance.js`
- `services/builderos-routing-policy.js`
- `services/builderos-model-escalation-gate.js`
- `services/useful-work-guard.js`

### Core infrastructure

- `startup/database.js`
- `services/deployment-service.js`
- `services/railway-managed-env-service.js`
- `routes/railway-managed-env-routes.js`
- `services/logger.js`
- `services/council-service.js`
- `services/memory-intelligence-service.js`

### C2-adjacent useful parts

- `services/builderos-command-control-service.js`
- `routes/lifeos-builderos-command-control-routes.js`

These are not the final C2 design, but they are useful internal building parts.

## What is not quite right with the old system

### 1. Too many architectures at once

The repo contains:

- old autonomous builder assumptions
- new governed builder assumptions
- product runtime
- memory experiments
- command-center variants
- TSOS surfaces
- council surfaces

That means the system is rich, but also internally multi-generational.

### 2. Builder authority was never cut down hard enough

Even when the old system tried to govern itself, the runtime still left too much room for:

- work invention
- retry churn
- support-task creation
- queue recursion

That is the exact drift you are correcting now.

### 3. Route sprawl hides the actual spine

The runtime route registrar is valuable, but it also shows how much unrelated product and system logic shares one operating envelope.

That makes:

- audit harder
- proof harder
- authority separation harder

### 4. A lot of the system is real, but not canonically classified

There are many real tools, but they were not consistently classified as:

- canonical
- legacy
- partial
- archive
- forbidden

That is why structural proof freshness and legacy quarantine matter so much.

### 5. The old system optimized for continuation before fully solving authority

You can see the repeated instinct:

- keep going
- auto-heal
- auto-route
- auto-run overnight

That is powerful, but it outpaced the clarity of:

- who is allowed to decide what
- what counts as proof
- when the system must stop instead of adapt around ambiguity

## Naming judgment

Your naming instinct is right to separate:

- the full system
- the builder inside it

My recommendation:

### Full stack / whole governed machine
`Lumin`

This should remain the name of the overall governed mission/trust system.

### Build/execution subsystem
`BuilderOS`

This is still a good name for the actual internal programming/build machine, as long as:

- it is explicitly subordinate to the larger Lumin trust system
- it is not mistaken for the whole architecture

### Practical framing

The clean sentence is:

**Lumin is the full governed trust system.  
BuilderOS is the coding/build subsystem inside Lumin.**

That is better than making BuilderOS the whole thing.

If you wanted an even cleaner split later, you could eventually call the coding executor simply:

- `Coder`
- or `Builder`

inside BuilderOS.

But right now:

- `Lumin` for full system
- `BuilderOS` for build machine

is coherent.

## Final judgment

The old system already solved a lot:

- real builder surface
- real preflight
- real verification
- real deployment
- real env management
- real runtime route composition
- real command/control jobs
- real memory and telemetry surfaces

What it did not solve cleanly was:

- authority containment
- upstream strategic closure
- structural consolidation
- separation between the trust system and the build machine

So the right move is exactly what you are doing:

- mine the old system aggressively for real parts
- reject the autonomous churn engines
- rebuild around the new governance
- preserve the proven spine

This repo is not “failed.”
It is overgrown, multi-generational, and badly needs the exact classification-and-rebuild pass you are doing now.

---

## Addendum — factory-staging vs old stack (2026-05-24)

**Manifest:** [FACTORY_REBUILD_MANIFEST_V1.md](./FACTORY_REBUILD_MANIFEST_V1.md) · **Goldmine:** [GOLDMINE_PASS_V2.md](./GOLDMINE_PASS_V2.md) addendum

| Old stack concern (this audit) | Factory-staging answer |
|--------------------------------|------------------------|
| Builder route sprawl | Single hot path: `factory-staging/factory-core/builder/run-step.js` |
| Council in every cron | Factory scheduled tasks not yet wired; useful-work-guard stays in main repo |
| SSOT drift vs code | Mission sha256 pins + `npm run factory:ci` |
| Overlay / command-center churn | C2 read-only surfaces: `GET /factory/c2/status`, `/c2/brief` |
| Precommit vs runtime gates | SENTRY stack on execute-step success path (0030) |
| Production builder | Still `routes/lifeos-council-builder-routes.js` — **not merged** |

**Rebuild rule:** Use this audit to mine the main repo; use `FACTORY_REBUILD_MANIFEST_V1.md` to know what already landed in `factory-staging/`.

