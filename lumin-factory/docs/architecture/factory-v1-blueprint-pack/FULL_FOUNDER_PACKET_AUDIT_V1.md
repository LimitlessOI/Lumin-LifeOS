<!-- SYNOPSIS: Full Founder Packet Audit v1 -->

# Full Founder Packet Audit v1

## Scope

This audit compares:

- `docs/architecture/factory-v1-blueprint-pack/FULL_FOUNDER_PACKET_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/CANONICAL_FACTORY_FOUNDATION_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/FACTORY-0001-v1/BLUEPRINT.json`

Against:

- Builder-related SSOTs
- Builder runtime routes/services/scripts
- BuilderOS remediation blueprints
- salvage findings already captured in `SALVAGE_CANDIDATES.json`

This audit is limited to the factory / builder machine, not product feature repos or product mission blueprints.

## Executive judgment

The current founder packet is strong on constitutional doctrine and weak on runtime builder doctrine.

The older BuilderOS material is weaker on the new trust-system framing and stronger on hard operational discipline.

Neither is sufficient alone.

The current founder packet should remain the constitutional source.
The missing runtime-builder laws must be pulled back in and locked under it.

## Critical findings

### 1. The current founder packet dropped the runtime state machine

The current packet defines loops, but it does not define the explicit mission-state machine already present in `docs/SSOT_NORTH_STAR.md`.

Missing states include:

- Proposed
- Clarified
- Council Review
- Approved
- BPB Blueprinting
- SENTRY review
- Build Approved
- Building
- Verification
- Deployed
- Outcome Measured
- Lessons Captured

Why this matters:

- without a canonical state machine, authority blur returns
- status surfaces can fake progress
- C2 cannot truthfully surface where work actually is
- Builder/BPB/SENTRY handoffs become semantic instead of contractual

Required correction:

- the factory foundation must adopt the NSSOT mission-state machine as canonical runtime flow
- every mission, packet, blueprint, and receipt must carry a state

### 2. The current founder packet dropped proof-source discipline and maturity vocabulary

The older BuilderOS material is explicit about runtime proof sources and classification states. The current packet is not.

Missing or under-specified:

- `NOT_WIRED`
- `WIRED`
- `LIVE`
- `PROVEN`
- `ACTIVE`
- `LEGACY`
- `ARCHIVED`
- `FORBIDDEN`
- `UNKNOWN_DO_NOT_TOUCH`

And the rule:

- docs alone earn zero runtime maturity

Why this matters:

- this is how fake-green happens
- this is how route existence gets mistaken for working runtime
- this is how old builder machinery overclaimed maturity

Required correction:

- the factory must adopt runtime proof-source mapping and maturity vocabulary
- every department/module/service needs explicit proof-source rules

### 3. The current founder packet under-specifies Builder guardrails that already exist in code

The present packet says Builder makes no decisions. Correct.

But it does not carry forward the runtime mechanisms that enforce disciplined execution:

- useful-work-guard
- precommit governance
- routing policy
- model escalation gate
- remote-truth discipline
- append-only receipts

Why this matters:

- a low-end Builder model is only safe when the platform constrains it hard
- doctrine without guardrails produces token burn, retry churn, and fake completion
- “Builder only codes” is not enough unless the runtime forbids bad paths

Required correction:

- these controls must be promoted from repo-specific lore into canonical factory requirements

### 4. The earlier `FACTORY-0001` blueprint is more executable than the founder packet, but too narrow to be the real build packet

`FACTORY-0001-v1/BLUEPRINT.json` is stronger than the founder packet in these ways:

- exact files
- exact actions
- exact acceptance tests
- sandboxed writes
- blocked-return contract
- blueprint-owned verification

But it is too narrow:

- it only proves a minimal execute-only slice
- it does not prove Product Development
- it does not prove AIC completeness gating
- it does not prove BPB intake rigor
- it does not integrate salvage
- its Historian/TSOS slices are proof stubs, not true departmental implementations

Required correction:

- keep `FACTORY-0001` as proof-slice precedent
- do not mistake it for the full machine blueprint

### 5. The current founder packet still underweights proven “parts car” machinery

Claude's salvage pass was directionally correct.

The current founder packet mentions salvage, but it does not fully operationalize what survives:

