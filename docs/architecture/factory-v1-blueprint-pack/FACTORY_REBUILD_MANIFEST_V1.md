<!-- SYNOPSIS: Factory Rebuild Manifest v1 -->

# Factory Rebuild Manifest v1

**Purpose:** Rebuild the entire governed factory from scratch — anywhere, anytime — using only this blueprint pack, mission packs, and verification commands. No oral history required.

**Certification level:** `BOOTSTRAP_AND_STAGING_READY` — not `FULLY_MACHINE_READY`

**Last verified:** 2026-05-24 — `npm run factory:ci` **16/16 PASS**

---

## 1. Read order (cold start)

```text
1. docs/BUILDEROS_VOCABULARY.md       ← locked v2.7 terms (read before any blueprint pack doc)
2. BLUEPRINT_PACK_INDEX_V1.md          ← table of contents
3. CANONICAL_FACTORY_FOUNDATION_V1.md
4. CODER_ZERO_DECISION_BUILD_SPEC_V1.md
5. This file (FACTORY_REBUILD_MANIFEST_V1.md)
6. builderos-reboot/HANDOFF.md         ← monorepo host only; standalone → repo HANDOFF.md
7. builderos-reboot/MISSION_QUEUE.json ← monorepo host only; standalone → MISSION_QUEUE.json
```

Then materialize missions in queue order (or run `factory:ci` on an already-built clone).

---

## 2. Three-layer architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ DOCTRINE  docs/architecture/factory-v1-blueprint-pack/      │
│           What the system must be (law + phase spec)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ BPB emits
┌───────────────────────────▼─────────────────────────────────┐
│ MACHINE   builderos-reboot/MISSIONS/FACTORY-REBOOT-*        │
│           Step-atomic BLUEPRINT.json + sha256 pins           │
└───────────────────────────┬─────────────────────────────────┘
                            │ materialize / execute-step
┌───────────────────────────▼─────────────────────────────────┐
│ RUNTIME   factory-staging/                                    │
│           Live execute-step, gates, SENTRY, TSOS, Historian   │
└───────────────────────────┬─────────────────────────────────┘
                            │ cutover (optional)
┌───────────────────────────▼─────────────────────────────────┐
│ CUTOVER   lumin-factory/  → separate git repo                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRODUCTION SPINE (main repo — parallel, not replaced)        │
│ routes/lifeos-council-builder-routes.js                     │
│ services/deployment-service.js, railway-managed-env-*       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Execute-step hot path (runtime truth)

```text
POST /factory/execute-step
  → BPB intake gate (PD + Founder Packet + Adam Filter + blueprint freeze)
  → Builder (write_file_exact only, sandbox enforced)
  → SENTRY (contract + anti-pattern + lookback + proof freshness)
  → TSOS (metrics append, guardrails fail-closed)
  → Historian (append-only step record)
  → C2 surfaces read state via GET routes (never assigns work)
```

**Body flags:**

| Flag | Effect |
|------|--------|
| `skip_intake_gate: true` | Integration tests only |
| `strict_upstream_gates: true` | Full PD + Founder Packet required |

---

## 4. Phase → runtime file map

Paths relative to `factory-staging/` unless noted.

### Phase 0 — Canon lock

| Spec output | Runtime path | Mission |
|-------------|--------------|---------|
| Mission state machine | `factory-core/canon/MISSION_STATE_MACHINE.json` | 0030 |
| Maturity classification | `factory-core/canon/MATURITY_CLASSIFICATION.json` | 0030 |
| Proof source registry | `factory-core/canon/PROOF_SOURCE_REGISTRY.json` | 0030 |
| Council quarantine | `factory-core/canon/services/council-adapter.js` | 0003/0004 |

Doctrine docs (not duplicated in runtime): `CANONICAL_FACTORY_FOUNDATION_V1.md`, `DEPARTMENT_CHARTERS_V1.md`

### Phase 1 — Product Development

