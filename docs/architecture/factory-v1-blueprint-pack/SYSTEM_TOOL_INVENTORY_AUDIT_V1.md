# System Tool Inventory Audit v1

## Purpose

This inventory answers:

- what tools the system needs in order to operate end-to-end
- which of those tools already exist in the repo
- which are only partially present or tied to the old builder
- which are still missing from the system we are defining now

This is a factory / builder-system inventory, not a product feature inventory.

## Classification

- `PRESENT` = real tool exists and is callable in the current repo
- `PARTIAL` = useful code/path exists, but it is incomplete, old-system-coupled, or not yet canonical for the new factory
- `MISSING` = named by the architecture but not actually built as a trustworthy system tool yet

## Executive judgment

The repo already has more tooling than the current founder packet admits.

The main gap is not “we have no tools.”
The main gap is:

- tools are unevenly governed
- some live inside old BuilderOS assumptions
- some are runtime-real but not yet absorbed into the new factory blueprint
- some architectural tools are still only discussed, not built

## Tool inventory

### 1. Model deliberation / AIC / consensus tools

#### 1.1 Multi-model council engine
- Status: `PRESENT`
- Evidence:
  - [services/council-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/council-service.js:1)
  - [routes/lifeos-gate-change-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/lifeos-gate-change-routes.js:1)
  - [routes/enhanced-council-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/enhanced-council-routes.js:95)
- Notes:
  - real model-calling and consensus surfaces exist
  - multiple consensus paths still exist, which is useful but also a cleanup target

#### 1.2 Founder decision prediction / intent simulation
- Status: `PARTIAL`
- Evidence:
  - `guessUserDecision` dependency is already part of [services/consensus-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/consensus-service.js:16)
  - `lifeos-simulator-routes.js` exists on disk
- Gap:
  - not yet formalized as the canonical Founder Intent Model in the new factory
  - not yet enforced as a required pre-escalation step

#### 1.3 Consensus memory / debate persistence
- Status: `PRESENT`
- Evidence:
  - [services/memory-intelligence-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/memory-intelligence-service.js:1)
  - route references in [routes/memory-intelligence-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/memory-intelligence-routes.js:215)
- Notes:
  - this is a real advantage already in the repo
  - it still needs to be absorbed into the new Historian contract cleanly

### 2. Product Development and Founder Packet tools

#### 2.1 Product Development gate evaluator
- Status: `MISSING`
- Evidence:
  - current work is document-level only
  - no runtime gate service/schema/route for the new factory yet
- Gap:
  - this is one of the most important missing tools
  - the system still lacks a machine gate that says “BPB may begin now”

#### 2.2 Founder Packet completeness checker
- Status: `PARTIAL`
- Evidence:
  - checklist docs exist in the blueprint pack
- Gap:
  - not yet implemented as a machine validator over structured founder packet data

#### 2.3 Founder decision log / tradeoff / risk register system
- Status: `MISSING`
- Gap:
  - discussed and templated
  - not built as actual structured runtime artifacts and validators yet

### 3. BPB / blueprinting tools

#### 3.1 Blueprint generator / planner
- Status: `PARTIAL`
- Evidence:
  - [services/builderos-pbb-plan.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-pbb-plan.js:1)
  - proof blueprint pack under `docs/architecture/factory-v1-blueprint-pack/FACTORY-0001-v1/`
- Notes:
  - there is real planner logic
  - but it is still tied to older governed-loop assumptions and not the full new BPB contract

#### 3.2 Machine blueprint schema
- Status: `PARTIAL`
- Evidence:
  - `FACTORY-0001-v1` defines a proof-slice blueprint shape
- Gap:
  - full factory-wide `BLUEPRINT_SCHEMA.json` for all phases is not yet built

#### 3.3 Determinism checker at Builder model tier
- Status: `MISSING`
- Gap:
  - this is named in doctrine
  - not yet implemented as a real test harness

#### 3.4 Salvage mapper
- Status: `PARTIAL`
- Evidence:
  - [SALVAGE_CANDIDATES.json](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/architecture/factory-v1-blueprint-pack/SALVAGE_CANDIDATES.json:1)
  - proof `SALVAGE_MAP.json` contract exists