Keep / adapt:

- database boot + migrations
- consensus engine
- deployment service
- Railway env management
- builder output verification
- anti-pattern scans
- patch-mode classification
- builder HTTP bridge / validation path
- preflight checks
- structured logging

Reject:

- autonomous backlog runner
- support-task invention
- patch-plan recursion
- queue-generated work creation
- amendments as active authority

Required correction:

- the build blueprint must explicitly name which old components are imported, adapted, or replaced

## High-value findings from older BuilderOS doctrine that are missing or too weak in the current packet

### A. Runtime truth must be anchored to explicit proof sources

The old BuilderOS docs are much stricter about what counts as proof:

- live routes
- runtime-linked receipts
- DB rows tied to runtime claims
- proof freshness
- deploy SHA parity
- repair queue
- telemetry events

This should survive.

### B. Useful-work-guard is load-bearing

Every scheduled/orchestrated AI call must prove:

- prerequisites exist
- real work exists
- the call has a purpose

If not, skip.

This doctrine is stronger than generic “be efficient.”
It prevents pointless spend before the call happens.

This should survive unchanged.

### C. Precommit governance is load-bearing

The old builder path already learned:

- model output is not trusted on generation
- generated output must pass verifier gates before commit claim
- retry once, then block

This should survive.

### D. Remote truth doctrine is missing from the current packet

The compact rules are right:

- GitHub = source
- Railway = runtime
- Neon = data
- local repo/shell = mirror/workbench

This should be first-class in the new factory, especially for C2 and SENTRY.

### E. Append-only receipt history is missing or too weak

The old builder system learned:

- receipts are append-only
- no silent overwrites
- fix rows are added rather than history erased

That matters for Historian, trust, and auditability.

### F. Fail-closed readiness is missing or too weak

The older remediation docs are much sharper here:

- stale proof must block ready
- missing governed proof must block ready
- runtime truth outranks scoring
- “high percent but stale proof” is fake green

The current packet implies this, but does not define it operationally.

### G. Structural proof freshness / legacy quarantine is missing

The old structural consolidation work is strong on:

- classify before delete
- quarantine without deleting
- one canonical path per function
- legacy/live conflicts are surfaced

The current packet talks about salvage and authority, but does not carry this classification system far enough.

## Comparison: current founder packet vs earlier `FACTORY-0001` blueprint

### What the current founder packet does better

- trust-system framing
- honesty / truth / anti-deceit law
- human + AI synergy doctrine
- consensus / synthesis doctrine
- Product Development gate
- Founder Packet completeness logic
- AIC / BPB / Builder / SENTRY / Historian / TSOS / C2 role separation
- explicit rejection of founder bottleneck recurrence

### What `FACTORY-0001` does better

- exact machine handoff structure
- exact file and contract ownership
- exact blocked-return behavior
- exact sandboxing behavior
- exact acceptance test ownership
- exact determinism constraints for a proof slice

### What both are still missing together

- one unified state machine
- one proof-source registry
- one maturity-classification doctrine
- one explicit runtime import/adapt/replace map from the old builder
- one full A-to-Z build plan for the complete factory system
- one explicit fail-closed readiness doctrine for the factory itself

## Detailed drift audit

### Current drift / stale artifacts still present

1. `SALVAGE_CANDIDATES.json` still uses `OIL` naming in explanatory text.
2. older export bundles preserve superseded rules and should not be treated as canonical
3. the founder packet and canonical foundation still read more like constitution than executable machine contract
4. Product Development is now correctly a stage, but not yet fully enforced as a build gate artifact chain
5. C2 is now defined correctly in canon, but earlier packet artifacts still reflect older categories

### Drift the current founder packet already fixed correctly

1. Builder makes no decisions at all
2. determinism must be tested at the same Builder model tier
3. BPB must never receive unresolved strategic ambiguity in the normal path
4. C2 is inside LifeOS, not a separate governance department
5. consensus is 100%, progressive, and aimed at synthesis
6. AIC is not a passive referee

## Parts-car decision table

### Import as-is

- `startup/database.js`
- `services/council-service.js`
- `services/deployment-service.js`
- `services/railway-managed-env-service.js`
- `services/logger.js`
- `scripts/builderos-groq-antipattern-scan.mjs`
- `scripts/verify-builder-output.mjs`
- `services/builderos-patch-mode-policy.js`