| Spec output | Runtime path | Mission |
|-------------|--------------|---------|
| PD gate validator | `factory-core/product-development/validate-gate.js` | 0030 |
| `PRODUCT_DEVELOPMENT_RESULT.json` | per-mission in `builderos-reboot/MISSIONS/*/PRODUCT_DEVELOPMENT_RESULT.json` | all |

### Phase 2 — Founder Packet

| Spec output | Runtime path | Mission |
|-------------|--------------|---------|
| Completeness validator | `factory-core/founder-packet/validate-completeness.js` | 0030 |
| `FOUNDER_PACKET.json` | per-mission in `builderos-reboot/MISSIONS/*/FOUNDER_PACKET.json` | all |

### Phase 3 — BPB intake

| Spec output | Runtime path | Mission |
|-------------|--------------|---------|
| Intake gate | `factory-core/bpb/intake-gate.js` | 0030 |
| Adam Filter | `factory-core/founder-intent/adam-filter.js` | 0030 |
| Blueprint freeze | `factory-core/sentry/blueprint-freeze-check.js` | 0003 + 0030 depth |
| Mission packs | `builderos-reboot/MISSIONS/*/BLUEPRINT.json` | 0001–0030 |

### Phase 4 — Builder / Coder runtime

| Spec output | Runtime path | Canonical step |
|-------------|--------------|----------------|
| `run-step.js` (dispatch) | `factory-core/builder/run-step.js` | 0029/0030 |
| `run-mission.js` | `factory-core/builder/run-mission.js` | 0006 S601 |
| `sandbox.js` | `factory-core/builder/sandbox.js` | 0003 |
| `blocked-return.js` | `factory-core/builder/blocked-return.js` | 0003 |
| `write-file-exact` handler | `factory-core/builder/action-handlers/write-file-exact.js` | 0003 |
| Execute-step route | `factory-core/routes/factory-execute-step-routes.js` | 0005 |
| Execute-mission route | `factory-core/routes/factory-execute-mission-routes.js` | 0006 |
| Route registration | `startup/register-routes.js` | 0029/0030 |
| Staging server | `server.js`, `package.json` | 0004 |

### Phase 5 — SENTRY

| Spec output | Runtime path | Notes |
|-------------|--------------|-------|
| Contract verify | `factory-core/sentry/verify-step-contract.js` | Acceptance test runner |
| Result verify (full stack) | `factory-core/sentry/verify-step-result.js` | 0030 depth |
| Anti-pattern | `factory-core/sentry/anti-pattern-check.js` | Blocks on hot path |
| Blueprint freeze | `factory-core/sentry/blueprint-freeze-check.js` | |
| Future lookback | `factory-core/sentry/future-lookback.js` | Advisory + blocking |
| Unintended consequence | `factory-core/sentry/unintended-consequence-check.js` | |
| Proof freshness | `factory-core/sentry/proof-freshness.js` | Adapted from `oil-proof-freshness` |
| SENTRY review JSONL | `data/sentry-reviews.jsonl` | Append-only |
| Run verification (legacy HTTP) | `factory-core/sentry/run-verification.js` | |

### Phase 6 — Historian

| Spec output | Runtime path | Notes |
|-------------|--------------|-------|
| Append record (hot path) | `factory-core/historian/append-record.js` | 0030 |
| Mission history summary | `factory-core/historian/mission-history.js` | |
| record-decision/prediction/outcome/lesson/consensus | `factory-core/historian/record-*.js` | Loop proof |
| Ledger JSONL | `data/historian-records.jsonl` | |
| Trust levels doc | `factory-core/historian/memory-trust-levels.md` | |
| Authority map | `factory-core/historian/MEMORY_AUTHORITY_MAP.md` | |

### Phase 7 — TSOS

| Spec output | Runtime path | Notes |
|-------------|--------------|-------|
| Guardrails | `factory-core/tsos/tsos-guardrails.js` | 0029 |
| Record + append | `factory-core/tsos/record-step-metrics.js` | Hot path |
| Summary | `factory-core/tsos/tsos-summary.js` | |
| Efficiency evaluator | `factory-core/tsos/evaluate-efficiency.js` | Proposals only |
| prompt/cache/routing evaluators | `factory-core/tsos/prompt-optimization.js`, etc. | Stub proposals |
| Hook boundary | `factory-core/tsos/TSOS_HOOK_BOUNDARY.md` | |
| Metrics JSONL | `data/tsos-step-metrics.jsonl` | gitignored |