- Gap:
  - current salvage is audit-level, not yet mission-by-mission BPB runtime tooling

### 4. Builder execution tools

#### 4.1 Builder HTTP build surface
- Status: `PRESENT`
- Evidence:
  - [routes/lifeos-council-builder-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/lifeos-council-builder-routes.js:1)
- Notes:
  - this is a real and valuable tool
  - it contains working validation, model routing, file injection, and commit path logic
  - it still carries old BuilderOS assumptions and must be adapted, not copied blind

#### 4.2 Builder exact execute-only proof runtime
- Status: `PARTIAL`
- Evidence:
  - [FACTORY-0001-v1/BLUEPRINT.json](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/architecture/factory-v1-blueprint-pack/FACTORY-0001-v1/BLUEPRINT.json:6)
- Gap:
  - only defined as a proof-slice artifact pack
  - not built as the real factory runtime yet

#### 4.3 Blocked-return contract
- Status: `PARTIAL`
- Evidence:
  - proof contract exists in `FACTORY-0001-v1`
- Gap:
  - full canonical blocked-return taxonomy for the complete factory still needs implementation

#### 4.4 Builder preflight
- Status: `PRESENT`
- Evidence:
  - [scripts/council-builder-preflight.mjs](/Users/adamhopkins/Projects/Lumin-LifeOS/scripts/council-builder-preflight.mjs:1)
- Notes:
  - this is one of the strongest carry-forward tools

#### 4.5 Builder output verifier
- Status: `PRESENT`
- Evidence:
  - [scripts/verify-builder-output.mjs](/Users/adamhopkins/Projects/Lumin-LifeOS/scripts/verify-builder-output.mjs:1)
  - [services/builderos-precommit-governance.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-precommit-governance.js:17)

#### 4.6 Precommit governance gate
- Status: `PRESENT`
- Evidence:
  - [services/builderos-precommit-governance.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-precommit-governance.js:47)

#### 4.7 Patch-mode / zone classifier
- Status: `PRESENT`
- Evidence:
  - [services/builderos-patch-mode-policy.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-patch-mode-policy.js:1)

#### 4.8 Model routing policy
- Status: `PRESENT`
- Evidence:
  - [services/builderos-routing-policy.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-routing-policy.js:1)

#### 4.9 Model escalation gate
- Status: `PRESENT`
- Evidence:
  - [services/builderos-model-escalation-gate.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-model-escalation-gate.js:1)

### 5. SENTRY / verification / long-horizon challenge tools

#### 5.1 Anti-pattern scan
- Status: `PRESENT`
- Evidence:
  - [scripts/builderos-groq-antipattern-scan.mjs](/Users/adamhopkins/Projects/Lumin-LifeOS/scripts/builderos-groq-antipattern-scan.mjs:1)

#### 5.2 Proof freshness checker
- Status: `PRESENT`
- Evidence:
  - proof-related services and routes are referenced across BuilderOS docs
  - `oil-proof-freshness` scripts and services exist in repo

#### 5.3 Blueprint freeze review tool for the new factory
- Status: `MISSING`
- Gap:
  - new factory doctrine requires a SENTRY freeze gate
  - not yet built as a dedicated factory tool

#### 5.4 Future-lookback tool across 6 months / 1 year / 2 years
- Status: `MISSING`
- Gap:
  - discussed and ratified in doctrine
  - not built as an executable SENTRY tool yet

#### 5.5 Unintended-consequence review tool
- Status: `PARTIAL`
- Evidence:
  - consequence analysis exists inside consensus flows
- Gap:
  - not isolated as a canonical SENTRY tool in the new factory

### 6. Historian / memory tools

#### 6.1 Memory intelligence service
- Status: `PRESENT`
- Evidence:
  - [services/memory-intelligence-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/memory-intelligence-service.js:1)

#### 6.2 Memory status proof surface
- Status: `PRESENT`
- Evidence:
  - [routes/memory-status-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/memory-status-routes.js:1)