### Adapt and import

- `routes/lifeos-council-builder-routes.js`
- `scripts/council-builder-preflight.mjs`
- `services/builderos-routing-policy.js`
- `services/builderos-model-escalation-gate.js`
- `services/builderos-precommit-governance.js`
- `services/useful-work-guard.js`

### Reference for lessons only

- `docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md`
- `docs/architecture/BUILDEROS_A_TO_Z_BLUEPRINT.md`
- `docs/architecture/BUILDEROS_STRUCTURAL_CONSOLIDATION_BLUEPRINT.md`
- `docs/projects/builderos-remediation/BLUEPRINT.md`
- `docs/projects/builderos-remediation/TSOS_HOOK_BOUNDARY.md`

### Do not carry forward

- `scripts/governed-overnight-backlog-run.mjs`
- `services/builderos-governed-loop-executor.js`
- autonomous support-task generation
- patch-plan recursion
- amendment files as direct runtime authority

## What the system got right and should preserve

### What we got right

1. identifying that this is a trust system, not a code churn system
2. separating Builder from strategy
3. discovering that consensus usually resolves quickly through explicit cases and argue-both-sides
4. discovering that human + AI synergy usually yields a better third option
5. recognizing that founder fatigue is a system failure, not a founder weakness
6. distinguishing product development from blueprinting from execution
7. proving that weak models are bad BPB models but can still be useful Builders under hard constraints
8. preserving the parts-car idea instead of starting from scratch blindly

### What we got wrong and must not repeat

1. letting strategic ambiguity leak downward
2. allowing support-task / patch-plan churn
3. overvaluing documentation without runtime proof
4. overclaiming readiness from stale or generic telemetry
5. relying on fragmented conversational memory instead of canonical artifacts
6. letting naming drift create authority drift
7. testing Builder determinism on stronger models than the execution tier

## Audit conclusion

The current founder packet should survive as the constitutional top layer.

But it is not yet the full operational machine contract.

To become the real build authority, it must absorb:

- mission-state machine
- runtime proof-source registry
- maturity classification vocabulary
- fail-closed readiness doctrine
- useful-work-guard
- precommit governance
- model routing / escalation policy
- remote truth doctrine
- append-only receipt doctrine
- legacy quarantine / structural proof freshness
- explicit salvage import/adapt/replace map

That is the gap between “strong doctrine” and “lowest-tier Builder can execute safely.”

---

## Addendum — doctrine items now in factory runtime (2026-05-24)

**Manifest:** [FACTORY_REBUILD_MANIFEST_V1.md](./FACTORY_REBUILD_MANIFEST_V1.md)

| Doctrine gap (§ above) | Runtime materialization | Mission |
|------------------------|-------------------------|---------|
| Mission-state machine | `factory-core/canon/MISSION_STATE_MACHINE.json` | 0030 |
| Maturity classification | `factory-core/canon/MATURITY_CLASSIFICATION.json` | 0030 |
| Proof-source registry | `factory-core/canon/PROOF_SOURCE_REGISTRY.json` | 0030 |
| Fail-closed readiness | `readiness/*`, `remote-truth-reconciler.js` | 0020–0028 |
| Remote truth doctrine | `GET /factory/truth/reconcile` | 0030 |
| Append-only receipt doctrine | Historian JSONL + mission receipts | 0003, 0030 |
| Structural proof freshness | `sentry/proof-freshness.js` | 0030 |
| Explicit salvage map | `PRODUCT_SALVAGE_CANDIDATES.json` | 0027 stub |

### Still doctrine-only (not factory-canonical yet)

| Item | Notes |
|------|-------|
| useful-work-guard | Main repo scheduled AI; not wired to factory cron |
| precommit governance | Repo hook; factory uses SENTRY on hot path |
| model routing / escalation | Production builder; not factory execute-step |
| legacy quarantine registry | Payload file; not live DB registry |
| full founder packet as machine input | `strict_upstream_gates: true` requires complete packet for **new** missions; reboot missions use legacy relaxed mode |

**Verify:** `npm run factory:ci` · **Next:** merge production builder ADAPT items per GOLDMINE_PASS addendum