### Phase 8 — C2 inside LifeOS

| Spec output | Runtime path | Notes |
|-------------|--------------|-------|
| Module charter | `lifeos/c2/C2_MODULE_CHARTER.md` | |
| State model | `lifeos/c2/C2_STATE_MODEL.json` | |
| Escalation rules | `lifeos/c2/C2_ESCALATION_RULES.json` | |
| Communication prefs | `lifeos/c2/C2_COMMUNICATION_PREFERENCES.json` | |
| C2 surface (factory) | `factory-core/lifeos/c2-surface.js` | 0030 — not full LifeOS UI |

### Phase 9 — Readiness / proof

| Spec output | Runtime path | Notes |
|-------------|--------------|-------|
| system-alpha-readiness | `factory-core/readiness/system-alpha-readiness.js` | |
| proof-freshness | `factory-core/readiness/proof-freshness.js` | |
| structural-proof-freshness | `factory-core/readiness/structural-proof-freshness.js` | |
| legacy-quarantine | `factory-core/readiness/legacy-quarantine.js` | |
| runtime-proof-snapshot | `factory-core/readiness/runtime-proof-snapshot.js` | |
| Remote truth reconciler | `factory-core/readiness/remote-truth-reconciler.js` | 0030 |
| Readiness report | `builderos-reboot/READINESS_REPORT.json` | Generated |

### Phase 10 — Full proof mission

| Artifact | Path | Mission |
|----------|------|---------|
| Proof loop mission | `builderos-reboot/MISSIONS/FACTORY-PROOF-LOOP-0001/` | |
| Receipt | `builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json` | 0026 |
| Greenfield mission | `builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/` | |

### Phase 11 — Product salvage

| Artifact | Path | Mission |
|----------|------|---------|
| Salvage candidates (repo) | `builderos-reboot/PRODUCT_SALVAGE_CANDIDATES.json` | 0027 |
| Salvage candidates (pack) | `blueprint-pack/SALVAGE_CANDIDATES.json` | audit |
| First product stub | `builderos-reboot/MISSIONS/PRODUCT-MARKETINGOS-SALVAGE-0001/` | stub only |

### Phase 12 — Missions 0029 / 0030 (integration slices)

| Mission | Purpose |
|---------|---------|
| FACTORY-REBOOT-0029 | TSOS hot path + guardrails |
| FACTORY-REBOOT-0030 | Upstream gates + SENTRY depth + Historian + surfaces |

---

## 5. HTTP surface (factory-staging)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service + route list |
| POST | `/factory/execute-step` | Hot path |
| POST | `/factory/execute-mission` | Multi-step |
| GET | `/factory/gates/intake?mission_id=` | BPB intake probe |
| GET | `/factory/council/status` | Council quarantine |
| GET | `/factory/readiness` | Readiness + remote truth |
| GET | `/factory/mission-history` | History + Historian |
| GET | `/factory/historian/summary` | Historian ledger |
| GET | `/factory/tsos/summary` | TSOS aggregates |
| GET | `/factory/c2/status` | C2 module artifacts |
| GET | `/factory/c2/brief?mission_id=` | C2 mission brief |
| GET | `/factory/truth/reconcile` | GitHub + receipts |
| GET | `/factory/canon/status` | Runtime canon files |

---

## 6. Mission queue summary

| Range | Purpose |
|-------|---------|
| 0001–0004 | Bootstrap, segments, materialize staging |
| 0005–0010 | Execute-step/mission live, integration |
| 0011–0028 | CI, determinism, duplication, proof, certification |
| 0029 | TSOS integration |
| 0030 | Full factory tools (gates, SENTRY depth, Historian) |
| FACTORY-GREENFIELD-0001 | Greenfield proof |
| FACTORY-PROOF-LOOP-0001 | Governed loop proof |