#### 6.3 Prediction vs outcome tracker for the new Historian
- Status: `PARTIAL`
- Evidence:
  - pieces of memory and decision logging exist
- Gap:
  - not yet refactored into the exact Historian contract we defined

#### 6.4 Consensus-position correctness tracker by domain
- Status: `PARTIAL`
- Evidence:
  - memory service supports evidence/performance/routing concepts
- Gap:
  - not yet exposed as the canonical Historian tool we discussed

### 7. TSOS / efficiency / optimization tools

#### 7.1 Telemetry events and efficiency surfaces
- Status: `PRESENT`
- Evidence:
  - [routes/autonomous-telemetry-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/autonomous-telemetry-routes.js:1)

#### 7.2 TSOS internal hook boundary contract
- Status: `PRESENT`
- Evidence:
  - [docs/projects/builderos-remediation/TSOS_HOOK_BOUNDARY.md](/Users/adamhopkins/Projects/Lumin-LifeOS/docs/projects/builderos-remediation/TSOS_HOOK_BOUNDARY.md:1)
- Notes:
  - this is a strong doctrine artifact
  - but it still needs new-factory implementation wiring

#### 7.3 Prompt optimization evaluator
- Status: `MISSING`
- Gap:
  - discussed as a TSOS responsibility
  - no dedicated tool/service found for the new system

#### 7.4 JSON structure optimization evaluator
- Status: `MISSING`
- Gap:
  - no dedicated tool found

#### 7.5 Cache value evaluator / cache policy engine
- Status: `MISSING`
- Gap:
  - discussed in doctrine
  - not found as a dedicated governed tool

### 8. C2 / command-control / communication tools

#### 8.1 Command-control job service
- Status: `PRESENT`
- Evidence:
  - [services/builderos-command-control-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/builderos-command-control-service.js:1)
  - [routes/lifeos-builderos-command-control-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/lifeos-builderos-command-control-routes.js:1)

#### 8.2 C2 mission dashboard / communication surfaces
- Status: `PARTIAL`
- Evidence:
  - command-center routes and overlay artifacts exist
  - continuity log shows real work already happened here
- Gap:
  - still mixed with old BuilderOS command-center assumptions
  - not yet rebuilt explicitly as the LifeOS-native C2 module we locked in

#### 8.3 Critical escalation ladder
- Status: `PARTIAL`
- Evidence:
  - halt and job control exist
- Gap:
  - the exact “money is being lost and system could not stop it” escalation chain is not yet clearly implemented as the new doctrine requires

### 9. Deployment / environment / external truth tools

#### 9.1 GitHub commit / deployment bridge
- Status: `PRESENT`
- Evidence:
  - [services/deployment-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/deployment-service.js:1)

#### 9.2 Railway env write / sync / verify
- Status: `PRESENT`
- Evidence:
  - [services/railway-managed-env-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/railway-managed-env-service.js:1)
  - [routes/railway-managed-env-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/railway-managed-env-routes.js:1)
- Notes:
  - this directly answers the example you raised: yes, the system already has a real tool to write and sync managed Railway env vars

#### 9.3 DB boot / migration auto-runner
- Status: `PRESENT`
- Evidence:
  - `startup/database.js`

#### 9.4 Remote truth reconciler
- Status: `PARTIAL`
- Evidence:
  - remote-truth doctrine exists in rules and docs
- Gap:
  - not yet a single canonical factory service that reconciles GitHub, Railway, and Neon truth into one proof surface

### 10. Web reading / web interaction / browser tools

#### 10.1 Generic browser session automation
- Status: `PRESENT`
- Evidence:
  - [services/browser-agent.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/browser-agent.js:1)

#### 10.2 Transaction / external-site browser automation
- Status: `PRESENT`
- Evidence:
  - [services/tc-browser-agent.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/tc-browser-agent.js:1)
- Notes:
  - this is domain-specific, but it proves the system already knows how to run real browser interaction

#### 10.3 Website scrape / competitor scrape
- Status: `PRESENT`
- Evidence:
  - [routes/web-intelligence-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/web-intelligence-routes.js:1)

#### 10.4 Website audit / structured website analysis
- Status: `PARTIAL`
- Evidence:
  - [routes/website-audit-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/website-audit-routes.js:1)
- Gap:
  - current implementation exists, but it is not yet clearly part of the new governed factory capability map

#### 10.5 General-purpose governed web interaction tool for the factory
- Status: `MISSING`
- Gap:
  - repo has browser capability and scraping capability
  - it does not yet have a canonical “factory-safe web operator” abstraction

### 11. Readiness / proof / classification tools

#### 11.1 System alpha readiness surface
- Status: `PRESENT`
- Evidence:
  - older BuilderOS readiness services and docs exist

#### 11.2 Structural proof freshness
- Status: `PARTIAL`
- Evidence:
  - remediation blueprint explicitly calls for it
- Gap:
  - not yet absorbed as a canonical new-factory tool

#### 11.3 Legacy quarantine registry
- Status: `PARTIAL`
- Evidence:
  - doctrine and classification work exist in BuilderOS structural docs
- Gap:
  - not yet implemented as the new factory’s living registry

## Tool summary by status

### Present

- Multi-model council engine
- Debate persistence / memory intelligence core
- Builder HTTP build surface
- Builder preflight
- Builder output verifier
- Precommit governance
- Patch-mode / zone classifier
- Model routing policy
- Model escalation gate
- Anti-pattern scanner
- Telemetry and efficiency routes
- Command-control job service
- GitHub commit / deployment bridge
- Railway env write / sync / verify
- DB boot / migration auto-runner
- Generic browser automation
- Domain-specific browser automation
- Web scrape / competitor scrape

### Partial

- Founder intent simulator
- Founder packet completeness checker
- Blueprint planner / schema layer
- Salvage mapper
- Execute-only proof runtime
- Blocked-return taxonomy
- Unintended-consequence review as dedicated tool
- Prediction vs outcome Historian tooling
- Consensus correctness tracker by domain
- C2 mission dashboard as final LifeOS module
- Critical escalation ladder
- Remote truth reconciler
- Website audit as governed factory tool
- Structural proof freshness
- Legacy quarantine registry

### Missing

- Product Development gate engine
- Structured Founder Packet validator runtime
- Full BPB machine blueprint compiler for the whole factory
- Same-tier determinism harness
- SENTRY blueprint freeze tool
- SENTRY future-lookback engine
- TSOS prompt optimization evaluator
- TSOS JSON efficiency evaluator
- TSOS cache value / cache policy engine
- Canonical factory-safe governed web operator

## Most important conclusions

### 1. The system already has more real tooling than the current packet captured

Especially:

- Railway env control
- deployment / GitHub commit
- builder build surface
- preflight
- verification
- browser automation
- scraping
- telemetry
- memory

### 2. The biggest risk is not tool absence, but tool governance drift

Many tools exist, but:

- they are not yet all under the new factory authority model
- some still live inside old BuilderOS assumptions
- some are runtime-real but not canonically named in the new system

### 3. The most important missing tools are upstream, not downstream

The biggest missing pieces are:

- Product Development gate engine
- structured Founder Packet validator
- full BPB compiler
- same-tier determinism checker
- SENTRY freeze/future-lookback tooling

That matches the earlier audit: upstream clarity is still the main gap.

### 4. The env-writing example is confirmed

Yes, the system already has a real tool to write its own managed Railway env vars and sync them:

- [services/railway-managed-env-service.js](/Users/adamhopkins/Projects/Lumin-LifeOS/services/railway-managed-env-service.js:1)
- [routes/railway-managed-env-routes.js](/Users/adamhopkins/Projects/Lumin-LifeOS/routes/railway-managed-env-routes.js:1)

### 5. Web reading and interaction exist, but not yet in canonical factory form

The repo already has:

- scraping routes
- website audit logic
- Puppeteer browser sessions
- domain-specific browser agents

But the new factory still needs one governed abstraction for when and how those tools are used.