Full list: `builderos-reboot/MISSION_QUEUE.json`

---

## 7. Verification matrix

| Command | Proves |
|---------|--------|
| `npm run factory:ci` | 15-check umbrella (acceptance + integration + receipts) |
| `npm run factory:tools` | Gates, SENTRY JSONL, Historian, C2, truth |
| `npm run factory:tsos` | TSOS guardrails + append |
| `npm run factory:sentry` | Mechanical SENTRY checklist |
| `npm run factory:readiness` | Readiness report emission |
| `npm run factory:full-loop` | Phase 10 proof |
| `npm run factory:duplication` | Blueprint duplicability |
| `node builderos-reboot/scripts/run-all-mission-acceptance.mjs` | All sha256 pins |

---

## 8. Data / receipt paths (append-only)

| File | Owner |
|------|-------|
| `factory-staging/data/tsos-step-metrics.jsonl` | TSOS |
| `factory-staging/data/historian-records.jsonl` | Historian |
| `factory-staging/data/sentry-reviews.jsonl` | SENTRY |
| `factory-staging/data/step-receipts.jsonl` | Legacy HTTP layer |
| `builderos-reboot/DETERMINISM_RECEIPT.json` | Proof |
| `builderos-reboot/DUPLICATION_RECEIPT.json` | Proof |
| `builderos-reboot/FULL_LOOP_PROOF_RECEIPT.json` | Proof |
| `builderos-reboot/PROJECT_CERTIFICATION.json` | Certification |

---

## 9. Shared file ownership (rematerialize rules)

| Target | Canonical owner |
|--------|-----------------|
| `factory-staging/factory-core/builder/run-step.js` | 0029 / 0030 |
| `factory-staging/startup/register-routes.js` | 0029 / 0030 |
| `factory-staging/factory-core/builder/run-mission.js` | 0006 S601 |

Full table: `builderos-reboot/MISSION_SHARED_FILE_OWNERSHIP.md`

---

## 10. Production spine (main repo — rebuild separately)

These tools exist in the **main LifeOS repo** and are required for production `/build`, GitHub commit, and Railway control. They are **not** copied into `factory-staging/` by design (see GOLDMINE_PASS_V2).

| Tool | Path | Capability |
|------|------|------------|
| Builder HTTP | `routes/lifeos-council-builder-routes.js` | POST `/api/v1/lifeos/builder/build` |
| Deployment | `services/deployment-service.js` | `commitToGitHub`, Railway redeploy |
| Railway env | `routes/railway-managed-env-routes.js` | bulk env, sync, bootstrap |
| Inline Railway | `server.js` routes | GET/POST `/api/v1/railway/env`, `/deploy` |
| Preflight | `scripts/council-builder-preflight.mjs` | |
| Useful-work guard | `services/useful-work-guard.js` | Scheduled AI gate |
| Precommit governance | `services/builderos-precommit-governance.js` | |
| Routing / escalation | `services/builderos-routing-policy.js`, `builderos-model-escalation-gate.js` | |
| Proof freshness (source) | `services/oil-proof-freshness.js` | ADAPT → factory SENTRY |

**ADAPT backlog:** Wire control-plane DONE gate + useful-work-guard into factory loop (not done in 0030).

---

## 11. Rebuild procedure (from empty repo)

### A. Clone + install

```bash
git clone <repo> && cd Lumin-LifeOS && npm install
```

### B. Verify existing materialization

```bash
npm run factory:ci
```

If **15/15 PASS** — runtime matches mission pins; skip to §11.D.

### C. Rematerialize from missions (if starting from doctrine only)

1. Emit or copy mission packs `builderos-reboot/MISSIONS/FACTORY-REBOOT-0001` … `0030`
2. For each mission, run materialize scripts per mission README (or `execute-mission` where live)
3. After **any** shared file change, refresh hashes on owning mission only
4. Run `npm run factory:ci` until green

### D. Cutover (optional separate repo)

```bash
# Push lumin-factory/ to its own GitHub repo
# Re-run CI on clean clone of that repo
```

### E. Production deploy

```bash
npm run builder:preflight
npm run system:railway:redeploy   # requires COMMAND_CENTER_KEY + PUBLIC_BASE_URL
```

---

## 12. Honest gaps (do not skip when rebuilding)

| Gap | Impact | Priority for this hand-built BP |
|-----|--------|----------------------------------|
| Cold coder 3-session determinism | Required only when **system generates** a BP; **not** for this pack | **Deferred** — Adam decision 2026-05-24 |
| Token caps on Railway (`MAX_DAILY_SPEND`, `COST_SHUTDOWN_THRESHOLD`) | Emergency brake only — does not stop unproductive churn | **Optional** — not the strategy |
| Useful-work + directed mode on all scheduled AI | Stops garbage loops (free or paid) | **Income filter is the operator rule** |
| Factory TSOS JSONL → `token_usage_log` bridge | One dashboard for factory + production AI spend | **When factory calls paid AI** — production ledger already live |
| `lumin-factory/` not on GitHub | Optional standalone repo | **Optional** — factory works in main repo |
| Production builder not merged with factory-staging | Two build paths coexist | **Future** — production self-execution still works |
| 46 product missions | Salvage stub only | **When ready for first product** |
| Live council on SENTRY hot path | Structural checks only on factory path | **Future enhancement** |
| BPB compiler service | Mission format IS blueprint | **N/A for rebuild** |
| `build-queue-planner.js`'s `planBuildQueue` has no Architect-escalation path on ambiguity | Violates D6 (§16): the planner uses an AI model to interpret backlog bullets into steps today, with no defined "this is ambiguous, escalate to Architect" exit — it either produces a step or fails closed, but doesn't distinguish "genuinely no work" from "work exists but is under-specified" | **Named gap, not yet wired** — surfaced 2026-07-18 |
| LifeOS — the founder's own explicit #1 build priority (`PRODUCT_BUILD_PRIORITY.json`, "never stop; follow blueprint step-by-step") — has an EXHAUSTED queue (175/175 steps done) and ZERO documented backlog (`PRODUCT_HOME.md` has no Build Plan/Backlog/Remaining/Next heading for `extractBacklog()` to read). The loop is structurally correct to have moved on to other products; there is nothing written down for it to build next on the founder's stated top priority. A `conversations/` folder exists with at least one file that may contain unmined backlog content. | Real, live, surfaced 2026-07-18. This is a content/product-decision gap, not a code bug — filling it is a founder/Architect call (what should LifeOS build next), not something to invent unilaterally. | **Open — needs founder or Architect input on what belongs in LifeOS's backlog** |

## 17. Future direction (not ready — captured so it isn't lost)

**Competing dual-instance BuilderOS (founder vision, 2026-07-18):** once this system is proven stable as autonomous building infrastructure (founder's own stated precondition — not yet met), duplicate it into two independent instances that build in parallel and are scored against each other on improvement rate. Whichever instance proves a real improvement (a fix, a doctrine addition, a pattern) is required to share it with the other — the competition is on throughput/quality, not on hoarding what works. Keep a running scoreboard: which instance is doing better, and why.

Not scoped, not designed, not started. Named here as a real founder-owned direction so it survives to whenever the precondition is met, per §16's own rule (D6): a decision this size is a founder/Architect blueprint call, not something to improvise into existence. Rough shape a future Architect pass would need to resolve: (1) how "improvement" is measured comparably across two instances working on different products, (2) the actual sharing mechanism (a fix in one instance's doctrine pack propagating to the other's — likely built on D3's `known_bad_signatures` pattern and D5's cross-product-fix-propagation idea, both already in this doctrine), (3) infrastructure for running two genuinely independent instances without them colliding on shared resources (GitHub repo, Railway deploy, token budget) the way the single instance already collides with interactive sessions today (see the working-tree-isolation gap raised alongside D1-D6, not yet ratified).

---

## 13. Certification claims allowed

| Claim | Allowed? |
|-------|----------|
| `BOOTSTRAP_AND_STAGING_READY` | **Yes** — when `factory:ci` green (**ceiling for this hand-built BP**) |
| `BLUEPRINT_DUPLICABLE` | **Yes** — `DUPLICATION_RECEIPT.json` |
| `FULLY_MACHINE_READY` | **No** — and **not required** for this pack; applies when system-generated BP + cold-coder proof |
| `LIFEOS_PRODUCT_COMPLETE` | **No** |

---

## 15. Operator plain language (Adam)

**Cold coder test:** You built this BP with agents, not by handing a spec to a dumb model cold. The 3-session test proves a *machine-emitted* BP works without human judgment. Skip it for this pack; use it later when the factory emits the next BP.

**Token money:** Caps stop bleeding; they do not make work productive. Useful-work guard + directed mode stop scheduled garbage loops. **Income-linked milestones** are the filter for every AI dollar — spend freely on work that moves a chosen revenue lane to a customer-visible outcome.

**Two builders:** Old production builder on Railway + new `factory-staging/` in repo. Both work; they are not one program yet.

**lumin-factory/ folder:** Optional copy for its own GitHub repo. Not required to use the factory here.

**46 products:** A shopping list, not build instructions yet.

---

## 16. Doctrine additions (self-observed, ratified 2026-07-18)

These are validated by evidence — code that already exists and runs, or a
defect hit live during work on this exact manifest — not proposals. Ratifying
here per the standing rule: the queue takes only from the blueprint, so a
validated improvement has to land in the blueprint (here) before it's
doctrine, not just live in a scattered PRODUCT_HOME receipt line.

| # | Doctrine | Evidence | Where it lives |
|---|----------|----------|-----------------|
| D1 | **Power-of-two commit anti-thrash.** Repeated identical failures only commit a queue-status update on error-change, the first two attempts, or power-of-two attempt counts — not every single retry. | `isPowerOfTwo()` + `shouldCommit` gate, already shipping. | `services/governed-autonomous-shipping-loop.js` |
| D2 | **Railway `watchPatterns` redeploy skip.** Non-runtime commits (docs, `BUILD_QUEUE.json` status) skip the Docker redeploy. ~85% of governed commits were queue-status JSON triggering full 2-3min rebuilds for zero code change. | Commit `a90ad102bb`, already shipping. | Railway service config |
| D3 | **Repeat-regression memory.** A BUILD_QUEUE step reset to `pending` after a manual/GAP-FILL fix now carries forward the failure signature that was already fixed once; a plain status reset does not clear it. If the factory reproduces the identical signature, skip the escalation ladder and rotate model immediately. | Hit live, twice, on this exact branch: the same broken-stub defect was fixed, reset-to-rebuild, and reproduced identically both times before this existed. | `services/governed-autonomous-shipping-loop.js` (`isKnownBadSignature`), `scripts/mark-step-known-bad-signature.mjs` |
| D4 | **Handoff branch-reachability preflight.** Before any agent writes "already done, just verify" about work on another branch/commit, run the preflight and paste its real output (SHA, ahead/behind, file list) — never a prose claim alone. | Hit live on this exact branch: a handoff claimed uncommitted work "already exists," true only on the authoring session's own disk, never pushed to origin. | `scripts/verify-branch-pushed.mjs`, wired into `docs/products/builderos/DEVIN_HANDOFF.md` |
| D5 | **Generated-artifact merge doctrine.** A structured/generated file (JSON/YAML index) with volatile header fields (timestamp, count) gets regenerate-on-conflict on merge, never a blind line-based `merge=union` — union keeps both conflicting header values as duplicate JSON keys, corrupting the file. | Caught before shipping: `builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json` has exactly this shape (`generated_at` + `file_count`). | `scripts/resolve-file-synopsis-index-conflict.sh` |
| D6 | **Queue = blueprint-sequence-only; a queue that needs to decide means the blueprint failed.** The queue takes only from the blueprint and makes zero product/scope decisions — its only judgment call is sequencing (where in the blueprint we are, continue from there). A founder request ("I want X done, change this and this") enters via Chair → Architect review → added to the BP, and only then — unless the founder says otherwise — goes to the top of the queue as the next thing worked on. **If a queue step is ever ambiguous enough that executing it requires a judgment call, that is not the queue's call to make — it is proof the blueprint under-specified the step. Escalate to Architect to fix the BP; do not let the queue/planner improvise a decision to fill the gap.** | Founder-ratified directive, 2026-07-18 (two-part: rule + separation-of-powers escalation). Existing partial statement ("Blueprint authority outranks chat") made explicit. Names a real tension: `services/build-queue-planner.js`'s `planBuildQueue` uses an AI model to turn backlog bullets into steps — exactly the kind of interpretation that must escalate to Architect on ambiguity, not silently resolve itself. | `docs/products/builderos/DEVIN_HANDOFF.md` non-negotiables; `services/build-queue-planner.js` (escalation path not yet wired — named gap, see §12) |
| D7 | **SENTRY periodically audits the SYSTEM, not just individual shipped features.** SO-002's Layer A/B gate already proves a single feature before it's called done; this adds a standing, recurring pass over the BuilderOS/factory system itself (queue health, escalation depth, doctrine drift) on a cadence, not only at ship-time per step. | Founder-ratified directive, 2026-07-18. Directly generalizes what caught the LifeOS gap below (D6/§12 row) and the D3 repeat-regression — both were found by a one-off manual audit; this makes that audit recurring instead of accidental. | **Not yet built** — cadence/scope undefined, needs Architect scoping |
| D8 | **Chair periodically audits the BPs themselves** — tighten/build gaps directly where it can, or clarify/escalate to Architect where a founder-level product call is needed. | Founder-ratified directive, 2026-07-18. | **Not yet built** — needs Architect scoping (what "tighten" authorizes Chair to do unilaterally vs. escalate) |
| D9 | **Chair proactively interviews the founder to ensure blueprint coverage for every product/idea he's ever raised** — not just the ones already formalized. Directly closes the exact failure mode found live: LifeOS (the founder's own stated #1 priority) has zero documented backlog because nobody was asked what belongs in it. | Founder-ratified directive, 2026-07-18, in direct response to the LifeOS empty-backlog finding (§12). | **Not yet built** — needs an actual interview/capture mechanism, not just a standing instruction |
| D10 | **Housekeeping during Railway redeploy waits.** A deploy-in-flight window (~1-2 min, observed repeatedly this session) is dead time for the system today. Pairs with D2: housekeeping work restricted to non-runtime files (docs/data-only, matching D2's `watchPatterns` skip list) can run in that window without triggering a second, competing redeploy. | Founder-ratified directive, 2026-07-18, generalizing D2's already-shipped skip-list mechanism. | **Not yet built** — needs a concrete task list (candidates: synopsis-index regen, SENTRY findings triage, postmortem writing, PRODUCT_HOME receipt cleanup) and a hook into the redeploy-wait window itself |

## 14. Change log

| Date | Change |
|------|--------|
| 2026-07-18 | §16 extended D7–D10 (SENTRY system audit cadence, Chair BP audit, Chair founder-interview for blueprint coverage, redeploy-wait housekeeping); §17 added (future direction: competing dual-instance BuilderOS, captured not built); §12 gained the LifeOS empty-backlog row |
| 2026-07-18 | §16 added: doctrine ratification of D1–D6 (blueprint reconciliation branch `devin/1784397434-builderos-blueprint-reconciliation`) |
| 2026-05-24 | Initial manifest: missions 0001–0030, full runtime map, 0030 tools |
| 2026-05-24 | TSOS 0029 documented on hot path |
| 2026-05-24 | Blueprint pack addenda synced (tool inventory, readiness, A-to-Z, goldmine, founder packet audit) |
| 2026-05-24 | Cold-coder 3-session deferred for hand-built BP; token spend section in CURRENT_BP_GAPS |

**Next agent:** When adding mission 0031+, append a row to §4, §6, §14 and update `BLUEPRINT_PACK_INDEX_V1.md`. When ratifying a new self-observed doctrine pattern, append a row to §16 with real evidence (a commit SHA or a live-observed failure), not a proposal.
