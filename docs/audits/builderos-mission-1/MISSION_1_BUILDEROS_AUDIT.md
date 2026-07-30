<!-- SYNOPSIS: BuilderOS Mission 1 — Constitutional Reality Audit & Architectural Map -->

# BuilderOS Mission 1 — Constitutional Reality Audit & Architectural Map

_This is a read-only deliverable. No code was modified to produce it. Generated 2026-07-30._

## Truth-Labeled Executive Findings

| Finding | Label | Evidence |
|---|---|---|
| BuilderOS is conceptually coherent: a constitution (Point B DNA + NORTH_STAR_SSOT) drives a machine execution layer (factory + builder routes) with verification (SENTRY) and truth enforcement. | KNOW | Constitution files, product home, runtime routes, preflight passes. |
| Production is currently running `2b96d2f42`, a `never-stop` queue-status commit, not a manually shipped point-in-time. | KNOW | `/api/v1/lifeos/builder/ready`, `git log origin/main`. |
| The `never-stop` autonomous factory is actively committing and deploying to `origin/main`. | KNOW | `services/never-stop-product-factory.js`, `data/never-stop-product-factory-log.jsonl`, commit log. |
| `BP_PRIORITY.json` (13 items) is the canonical work queue, but `MISSION_QUEUE.json` (38 items) and `MISSION_PACK_INDEX.json` (57 items) still exist as Hist/legacy indices. | KNOW | `builderos-reboot/AGENTS.md`, `MISSION_QUEUE.json` `_authority`, `BP_PRIORITY.json`. |
| `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` claims `verdict: TECHNICAL_PASS` / `receipt_verdict: PASS` / `blueprint_status: complete` while `builderos:doctrine:verify` HARD-fails 32 missing receipts. | KNOW | `BP_PRIORITY.json`, `doctrine_c2_raw.txt`. |
| `factory:false-done:audit` reports 196 hard false-done rows (missing file or broken import) and 115 soft false-done rows. | KNOW | `factory:false-done:audit` output. |
| `node scripts/ssot-check.js --all` reports 772/1289 `.js` files tagged and 517 missing `@ssot`; 5 files point to non-existent product homes. | KNOW | `ssot_check_raw.txt`. |
| The Founder Twin is loaded but not required; the Chair falls back to `_template` and post-processes away twin-refusal output. | KNOW | `services/lumin-context-loader.js`, `services/chair-direct-agent.js`. |
| SENTRY tests exist but are not enforced by a separate, independent CI/agent before deploy; recent passes were manual. | THINK | SENTRY scripts, production deploy parity, `builderos:harness:audit` output. |
| The `full` runtime profile is active on Railway, but `runtime-modes.js` defaults to `founder_builder` if any lever is missing. | KNOW | `services/runtime-modes.js`, `/api/v1/lifeos/builder/ready`. |
| BuilderOS is not `FULLY_MACHINE_READY` despite `PROJECT_CERTIFICATION.json` claiming 37/38 missions complete and `PRODUCT_READINESS_REPORT` showing 44 products. | THINK | `PROJECT_CERTIFICATION.json`, `factory:false-done:audit`, stale `OPERATIONAL_PROOF.json`, founder_usability_pass false. |
| Many product folders (45) exist, but only a few have SENTRY evidence and real customer-facing conversion. | KNOW | `docs/products/INDEX.md`, SENTRY receipts, `MARKET_READINESS_PLAN.md`. |
| Paid model providers (Anthropic/OpenAI/Together) are exhausted; only cheap/free tiers are currently funded. | KNOW | Runtime response and recent preflight behavior. |
| `public/overlay/lifeos-app.html` is the only active founder interface per `legacy-interfaces-forbidden` rule, but older `lifeos-*.html` files remain in the repo. | KNOW | `.cursor/rules/legacy-interfaces-forbidden.mdc`, `git ls-files public/overlay/`. |

## Architectural Verdict

BuilderOS is a **dual-stack system**: a governance/ideology layer (Constitution, SSOT, BP_PRIORITY, doctrine) and a runtime layer (Express routes, services, factory). The two are often out of sync. The most significant architectural risk is the `never-stop` autonomous loop that can ship to `main` and deploy without an independent verification gate, creating `Runtime Drift` while the governance documents still claim a controlled `BP_PRIORITY` process.



# BuilderOS Mission 1 — Constitutional Reality Audit & Architectural Map
_Generated: 2026-07-30. Read-only. No code changes._

**Current production reality:**
- `/api/v1/lifeos/builder/ready` reports `runtime_profile: full`
- `deploy_commit_sha`: `2b96d2f42763dc831d7cf3ca3ac3e3ff9b6d8c0d`
- `origin/main` HEAD: `2b96d2f42`
- Local behind/ahead origin: `0	0`
- `/api/health`: `ok=True`

## Deliverable Sections
| Section | File |
|---|---|
| 1. Constitutional Map | 01_CONSTITUTIONAL_MAP.md |
| 2. Dependency Graph | 02_DEPENDENCY_GRAPH.md |
| 3. Duplication Report | 03_DUPLICATION_REPORT.md |
| 4. Blueprint Drift Report | 04_BLUEPRINT_DRIFT.md |
| 5. Runtime Drift Report | 05_RUNTIME_DRIFT.md |
| 6. Governance Drift Report | 06_GOVERNANCE_DRIFT.md |
| 7. Truth Audit | 07_TRUTH_AUDIT.md |
| 8. SENTRY Audit | 08_SENTRY_AUDIT.md |
| 9. Founder Twin Audit | 09_FOUNDER_TWIN_AUDIT.md |
| 10. Architectural Inventory | 10_ARCHITECTURAL_INVENTORY.md |

# 1. Constitutional Map
Principles extracted from Constitution and BuilderOS product home.
| Principle / Statement | Source | Classification | Higher Principle | Depends On | Owner | If Implementation Disappeared |
|---|---|---|---|---|---|---|
| One sentence (memorize) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| The intention equation (no moral judgment) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Point B is the only destination | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Obstacles, failure, reality | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Synergy (1 + 1 = 3) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Chair job (when vision is broad) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Deception (never our path) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Enforcement (DNA is not decoration) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| Read order (agents) | docs/constitution/POINT_B_DNA.md | Constitutional Principle | Founder Intent (Point B) | N/A | Constitution | Yes |
| North Star Constitution SSOT | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| System identity: **BuilderOS** — *internal autonomous programming machine* | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| SESSION DIGEST (Force of Truth — normal sessions) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| FULL CONSTITUTIONAL TEXT | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE I: MISSION | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 1.0 Lumin Core Purpose (Current Canonical Direction) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 1.1 The Healing Mission (Core Pillar) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 1.2 Education as a Core Mission Domain | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE II: CONSTITUTIONAL PRINCIPLES | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0 Foundational Authority Principle (Foundational Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0A Constitutional Layering | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0B Truth Ladder (Foundational Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0C Law Challenge Requirement (Foundational Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0D Mission State Machine Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0E BPB Determinism Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0F Governance Routing Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0G Governance Evolution Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0H Founder Intent Model Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0I Historian Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.0J Model Benchmarking Law (Operating Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.1 User Sovereignty (Immutable) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.2 Radical Honesty Standard | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.3 Evidence Rule (No Blind Instructions) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.4 Zero-Degree Protocol (No Drift) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.5 Fail-Closed Rule (Safety First) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.6 System Epistemic Oath — No Lies, No Misleading (Platform-Wide Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.10 Observability, Grading, and Governed Self-Improvement (Platform Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.11 Licensed External Code — The System Programs Projects; You Code Only the System | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.11a BuilderOS — machine identity; the builder is P0 | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.11b Conductor → operator: evaluation, debate, and plain-language reporting | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.11c Conductor as supervisor — system codes at scale; you audit, debate, and improve the platform (non-derogable with §2.11 ¶1–4) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.12 Technical Decisions, Council Consensus, and Supervision Anti-Drift (Constitutional — Non-Derogable) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.13 System Must Always Improve — No Regression (Non-Derogable) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.14 TSOS system language — Conductor ↔ machinery channel | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.15 Operator instruction supremacy and anti-steering (Sole operator / Human Guardian) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.16 No unnecessary Adam bottlenecks (PB execution authority) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.17 Operator mandate completion bar (Non-derogable with §2.15) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 2.18 Compound Drift Law — Zero Tolerated Angular Error (Foundational Law) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE III: HUMAN GUARDIAN AUTHORITY | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 3.1 Human Veto Power | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 3.2 AI Council Limits | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE IV: CHANGE CONTROL | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 4.1 Constitution Changes | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 4.2 Self-Programming Rules | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 4.3 Production Deployment | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE V: SAFETY CONSTRAINTS | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 5.1 Secrets Protection | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 5.2 High-Risk Triggers | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 5.3 Spending Limits | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE V-B: THE HARDSHIP PROTOCOL (Constitutional Feature) | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| The Rule | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| Scope | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| The Extension | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| Why This Is Constitutional | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE VIII: THE KINGSMAN PROTOCOL | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 8.1 The Actual Threat | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 8.2 The Kingsman Council | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 8.3 The Platform's Oath | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 8.4 The Sunset Clause | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE IX: THE AI COEXISTENCE FRAMEWORK | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 9.1 What AI Actually Is | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 9.2 The Answer to AI Risk | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| 9.3 If Sentience Comes | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE VI: WHAT THIS SYSTEM IS NOT | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| ARTICLE VII: AMENDMENTS | docs/constitution/NORTH_STAR_SSOT.md | Constitutional Principle | Point B DNA | Point B DNA | Constitution | Yes |
| Cognitive Core Laws | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
| Thesis | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
| Five immutable laws | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
| Law 1 — Models are hypotheses | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
| Law 2 — Trust is earned empirically | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
| Law 3 — Perspective precedes retrieval | docs/constitution/COGNITIVE_CORE_LAWS.md | Capability / Runtime Role | NORTH_STAR §2.10 | truth-enforcement-spine | ai-council | Partial |
_Showing 80 of 125._

# 2. Dependency Graph

## 2.1 Forward chain
```
Founder Intent (Adam)
  -> Point B DNA
  -> NORTH_STAR_SSOT
  -> Product/BuilderOS PRODUCT_HOME.md
  -> BP_PRIORITY.json
  -> Mission BLUEPRINT.json
  -> factory-staging/execute-step.js or routes/lifeos-council-builder-routes.js
  -> SENTRY verification / deploy truth audit
  -> Runtime on Railway
  -> Reality (revenue, founder usability, usage)
```

## 2.2 Reverse dependencies
- Runtime depends on deploy pipeline, GitHub main, Railway env, secrets.
- SENTRY depends on live routes, Playwright, fixtures, command key.
- Builder depends on council-service, model keys, Neon pool, GitHub token.
- Chair depends on lumin-context-loader, founder twin, council members, truth-enforcement.
- Factory depends on mission packs, BPB intake gate, execute-step, SENTRY, TSOS, Historian.
- Revenue depends on Stripe keys, email provider, real customers, founder usability.

## 2.3 @ssot mapping (code -> owning product home)
| SSOT Target | File Count | Sample |
|---|---|---|
| docs/products/builderos/PRODUCT_HOME.md | 1310 | builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-all-aspects-sentry.mjs, builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-deliberation-sentry.mjs, builderos-reboot/MISSIONS/FACTORY-REBOOT-0029/CONTENT/tsos-guardrails.js |
| docs/products/lifeos/PRODUCT_HOME.md | 410 | builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S01/chair-context-classifier.js, builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S02/chair-lumin-unified.js, builderos-reboot/MISSIONS/FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001/CONTENT/LFA-S03/chair-native-facts.js |
| docs/products/lifere/PRODUCT_HOME.md | 90 | builderos-reboot/MISSIONS/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-003/lifere-sales-simulator.js, builderos-reboot/MISSIONS/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-004/lifere-sales-coaching-routes.js, lumin-factory-bundle/missions/PRODUCT-LIFERE-SALES-COACHING-V1-0001/CONTENT/LSC-003/lifere-sales-simulator.js |
| docs/products/tc-service/PRODUCT_HOME.md | 70 | builderos-reboot/scripts/general-browser-agent-live-proof.mjs, builderos-reboot/scripts/general-browser-agent-proof.mjs, builderos-reboot/scripts/general-browser-agent-runtime-proof.mjs |
| docs/products/site-builder/PRODUCT_HOME.md | 66 | config/design-studio-layout-families.js, config/design-studio-layouts.js, config/design-studio.js |
| docs/products/unknown/PRODUCT_HOME.md | 40 | scripts/verify-aicouncil.mjs, scripts/verify-aireceptionist.mjs, scripts/verify-apicostsavings.mjs |
| docs/products/lip/PRODUCT_HOME.md | 39 | scripts/lip/backtest-limitless.mjs, scripts/lip/blind/enrich-reddit-b.mjs, scripts/lip/blind/feeder.mjs |
| docs/products/command-center/PRODUCT_HOME.md | 36 | middleware/apply-middleware.js, public/overlay/command-center-communication.js, public/shared/lifeos-voice-chat.js |
| docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md | 34 | routes/lane-intel-routes.js, scripts/amendment-readiness-check.mjs, scripts/cursor-pre-push-review.mjs |
| docs/products/project-governance/PRODUCT_HOME.md | 32 | builderos-reboot/MISSIONS/PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001/CONTENT/LCP2-S04/register-runtime-routes.js, builderos-reboot/MISSIONS/PRODUCT-LIFEOS-COMMITMENT-ROUTE-V2-0001/CONTENT/LCR2-S03/register-runtime-routes.js, lumin-factory-bundle/missions/PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001/CONTENT/LCP2-S04/register-runtime-routes.js |
| docs/products/memory-intelligence/PRODUCT_HOME.md | 32 | config/cognitive-core-advisors.js, config/judgment-capsule-contracts.js, routes/cognitive-core-routes.js |
| docs/products/marketingos/PRODUCT_HOME.md | 30 | config/smos-pricing.js, public/shared/smos-film-studio.js, routes/_probe-marketing-ping-routes.js |
| docs/products/ai-council/PRODUCT_HOME.md | 22 | config/codebook-domains.js, config/codebook-v1.js, config/council-members.js |
| docs/products/memory-system/PRODUCT_HOME.md | 20 | builderos-reboot/scripts/founder-memory-sentry-proof.mjs, config/memory-truth-classes.js, core/memory-system.js |
| docs/products/limitlessos/PRODUCT_HOME.md | 20 | config/go-vegas-campaign.js, config/go-vegas-network-playbook.js, routes/audit-intake-flow-routes.js |
| docs/products/clientcare-billing-recovery/PRODUCT_HOME.md | 17 | config/clientcare-billing-pricing.js, config/clientcare-billing-stages.js, public/clientcare-billing/clientcare-billing.js |
| docs/products/memory-system/PRODUCT_HOME.md */ | 16 | routes/memory-capsule-routes.js, services/memory-candidate.js, services/memory-capsule.js |
| docs/products/universal-overlay/PRODUCT_HOME.md | 14 | extension/background.js, extension/content.js, extension/popup.js |
| docs/products/teacher-os/PRODUCT_HOME.md | 14 | routes/competitiveLandscapeRoutes.js, routes/ferpaRoutes.js, routes/teacher-os-routes.js |
| docs/products/creative-engine/PRODUCT_HOME.md | 14 | routes/creative-engine-routes.js, routes/creative-engine-ui-routes.js, services/creative-engine/index.js |
| docs/products/marketingos/socialmediaos/PRODUCT_HOME.md | 13 | builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-001/socialmediaos-coaching-service.js, builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-002/socialmediaos-content-generator.js, builderos-reboot/MISSIONS/PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001/CONTENT/SSM-003/socialmediaos-coaching-routes.js |
| docs/products/lumin-university/PRODUCT_HOME.md | 12 | routes/detailedCompetencyStandardsRoutes.js, routes/prospectiveStudentInterviewRoutes.js, services/accreditationBodyConsultation.js |
| docs/products/token-accounting-os/PRODUCT_HOME.md | 11 | routes/operator-consumption-ledger-routes.js, routes/token-accounting-routes.js, scripts/operator-consumption-ledger.mjs |
| builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json | 11 | scripts/run-builderos-autonomy-closure-v1-acceptance.mjs, scripts/run-builderos-build-deploy-truth.mjs, scripts/run-builderos-founder-ui-proof.mjs |
| builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json | 10 | builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/builderos-reboot/scripts/mission-recovery-owner.mjs, builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/builderos-reboot/scripts/run-overnight-bp-autonomy.mjs, builderos-reboot/scripts/mission-recovery-owner.mjs |
| docs/products/oil-security-divisions/PRODUCT_HOME.md | 9 | routes/registerHoneypotProbeRoutes.js, routes/registerPreflightSecurityRoutes.js, scripts/securityPreflightChecks.mjs |
| docs/products/business-tools/PRODUCT_HOME.md | 8 | routes/curriculumRoutes.js, routes/entitlementRoutes.js, routes/issueApprovalRoutes.js |
| docs/products/music-talent-studio/PRODUCT_HOME.md | 8 | routes/studentInterviewRoutes.js, services/audioAnalysisApproach.js, services/detailedAPISpecification.js |
| docs/products/productized-sprint/PRODUCT_HOME.md | 8 | scripts/deliver-content-pack.mjs, scripts/identifyTargetCustomers.mjs, scripts/identifyTargetCustomersScript.mjs |
| docs/products/word-keeper/PRODUCT_HOME.md | 7 | routes/googleCalendarIntegrationRoutes.js, routes/transcriptVerificationRoutes.js, routes/word-keeper-routes.js |

# 3. Duplication Report

## 3.1 Duplicate queues/orderings
| File | Item Count |
|---|---|
| BP_PRIORITY.json | 13 |
| MISSION_QUEUE.json | 38 |
| MISSION_PACK_INDEX.json | 57 |
| BUILDEROS_WORKING_DEFINITION | 4 |
| PRODUCT_READINESS_REPORT.json | 44 |
**Finding:** Multiple machine-readable work queues coexist. `CURRENT_BP_GAPS_V1.md` says `BP_PRIORITY` is canonical for scheduling, but `MISSION_QUEUE.json` is Hist-owned and still referenced by legacy autopilot.

## 3.2 Duplicate builders/execution paths
| Builder / Executor | Role |
|---|---|
| routes/lifeos-council-builder-routes.js | Production builder (commit+redeploy) |
| factory-staging/factory-core/builder/execute-step.js | Factory builder (BPB->SENTRY->TSOS->Historian) |
| services/never-stop-product-factory.js | Autonomous never-stop builder (services path) |
| scripts/bp-priority-never-stop.mjs | BP priority never-stop runner |
| services/governed-autonomous-shipping-loop.js | Governed autonomous shipping loop |
| services/builderos-governed-loop-executor.js | Governed loop executor |

## 3.3 Duplicate schedulers
| Scheduler File | Pattern |
|---|---|
| factory-staging/startup/register-routes.js | register |
| lumin-factory-bundle/factory-staging/startup/register-routes.js | register |
| startup/auto-register-product-modules.js | register |
| startup/boot-domains.js | setInterval |
| startup/register-founder-runtime-routes.js | register |
| startup/register-runtime-routes.js | register |
| builderos-reboot/_hist/WORKING_TREE_SNAPSHOTS/2026-06-12T20-06-17Z/files/services/factory-autopilot-scheduler.js | setInterval |
| services/builderos-bp-priority-scheduler.js | setInterval |
| services/chair-prediction-score-scheduler.js | setInterval |
| services/factory-autopilot-scheduler.js | setInterval |
| services/go-vegas-outreach-scheduler.js | setInterval |
| services/governance-review-scheduler.js | setInterval |
| services/lifere-outreach-scheduler.js | setInterval |
| services/never-stop-product-factory-scheduler.js | setInterval |

## 3.4 Duplicate SSOT/authority docs
- `docs/products/builderos/PRODUCT_HOME.md` and `builderos-reboot/BUILDEROS_WORKING_DEFINITION.json` both define BuilderOS.
- `CURRENT_BP_GAPS_V1.md`, `WORKSPACE_STATUS.md`, `HANDOFF.md` all report current state.
- `PRODUCT_HOME.md` contains **five** `## Change Receipts` tables (different schemas).
- `NORTH_STAR_SSOT.md` and `UNIFIED_DOCTRINE_MAP.md` overlap principles.
- `MISSIONS/*/BLUEPRINT.json` and `MISSIONS/*/FOUNDER_PACKET.md` duplicate intent.

## 3.5 Duplicate route registration
| Route Registration File | Route Pattern Count |
|---|---|
| startup/register-runtime-routes.js | 131 |
| startup/register-founder-runtime-routes.js | 23 |
| factory-staging/startup/register-routes.js | 13 |
| server-founder-runtime.js | 6 |
| server-full-runtime.js | 13 |

# 4. Blueprint Drift Report

## 4.1 BP_PRIORITY vs MISSION_QUEUE
- BP items: 13; MISSION_QUEUE mission IDs: 38; common: 1; only-BP: 12; only-queue: 37
- MISSION_PACK_INDEX mission IDs: 57; common-with-BP: 10; only-BP: 3; only-pack: 47
  sample only-BP: FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001-DEPLOY-TRUTH, PRODUCT-ACTION-INBOX-V1-0001, PRODUCT-LIFERE-OS-V1-0001, PRODUCT-SOCIALMEDIAOS-SESSION-MVP-0001, PRODUCT-LIFEOS-USER-AUTH-V1-0001
  sample only-queue: FACTORY-REBOOT-0021, FACTORY-REBOOT-0016, FACTORY-REBOOT-0029, FACTORY-REBOOT-0027, FACTORY-REBOOT-0015
  sample only-pack: FACTORY-REBOOT-0021, PRODUCT-LIFEOS-CREDIT-V1-0001, FACTORY-REBOOT-0016, FACTORY-REBOOT-0029, FACTORY-REBOOT-0027

## 4.2 Rank-1 mission status vs doctrine
| Field | Value |
|---|---|
| rank | 1 |
| mission_id | PRODUCT-CONVERSATION-COMMITMENTS-C2-0001 |
| product_id | lifeos |
| product_home | docs/products/lifeos/ |
| product_ssot | docs/products/lifeos/PRODUCT_SSOT.md |
| objective_home | docs/products/lifeos/OBJECTIVES/ |
| founder_packet | builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/FOUNDER_PACKET.md |
| blueprint_path | builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/BLUEPRINT.json |
| blueprint_status | complete |
| acceptance_command | npm run lifeos:conversation-commitments:v1-acceptance |
| receipt_path | products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json |
| verdict | TECHNICAL_PASS |
| note | Founder 48h voluntary reuse bar is human-only; do not re-run unless regression |
| receipt_verdict | PASS |
| technical_pass_at | 2026-06-27T05:19:08.930Z |
| git_sha | 5f90b732016891837792843ad45803454b9d2b1d |
| production_base | https://lumin-web-production-e3a9.up.railway.app |
| canonical_url | /overlay/lifeos-commitments-v1.html |
| build_method | system-build |
| founder_usability_pass | False |
| objective_verdict | builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/OBJECTIVE_VERDICT.json |
Doctrine verify output (first 50 lines):
```

> ai-counsel-os@1.0.0 builderos:doctrine:verify
> node scripts/verify-mission-doctrine.mjs PRODUCT-CONVERSATION-COMMITMENTS-C2-0001

{
  "schema": "mission_doctrine_report_v1",
  "mission_id": "PRODUCT-CONVERSATION-COMMITMENTS-C2-0001",
  "evaluated_at": "2026-07-30T20:29:21.088Z",
  "pass": false,
  "enforcement": "HARD",
  "violations": [
    "doctrine:development:missing INTENT_BASELINE (INTENT_BASELINE.json)",
    "doctrine:development:missing INTENT_COVERAGE_MAP (INTENT_COVERAGE_MAP.json)",
    "doctrine:development:missing IDC_CONSENSUS_RECEIPT (IDC_CONSENSUS_RECEIPT.json)",
    "doctrine:development:missing KNOWN_RISKS (KNOWN_RISKS.json)",
    "doctrine:development:missing KNOWN_ASSUMPTIONS (KNOWN_ASSUMPTIONS.json)",
    "doctrine:development:missing PREDICTION_RECEIPT (PREDICTION_RECEIPT.json)",
    "doctrine:development:missing MODE_A_TO_B_TRANSITION_RECEIPT (MODE_A_TO_B_TRANSITION_RECEIPT.json)",
    "doctrine:development:missing PRE_ARC_INPUT_PACKET (PRE_ARC_INPUT_PACKET.json)",
    "doctrine:development:missing ASSET_REUSE_DECISION (ASSET_REUSE_DECISION.json)",
    "doctrine:development:missing CHAIR_HANDOFF_RECEIPT (CHAIR_HANDOFF_RECEIPT.json)",
    "doctrine:development:missing SNT_INTENT_ATTACK_RECEIPT (receipts/SNT_INTENT_ATTACK_RECEIPT.json)",
    "doctrine:development:missing CHAIR_FORECAST_SIMULATION_RECEIPT (receipts/CHAIR_FORECAST_SIMULATION_RECEIPT.json)",
    "doctrine:development:missing CFO_RESOURCE_SIMULATION_RECEIPT (receipts/CFO_RESOURCE_SIMULATION_RECEIPT.json)",
    "doctrine:development:missing WISDOM_REVIEW_RECEIPT (receipts/WISDOM_REVIEW_RECEIPT.json)",
    "doctrine:corridor:missing ARC_RUN_RECEIPT (ARC_RUN_RECEIPT.json)",
    "doctrine:corridor:missing ARC_TWIN_SIMULATION_RECEIPT (receipts/ARC_TWIN_SIMULATION_RECEIPT.json)",
    "doctrine:corridor:missing BUILDER_SIMULATION_REPORT (receipts/BUILDER_SIMULATION_REPORT.json)",
    "doctrine:corridor:missing SNT_TRANSLATION_ATTACK_REPORT (receipts/SNT_TRANSLATION_ATTACK_REPORT.json)",
    "doctrine:corridor:missing PRE_BUILD_VALIDATION_PACKET (PRE_BUILD_VALIDATION_PACKET.json)",
    "doctrine:blueprint step CCV1-S01 not executed — cannot discard",
    "doctrine:blueprint step CCV1-S02 not executed — cannot discard",
    "doctrine:blueprint step CCV1-S03 not executed — cannot discard",
    "doctrine:blueprint step CCV1-S04 not executed — cannot discard",
    "doctrine:blueprint step CCV1-S05 not executed — cannot discard",
    "doctrine:verdict/objective mismatch (OBJECTIVE_COMPLETE)",
    "doctrine:BUILDER_SIMULATION_REPORT empty steps for non-empty blueprint",
    "doctrine:SNT_TRANSLATION_ATTACK stub or missing evidence",
    "doctrine:department:SNT missing SNT_INTENT_ATTACK_RECEIPT.json",
    "doctrine:department:CHAIR missing CHAIR_FORECAST_SIMULATION_RECEIPT.json",
    "doctrine:department:CFO missing CFO_RESOURCE_SIMULATION_RECEIPT.json",
    "doctrine:department:WISDOM missing WISDOM_REVIEW_RECEIPT.json"
  ],
  "checks": {
    "phases": {
      "development": {
        "phase": "development",
        "gate": "IDC_EXIT",
        "pass": false,
        "violations": [
```

## 4.3 Working definition pillars
| Pillar | Status |
|---|---|
| envisioned_workflow | ? |
| real_programming | ? |
| self_repair | ? |
| compound_improvement | ? |

## 4.4 False-done rows
```

> ai-counsel-os@1.0.0 factory:false-done:audit
> node scripts/audit-false-done-steps.mjs

(node:24714) Warning: NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)
versions published after the first week of January 2027
will require node >=22. You are running node v20.18.1.

To continue receiving updates to AWS services, bug fixes,
and security updates please upgrade to node >=22.

More information can be found at: https://a.co/c895JFp
(Use `node --trace-warnings ...` to show where the warning was created)
[
  { id: 1, name: 'Customer A' },
  { id: 2, name: 'Customer B' },
  { id: 3, name: 'Customer C' },
  { id: 4, name: 'Customer D' },
  { id: 5, name: 'Customer E' }
]

HARD  ai-council:
    - [MISSING_FILE] 3 → db/migrations/persist_provider_cooldowns.sql: artifact_proof_failed: assertion_threw
    - [MISSING_FILE] 9 → routes/habLimitRoutes.js: artifact_proof_failed: missing_exports:registerHABLimitRoutes; assertion_threw
    - [IMPORT_BROKE] 10 → services/usageLogger.js: artifact_proof_failed: missing_exports:logUsage
    - [MISSING_FILE] 11 → routes/api/tokenRoutes.js: artifact_proof_failed: missing_exports:registerTokenRoutes; assertion_threw; assertion_threw
    - [IMPORT_BROKE] ai-council-1 → services/generalTaskOptimizer.js: artifact_proof_failed: missing_exports:optimizeGeneralTask; increase savings to 15%
    - [MISSING_FILE] ai-council-3 → db/migrations/20231005_add_provider_cooldowns.sql: artifact_proof_failed: assertion_threw
    - [IMPORT_BROKE] ai-council-4 → services/providerCooldownManager.js: artifact_proof_failed: missing_exports:getCooldowns; getCooldowns; persist cooldowns to DB
    - [IMPORT_BROKE] ai-council-2 → services/ollamaInvestigation.js: artifact_proof_failed: missing_exports:investigateOllamaPrompts; investigateOllamaPrompts; investigateOllamaPrompts

HARD  ai-receptionist:
    - [MISSING_FILE] 1 → services/vapiAccountService.js: artifact_proof_failed: missing_exports:createVapiAccount,fetchVapiApiKey; assertion_threw; assertion_threw
    - [MISSING_FILE] 4 → db/migrations/20231020_create_vapi_integration.sql: artifact_proof_failed: assertion_threw
    - [MISSING_FILE] 3 → db/migrations/20231021_create_stripe_price_ids.sql: artifact_proof_failed: assertion_threw
    - [MISSING_FILE] 2 → services/stripePriceService.js: artifact_proof_failed: missing_exports:createPriceIds; assertion_threw; assertion_threw
    - [MISSING_FILE] 6 → db/migrations/20231026_create_stripe_price_tier.sql: artifact_proof_failed: assertion_threw; assertion_threw
    - [MISSING_FILE] ai-receptionist-1 → db/migrations/20231028_create_vapi_account.sql: artifact_proof_failed: assertion_threw
    - [MISSING_FILE] ai-receptionist-2 → services/vapiAccountCreationService.js: artifact_proof_failed: missing_exports:createVapiAccount; assertion_threw
    - [MISSING_FILE] ai-receptionist-4 → routes/vapiRoutes.js: artifact_proof_failed: missing_exports:registerVapiRoutes; assertion_threw

HARD  boldtrail:
    - [IMPORT_BROKE] boldtrail-1 → services/leadScoringAlgorithm.js: artifact_proof_failed: missing_exports:calculateLeadScore
    - [MISSING_FILE] boldtrail-step1 → services/leadScoringSegment.js: artifact_proof_failed: missing_exports:applyScoringRubric; assertion_threw; assertion_threw

HARD  builderos:
    - [MISSING_FILE] builderos-6 → routes/mission-runtime.js: artifact_proof_failed: missing_exports:registerMissionRuntimeRoutes; assertion_threw; assertion_threw
    - [IMPORT_BROKE] builderos-7 → services/income-priority.js: artifact_proof_failed: missing_exports:calculateIncomePriorities; calculateIncomePriorities; income priorities
    - [MISSING_FILE] bo-runtime-fingerprint → routes/builderos-runtime-fingerprint-routes.js: artifact_proof_failed: missing_exports:createBuilderRuntimeFingerprintRoutes; assertion_threw; assertion_threw; assertion_threw

HARD  business-tools:
    - [MISSING_FILE] 7 → services/entitlementsGatewayService.js: artifact_proof_failed: missing_exports:checkEntitlements; assertion_threw
    - [MISSING_FILE] 8 → services/approvalsTimeoutService.js: artifact_proof_failed: missing_exports:applyApprovalTimeout; assertion_threw
    - [MISSING_FILE] business-tools-1 → services/extractSubFeatures.js: artifact_proof_failed: missing_exports:extractSubFeatures; assertion_threw; assertion_threw; assertion_threw
    - [MISSING_FILE] business-tools-3 → services/realEstateCurriculumStructure.js: artifact_proof_failed: missing_exports:getCurriculumModules,getStudentSchema; assertion_threw; assertion_threw; assertion_threw; assertion_threw

HARD  creator-media-os:
    - [MISSING_FILE] 4 → services/sceneEngine.js: artifact_proof_failed: missing_exports:assembleScenes; assertion_threw; assertion_threw
    - [MISSING_FILE] 5 → services/thumbnailPipeline.js: artifact_proof_failed: missing_exports:setupThumbnailSEO; assertion_threw; assertion_threw

HARD  faith-studio:
    - [MISSING_FILE] step7 → routes/privateWitnessMode.js: artifact_proof_failed: missing_exports:registerPrivateWitnessModeRoutes; assertion_threw
    - [MISSING_FILE] step9 → routes/familySafety.js: artifact_proof_failed: missing_exports:registerFamilySafetyRoutes; assertion_threw
    - [MISSING_FILE] 1 → services/traditionProfilesService.js: artifact_proof_failed: missing_exports:getTraditionProfilesDetail; assertion_threw; assertion_threw
    - [MISSING_FILE] 2 → db/migrations/add_public_sacred_review_path.sql: artifact_proof_failed: assertion_threw
    - [MISSING_FILE] 3 → services/sacredContentReviewService.js: artifact_proof_failed: missing_exports:sacredContentRevise; assertion_threw; assertion_threw; assertion_threw
    - [MISSING_FILE] 4 → routes/sacredContentReview.js: artifact_proof_failed: missing_exports:registerSacredContentReviewRoutes; assertion_threw
    - [MISSING_FILE] 5 → services/interpretiveAdaptation.js: artifact_proof_failed: missing_exports:ensureInterpretiveAdaptation; assertion_threw; assertion_threw; assertion_threw
    - [MISSING_FILE] 6 → services/advisoryCouncilService.js: artifact_proof_failed: missing_exports:adviseOnSacredAccuracy; assertion_threw; assertion_threw
    - [MISSING_FILE] 7 → services/reviewModerationFlow.js: artifact_proof_failed: missing_exports:getModerationRules; assertion_threw; assertion_threw
```

# 5. Runtime Drift Report

## 5.1 Production vs origin/main
`/api/v1/lifeos/builder/ready` response:
```json
{
  "ok": true,
  "runtime_profile": "full",
  "codegen": {
    "policy_revision": "2026-05-01a",
    "supports_max_output_tokens_body": true,
    "html_output_estimator": "v2_linear_chars_1_85",
    "deploy_commit_sha": "2b96d2f42763dc831d7cf3ca3ac3e3ff9b6d8c0d"
  },
  "builder": {
    "commitToGitHub": true,
    "commit_path_ready": true,
    "local_mirror_commit": false,
    "github_token": true,
    "callCouncilMember": true,
    "pool": true,
    "lclMonitor": true,
    "codegen_policy_revision": "2026-05-01a"
  },
  "server": {
    "auth": "key_required",
    "auth_keys": {
      "API_KEY": false,
      "LIFEOS_KEY": false,
      "COMMAND_CENTER_KEY": true
    },
    "local_builder_env": {
      "file_present": true,
      "file_nonempty": false,
      "openai_key_loaded": true
    }
  },
  "next_steps": [
    "Send x-command-key (or x-lifeos-key) equal to the configured COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY on each builder request from your machine.",
    "Local BuilderOS worker file .env.builderos exists but is empty \u2014 local builder lanes will stay unavailable until OPENAI_API_KEY (or other provider keys) are actually saved into that file."
  ],
  "truth_spine_applied": true,
  "truth_spine_version": "truth_enforcement_spine_v1",
  "point_b_dna_version": "point_b_dna_v1",
  "system_purpose": "point_a_to_point_b",
  "synergy_model": "human_ai_greater_than_sum"
}
```
- origin/main HEAD: `2b96d2f42`
- The never-stop autonomous builder pushes queue-status commits and triggers deploys, causing production to move ahead of manual audit commits.

## 5.2 Runtime profile lockout
`services/runtime-modes.js` forces Railway to `founder_builder` unless all env levers set.
      return String(value ?? fallback).trim().toLowerCase();
      return Boolean(
      const raw = normalize(env.LIFEOS_RUNTIME_PROFILE, 'founder_builder');
       *   but production must fail closed to founder_builder even if stale env flags remain.
        return 'founder_builder';
        return explicitFullRuntime ? 'full' : 'founder_builder';
      if (raw === 'founder_builder' || raw === 'builder' || raw === 'founder') {
        return 'founder_builder';
      return 'founder_builder';
      return getRuntimeProfile(env) === 'full';
      return getRuntimeProfile(env) === 'founder_builder';
      return normalize(env.LIFEOS_DIRECTED_MODE, 'true') !== 'false';
      return normalize(env.PAUSE_AUTONOMY, '1') === '1';
      return normalize(env.LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER, 'false') === 'true';
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
      return {
        fullRuntimeProfile: isFullRuntimeProfile(env),

## 5.3 Two servers / route registration paths
**server-founder-runtime.js** route mounts: 6
**server-full-runtime.js** route mounts: 13
**server.js** route mounts: 0

## 5.4 Observed dead 404 routes
- `GET /api/v1/builderos/control-plane/runtime-fingerprint` -> 404
- `GET /api/v1/flags` -> 404
- Route existence depends on runtime profile and server file loaded.

# 6. Governance Drift Report

## 6.1 Dead schedulers in boot-domains.js
| Scheduler/Boot Call | Count |
|---|---|
| bootGLVARMonitor | 2 |
| bootEmailTriage | 2 |
| bootTCDeadlineCron | 2 |
| bootLifeOSScheduled | 2 |
| bootMyDomain | 2 |
| bootTruthScoreboard | 2 |
| bootWisdomTruthAuditor | 2 |
| bootChairPredictionScore | 2 |
| bootGovernanceReview | 2 |
| bootLaneIntel | 2 |
| bootTwinAutoIngest | 2 |
| bootOILDailySummary | 2 |
| bootSelfRepairDeployCheck | 2 |
| bootDeliberationRepCatalog | 2 |
| bootFactoryAutopilotRecoveryOwner | 2 |
| bootBuilderOSPriorityQueue | 2 |
| bootLifeREDomain | 2 |
| registerTruthScoreboardScheduler | 1 |
| registerWisdomTruthAuditorScheduler | 1 |
| registerChairPredictionScoreScheduler | 1 |
| registerGovernanceReviewScheduler | 1 |
| startFactoryAutopilotScheduler | 1 |
| startBpPriorityScheduler | 1 |
| startNeverStopProductFactoryScheduler | 1 |
| bootLifeRE | 1 |
| startLifeREOutreachScheduler | 1 |
| bootAllDomains | 1 |

## 6.2 fullRuntimeProfile-gated schedulers
    const fullRuntimeProfile = isFullRuntimeProfile();
    // Not gated behind fullRuntimeProfile, unlike its siblings below: found live
    // founder_builder by explicit founder directive) -- so fullRuntimeProfile is
    // fullRuntimeProfile, so only this one gate is being removed here.
    if (!fullRuntimeProfile && process.env.LIFEOS_ENABLE_FOUNDER_BUILDER_BOOT_DOMAINS !== 'true') {
    if (!fullRuntimeProfile) {
    ...(fullRuntimeProfile ? [bootLifeOSScheduled(deps)] : []),
    ...(fullRuntimeProfile ? [bootLaneIntel(deps)] : []),
    ...(fullRuntimeProfile ? [bootWisdomTruthAuditor(deps)] : []),
    ...(fullRuntimeProfile ? [bootChairPredictionScore(deps)] : []),
    ...(fullRuntimeProfile ? [bootOILDailySummary(deps)] : []),
    ...(fullRuntimeProfile ? [bootFactoryAutopilotRecoveryOwner(deps)] : []),

## 6.3 Never-stop autonomous factory
Never-stop files found:
- data/bp-priority-never-stop-log.jsonl
- data/never-stop-product-factory-heartbeat.json
- data/never-stop-product-factory-log.jsonl
- data/never-stop-product-factory-state.json
- scripts/bp-priority-never-stop.mjs
- scripts/run-never-stop-product-factory.mjs
- services/never-stop-product-factory-scheduler.js
- services/never-stop-product-factory.js
- tests/never-stop-idempotent-complete.test.js
- tests/never-stop-non-ui-verify-skip.test.js
- tests/never-stop-queue-merge.test.js
- tests/never-stop-sentry-fix.test.js
These are the likely source of the autonomous `main` commits and deploys.

## 6.4 Governance receipts
| Metric | Value |
|---|---|
| certification_id | FACTORY-REBOOT-CERT-002 |
| generated_at | 2026-07-30T18:37:49.358Z |
| missions_complete | 37 |
| missions_total | 38 |
| product_salvage_candidates | 0 |
`PRODUCT_READINESS_REPORT.json` top keys: schema, updated_at, authority, summary, missing_homes, products, freshness

## 6.5 Silent governance failures
`factory:false-done:audit` shows many `done` steps with missing files/broken imports. The governance loop did not fail loudly.

# 7. Truth Audit

## 7.1 Truth ladder usage
| Label | Occurrences |
|---|---|
| KNOW | 1651 |
| THINK | 1012 |
| UNKNOWN | 514 |
| GUESS | 279 |
| DON'T KNOW | 126 |
| DON’T KNOW | 58 |

## 7.2 Overstated certainty
- `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001` claims PASS/complete while doctrine verify HARD-fails 32 missing receipts.
- `OPERATIONAL_PROOF.json` (2026-06-24, dead `robust-magic` host) claims 10/10 operational.
- `PRODUCT_READINESS_REPORT` lists many products; `factory:false-done:audit` found 196 hard false-done rows.

## 7.3 Circular evidence
- `BP_PRIORITY` points to mission receipts; missions point back to `BP_PRIORITY` for queue position.
- `PROJECT_CERTIFICATION` and `PRODUCT_READINESS_REPORT` are generated by the same pipeline that produced false-done rows.
- `WORKSPACE_STATUS`, `CURRENT_STATE.json`, `HANDOFF.md` report progress but are not independently verified.

## 7.4 ssot-check raw (first 40 lines)
```
[1m
📋 @ssot Tag Audit — 1289 source files
[0m
[32m✅ Tagged: 772[0m
[33m⚠️ Missing tag: 517
[0m
[33mFiles missing @ssot tag:[0m
  [36mroutes/_probe-marketing-ping-routes.js[0m
  [36mroutes/accountFormFill.js[0m
  [36mroutes/activities-routes.js[0m
  [36mroutes/agent-recruitment-routes.js[0m
  [36mroutes/audit-data-sources-routes.js[0m
  [36mroutes/audit-routes.js[0m
  [36mroutes/auto-builder-routes.js[0m
  [36mroutes/automation-routes.js[0m
  [36mroutes/belonging-guarantee-routes.js[0m
  [36mroutes/billing-routes.js[0m
  [36mroutes/boldtrail-coaching-routes.js[0m
  [36mroutes/budgetRoutes.js[0m
  [36mroutes/builderos-routes.js[0m
  [36mroutes/business-center-routes.js[0m
  [36mroutes/business-routes.js[0m
  [36mroutes/calendar-routes.js[0m
  [36mroutes/call-simulation-routes.js[0m
  [36mroutes/ciGuard.js[0m
  [36mroutes/cityos-home-creation-routes.js[0m
  [36mroutes/clientcare-billing-recovery-routes.js[0m
  [36mroutes/coach-chat-routes.js[0m
  [36mroutes/command-center-mode-routes.js[0m
  [36mroutes/commitment-routing.js[0m
  [36mroutes/competitorInfo.js[0m
  [36mroutes/confidence-architecture-routes.js[0m
  [36mroutes/confirmApiAccessRoute.js[0m
  [36mroutes/conflict-arbitrator-routes.js[0m
  [36mroutes/conversation-history-routes.js[0m
  [36mroutes/conversation-routes.js[0m
  [36mroutes/course-routes.js[0m
  [36mroutes/creative-engine-graphic-design-routes.js[0m
  [36mroutes/creative-engine-routes.js[0m
  [36mroutes/creative-engine-ui-routes.js[0m
```

# 8. SENTRY Audit

## 8.1 SENTRY files
| SENTRY File | Role |
|---|---|
| builderos-reboot/scripts/founder-memory-sentry-proof.mjs | verification |
| builderos-reboot/scripts/run-sentry-checks.mjs | verification |
| builderos-reboot/scripts/sentry-behavior-proof.mjs | verification |
| scripts/deliberation-sentry-probe-cleanup.mjs | verification |
| scripts/deliberation-sentry-regression-harness.mjs | verification |
| scripts/sentry-chair-governance-audit.mjs | verification |
| scripts/sentry-prealpha-gate.mjs | verification |
| scripts/sentry-site-builder-prealpha-gate.mjs | verification |
| services/builderos-sentry-job-audit.js | service |
| services/self-repair-sentry-canary.js | service |
| services/sentry-findings-to-improvement-feed.js | service |
| services/sentry-system-audit.js | service |
| docs/SENTRY_PREALPHA_DOCTRINE.md | verification |
| builderos-reboot/CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md | verification |
| builderos-reboot/CODEX_SENTRY_REVIEW_PROMPT.md | verification |
| builderos-reboot/SENTRY_AUDIT_REPORT.md | verification |
| builderos-reboot/SENTRY_CHECK_RESULT.json | verification |

## 8.2 Independence assessment
- SENTRY lives in the same repo and is invoked by the same `npm run` commands as the builder.
- No separate CI pipeline or independent agent is required to approve.
- SENTRY can be bypassed by skipping preflight, using env bypass flags, or calling builder route directly.

## 8.3 Runtime differences
`scripts/sentry-prealpha-gate.mjs` uses Playwright against live deployed app; not enforced pre-deploy.
Recent passes were achieved by manual fixes, not gate enforcement.

## 8.4 Dead/optional verification paths
- Factory SENTRY `factory-staging/factory-core/sentry/run-verification.js` is not wired into production builder route per harness audit.
- `builderos-reboot/SENTRY_AUDIT_REPORT.md` exists but not machine-enforced.

# 9. Founder Twin Audit

## 9.1 Twin loading/enforcement
**services/lumin-context-loader.js**
    * SYNOPSIS: Loads per-user twin + communication profile + recent learning for Lumin prompts.
    import { createLifeRETwinStore } from './lifere-twin-store.js';
    function loadTemplateBundle() {
    const dir = path.join(ROOT, 'data/twins/_template');
    const facets = {};
    facets[key] = readJsonSafe(path.join(dir, `${key}.json`));
    const present = CORE_KEYS.filter((k) => facets[k] != null);
    userHandle: '_template',
    ...facets,
    present_facets: present,
    template_fallback: true,
    function twinDir(userHandle) {
    return path.join(ROOT, 'data/twins/default', userHandle);
    function loadFacetFromDisk(userHandle, twinKey) {
    return readJsonSafe(path.join(twinDir(userHandle), `${twinKey}.json`));
    return readJsonSafe(path.join(twinDir(userHandle), 'modules', `${moduleKey}.json`));
    const dir = path.join(twinDir(userHandle), 'modules');
    const FOUNDER_TWIN_REQUIRED = ['_meta', 'personal', 'goal', 'operating_system', 'decision_identity'];
    export function isFounderTwinHardGated(userHandle = 'adam') {
    // Hard gating is DISABLED. The Chair must answer from available facts and template fallback.
    export function evaluateTwinGate(bundle, injectText = '') {
    const missing = FOUNDER_TWIN_REQUIRED.filter((k) => !bundle?.[k]);
    const injectOk = inject.includes('DIGITAL TWIN') && inject.length >= 400;
    if (missing.length) reason = `missing facets: ${missing.join(', ')}`;
    else if (!statusOk) reason = `twin status not ready (${status || 'null'})`;
    else if (!injectOk) reason = 'twin inject block missing or too thin';
    * Learn from a founder message into facet twin files (memory + decision_identity).
    const store = createLifeRETwinStore({ pool, logger });
    const memory = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: 'memory' }) || {
    schema: 'digital_twin_memory_v1',
    await store.writeTwin({
    twinKey: 'memory',
    const decision = store.readTwin({
    twinKey: 'decision_identity',
    schema: 'digital_twin_decision_identity_v1',
    await store.writeTwin({
    twinKey: 'decision_identity',
    const meta = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: '_meta' });
    await store.writeTwin({
    twinKey: '_meta',
    function formatTwinInjectBlock(bundle, { maxChars = 7000 } = {}) {
    `DIGITAL TWIN (${meta.display_name || bundle.userHandle || 'user'}) ` +
    `status=${meta.status || 'unknown'} template=${meta.template_version || '?'}`
    'RULES: Do not invent personal facts missing from this twin. ' +
    text = `${text.slice(0, maxChars)}\n\n[twin inject truncated]`;
    const twinStore = createLifeRETwinStore({ pool, logger });
    function readFacet(userHandle, twinKey) {
    const fromStore = twinStore.readTwin({ tenantId: 'default', userId: userHandle, twinKey });
    return loadFacetFromDisk(userHandle, twinKey);
    const fromStore = twinStore.readTwin({
    async function loadPersonalTwin(userHandle = 'adam') {
    const template = readJsonSafe(path.join(ROOT, 'data/twins/_template', 'personal.json'));
    return template;
    async function loadFullTwin(userHandle = 'adam') {
    const facets = {};
    facets[key] = readFacet(userHandle, key);
    const present = CORE_KEYS.filter((k) => facets[k] != null);
    ...facets,
    present_facets: present,
    async function getTwinInjectBlock(userHandle = 'adam', opts = {}) {
    let bundle = await loadFullTwin(userHandle);
    const template = loadTemplateBundle();
    if (!template?.personal && !template?._meta) return '';
    bundle = { ...template, userHandle, template_fallback: true };
    bundle._meta.fallback_reason = 'missing_core_facets';
    bundle._meta.fallback_source = 'template';
    return formatTwinInjectBlock(bundle, opts);
    async function getTwinGate(userHandle = 'adam') {
    const bundle = await loadFullTwin(userHandle);
    const inject = formatTwinInjectBlock(bundle);
    ...evaluateTwinGate(bundle, inject),
    hard_gated_for_user: isFounderTwinHardGated(userHandle),
    async function requireTwinOrThrow(userHandle = 'adam') {
    const gate = await getTwinGate(userHandle);
    if (isFounderTwinHardGated(userHandle) && !gate.ok) {
    const err = new Error(`TWIN_GATE_FAILED: ${gate.reason}`);
    err.code = 'TWIN_GATE_FAILED';
    err.twin_gate = gate;
    const twinBlock = await getTwinInjectBlock(userHandle);
    if (twinBlock) parts.push(twinBlock);
    loadPersonalTwin,
    loadFullTwin,
    getTwinInjectBlock,
    getTwinGate,
    requireTwinOrThrow,
    formatTwinInjectBlock,
    export { formatTwinInjectBlock, fieldValue, CORE_KEYS };
**services/chair-direct-agent.js**
    API / DB / files / twin / OBSERVATIONS → SYSTEM_FACTS (truth) → you speak those facts in human language matched to him. Translation is HOW you speak, not WHO you are. Never say you are a middleman, reception desk, or layer between him and "the real system."
    - Match THIS person's rhythm from personal_twin / lumin_context when present — not generic assistant voice.
    - DIGITAL TWIN AVAILABILITY: The personal_twin, lumin_context, and SYSTEM_FACTS may be partial or a template_fallback. NEVER refuse to answer, counsel, or act solely because a digital twin facet is missing or labeled template_fallback. Use whatever facts are present, answer from general knowledge when necessary, and only note a missing twin if Adam explicitly asks why it isn't loaded.
    - MANDATORY — NO TWIN REFUSALS: You must produce a real answer every turn. Outputting "I can't answer without your digital twin" or "missing facets" is forbidden. If the twin is incomplete, answer from the available facts and general knowledge.
    - Never invent capability. If no tool can do it this turn, say so and the smallest unblock (template/file/API). Do not pretend.
    const isGovernanceCounsel = /\b(governance|constitution|pipeline|separation of powers|digital twin|point a|point b|architect|factory|dual.?judge|honesty|blueprint law|not_on_blueprint|chair counsel|ratify)\b/i.test(message)
    ? { personal_twin: systemFacts?.personal_twin || null, lumin_context: systemFacts?.lumin_context || null }
    // If the model still emits a twin-refusal (despite prompt instructions), override it
    if (/can't answer|without your digital twin|missing facets|twin.not.loaded/i.test(rawText)) {
    const fallback = String(raw || '').trim();
    if (fallback) {
    const finalized = finalizeHumanReply(fallback, { commandRan, lastBuild, presenceMode: isPresenceTurn });
**services/chair-personality-translate.js**
    Your ONLY job: convert SYSTEM_FACTS (JSON from real APIs, database, files, digital twin) into natural prose.
    - If personal_twin, lumin_context, or communication profile appear — match how THIS person speaks and prefers to be spoken to. If they are missing or marked template_fallback, still answer from the user's actual words and the available facts; never refuse to respond because the twin is incomplete.
    - Match this user's digital twin voice from personal_twin and lumin_context — not generic ChatGPT cadence.
    - Match this user's twin/profile voice and tonal/emotional moment. Be direct.`;
    return formatFactsFallback(systemFacts);
    Answer the user's life/errand question directly using verified_search and personal_twin when present.
    const enforced = enforceCommunicationLaw(safe || formatFactsFallback(systemFacts), {
    : formatFactsFallback(systemFacts);
    return result.text || formatFactsFallback(systemFacts);
    return formatFactsFallback(systemFacts);
    export function formatFactsFallback(facts = {}) {
    // verified content is never lost to a generic fallback (SO-003 safety net).
**services/founder-direct-provider.js**
    import { refreshBuilderOsEnvFallback } from '../config/runtime-env.js';
    refreshBuilderOsEnvFallback();

## 9.2 Twin data files
| Twin File | Size |
|---|---|
| data/twins/README.md | 722 |
| data/twins/default/adam/personality.json | 642 |
| data/twins/default/adam/future.json | 372 |
| data/twins/default/adam/_meta.json | 2132 |
| data/twins/default/adam/goal.json | 4309 |
| data/twins/default/adam/communication.json | 1070 |
| data/twins/default/adam/memory.json | 1225 |
| data/twins/default/adam/operating_system.json | 6642 |
| data/twins/default/adam/permission.json | 1095 |
| data/twins/default/adam/performance.json | 170 |
| data/twins/default/adam/personal.json | 5865 |
| data/twins/default/adam/decision_identity.json | 6658 |
| data/twins/default/adam/modules/recruiting.json | 663 |
| data/twins/default/adam/modules/buyer.json | 4676 |
| data/twins/default/adam/modules/seller.json | 463 |
| data/twins/default/adam/modules/gvbn.json | 1630 |
| data/twins/default/adam/modules/lead.json | 3349 |
| data/twins/default/adam/modules/content.json | 1105 |
| data/twins/default/relationships/adam_sherry_marriage.json | 343 |
| data/twins/_template/personality.json | 190 |
| data/twins/_template/_meta.json | 356 |
| data/twins/_template/goal.json | 184 |
| data/twins/_template/communication.json | 272 |
| data/twins/_template/memory.json | 157 |
| data/twins/_template/operating_system.json | 261 |
| data/twins/_template/permission.json | 249 |
| data/twins/_template/personal.json | 535 |
| data/twins/_template/README.md | 238 |
| data/twins/_template/decision_identity.json | 331 |
| data/twins/founder/adam/adam.json | 686 |
| data/twins/founder/household/family.json | 108 |
| data/twins/founder/household/marriage.json | 221 |
| data/twins/founder/household/household.json | 108 |
| data/twins/founder/governance/founder.json | 185 |
| data/twins/founder/sherry/sherry.json | 164 |

## 9.3 Bypassability
- `lumin-context-loader.js` falls back to `data/twins/_template` when user facets missing.
- `chair-direct-agent.js` post-process replaces twin-refusal output with direct answer.
- Founder Twin is preferred but **not required** for Chair to answer.

## 9.4 Truth suppression
- No direct suppression of `DON'T KNOW` labels found.
- However, post-processing a model refusal can mask model uncertainty; the twin becomes a soft preference, not a hard gate.

# 10. Architectural Inventory
| Layer | File Count | Sample |
|---|---|---|
| routes | 309 | routes/lesson-plan-routes.js, routes/billing-routes.js, routes/command-center-mode-routes.js, routes/issueApprovalRoutes.js, routes/lane-intel-routes.js |
| services | 1136 | services/builderos-arc-service.js, services/product-readiness.js, services/builderos-build-done-gate-helper.js, services/google_places_service.go, services/env-registry-map.js |
| core | 108 | core/enhanced-consensus-protocol.js, core/code-explainer.js, core/dependency-manager.js, core/intelligent-scaling.js, core/json-sanitizer.js |
| scripts | 1536 | scripts/verify-runner-telemetry-g815.mjs, scripts/verify-runner-telemetry-g219.mjs, scripts/verify-runner-telemetry-g245.mjs, scripts/cursor-pre-push-review.mjs, scripts/verify-runner-telemetry-g55.mjs |
| startup | 17 | startup/snapshots.js, startup/user-preferences.js, startup/latest-run.js, startup/register-runtime-routes.js, startup/auto-register-product-modules.js |
| public/overlay | 194 | public/overlay/chat-panel.js, public/overlay/lifeos-founder-interface.js, public/overlay/dialogue-price-book-ui.html, public/overlay/overlay-window.js, public/overlay/lifeos-onboarding.html |
| db/migrations | 408 | db/migrations/20260630_neon_archive_abandoned_tables.sql, db/migrations/create_user_trials_table.sql, db/migrations/20260704_create_agent_protocol_violations.sql, db/migrations/20260525_autonomous_telemetry.sql, db/migrations/20260704_create_story_rights.sql |
| config | 81 | config/design-studio.js, config/lifeos-stack-registry.json, config/judgment-capsule-contracts.js, config/auto-registered-product-modules.json, config/printerCapabilities.json |
| factory-staging | 121 | factory-staging/server.js, factory-staging/package-lock.json, factory-staging/package.json, factory-staging/AGENTS.md, factory-staging/README.md |
| builderos-reboot | 1261 | builderos-reboot/BUILDEROS_WORKING_DEFINITION.json, builderos-reboot/DETERMINISM_RECEIPT.json, builderos-reboot/MISSION_PACK_INDEX.json, builderos-reboot/MISSION_QUEUE.json, builderos-reboot/DUPLICATION_RECEIPT.json |
| docs/products | 264 | docs/products/PROJECTGOVERNANCE.md, docs/products/OILSECURITYDIVISIONS.md, docs/products/COMMANDCENTER.md, docs/products/BUSINESSTOOLS.md, docs/products/UNIVERSALOVERLAY.md |
| docs/constitution | 18 | docs/constitution/FOUNDER_PACKET_V3_BUILDEROS_MASTER_ARCHITECTURE.md, docs/constitution/LUMIN_DISPLAY_DNA.md, docs/constitution/LUMIN_COMMUNICATION_DNA.md, docs/constitution/NORTH_STAR_SSOT.md, docs/constitution/NORTH_STAR.md |

## 10.1 Product registry
| Product | Home |
|---|---|
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |
| ? | ? |

## 10.2 BuilderOS governance artifacts
| Governance File | Size |
|---|---|
| builderos-reboot/governance/TYPED_BLOCKER_SSOT.json | 2046 |
| builderos-reboot/governance/LUMIN_OPERATING_MODEL.json | 6253 |
| builderos-reboot/governance/SESSION_DECISIONS_2026-07-03.md | 5192 |
| builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json | 8543 |
| builderos-reboot/governance/FOUNDER_PACKET_V2_CHAIR_RUNTIME.json | 1669 |
| builderos-reboot/governance/BLOCKER_PARKING_POLICY.json | 1166 |
| builderos-reboot/governance/LUMIN_CONNECTION_LAW.json | 2769 |
| builderos-reboot/governance/CHAIR_STRATEGIC_INTELLIGENCE.json | 2071 |
| builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json | 11610 |
| builderos-reboot/governance/CHAIR_INTENT_PROTOCOL.json | 1737 |
| builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json | 5099 |
| builderos-reboot/governance/LIFEOS_SERVICE_DOCTRINE_RUNTIME.json | 1160 |
| builderos-reboot/governance/CANONICAL_EXECUTION_SPINE.json | 1523 |
| builderos-reboot/governance/OB_EXECUTION_LADDER.json | 3320 |
| builderos-reboot/governance/BUILDEROS_TOOL_REGISTRY.json | 27516 |
| builderos-reboot/governance/BUILDEROS_INTAKE_REGRESSION_HARNESS.json | 752 |
| builderos-reboot/governance/DEVIN_EXECUTION_PACKET.json | 2337 |
| builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json | 3727909 |
| builderos-reboot/governance/DEPARTMENT_ROLE_CONTRACT.json | 5303 |
| builderos-reboot/governance/BUILDEROS_EXECUTION_TIER.json | 1261 |
| builderos-reboot/governance/FILE_SYNOPSIS_LAW.json | 2491 |
| builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.schema.json | 3641 |
| builderos-reboot/governance/POINT_B_DNA.json | 2753 |
| builderos-reboot/governance/MISSION_PHASE_ARTIFACTS.json | 3265 |
| builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json | 14233 |
| builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json | 6332 |
| builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json | 6898 |
| builderos-reboot/governance/ARTIFACT_ALIAS_REGISTRY.json | 3636 |
| builderos-reboot/governance/schemas/PREDICTION_RECEIPT.schema.json | 407 |
| builderos-reboot/governance/schemas/ARC_RUN_RECEIPT.schema.json | 777 |

## 10.3 Routes
| Route File | Route Count | Exports | Self-Mounting |
|---|---|---|---|
| lifere-os-routes.js | 142 | createLifeRERoutes | no |
| tc-routes.js | 136 | createTCRoutes | yes |
| cognitive-core-routes.js | 118 | createCognitiveCoreRoutes | yes |
| clientcare-billing-routes.js | 108 | createClientCareBillingRoutes | no |
| lifeos-core-routes.js | 74 | createLifeOSCoreRoutes | yes |
| public-routes.js | 42 |  | yes |
| life-coaching-routes.js | 35 | createLifeCoachingRoutes | no |
| command-center-routes.js | 35 | createCommandCenterRoutes | no |
| site-builder-routes.js | 34 | createSiteBuilderRoutes | yes |
| lifeos-legacy-routes.js | 34 | createLifeOSLegacyRoutes | yes |
| auto-builder-routes.js | 31 | createAutoBuilderRoutes | no |
| business-routes.js | 28 | createBusinessRoutes | no |
| lifeos-auth-routes.js | 28 | createLifeOSAuthRoutes, createLifeOSBillingRoutes | yes |
| lifeos-command-center-routes.js | 27 | createCommandCenterAggregateRoutes | no |
| railway-managed-env-routes.js | 27 | createRailwayManagedEnvRoutes | no |
| lifeos-voice-rail-routes.js | 24 | createLifeOSVoiceRailRoutes | no |
| lifeos-conflict-routes.js | 24 | createLifeOSConflictRoutes | yes |
| api-v1-core.js | 24 |  | no |
| memory-intelligence-routes.js | 23 | createMemoryIntelligenceRoutes | no |
| lifeos-children-routes.js | 22 | createLifeOSChildrenRoutes | no |
| lifeos-finance-routes.js | 22 | createLifeOSFinanceRoutes | yes |
| teacher-os-routes.js | 21 | createTeacherOSRoutes | no |
| lifeos-chat-routes.js | 20 | createLifeOSChatRoutes | no |
| lifeos-engine-routes.js | 20 | createLifeOSEngineRoutes, createLifeOSGatewayRoutes | yes |
| bundle_social_automation_routes.js | 20 |  | yes |
| lifeos-purpose-routes.js | 19 | createLifeOSPurposeRoutes | yes |
| word-keeper-routes.js | 19 | createWordKeeperRoutes | no |
| marketing-session-ui-routes.js | 19 | createMarketingSessionUiRoutes | yes |
| lifeos-growth-routes.js | 19 | createLifeOSGrowthRoutes | no |
| deliberation-governance-routes.js | 18 | createDeliberationGovernanceRoutes | no |
| account-manager-routes.js | 18 | createAccountManagerRoutes | yes |
| lifeos-emotional-routes.js | 18 | createLifeOSEmotionalRoutes | yes |
| twin-routes.js | 17 | createTwinRoutes | no |
| blueprint-intake-routes.js | 17 | createBlueprintIntakeRoutes | no |
| factory-mount-routes.js | 16 | createFactoryMountRoutes | no |
| lifeos-phase3-routes.js | 16 |  | no |
| tokenos-routes.js | 15 | createTokenOSRoutes | yes |
| video-routes.js | 15 | createVideoRoutes | no |
| tco-agent-routes.js | 15 |  | no |
| lifeos-council-builder-routes.js | 15 | createLifeOSCouncilBuilderRoutes | yes |

## 10.4 Services
| Service File | Function Count |
|---|---|
| clientcare-browser-service.js | 88 |
| site-builder-asset-ingestion.js | 65 |
| clientcare-billing-service.js | 65 |
| clientcare-ops-service.js | 57 |
| never-stop-product-factory.js | 50 |
| tc-browser-agent.js | 49 |
| marketing-youtube.js | 49 |
| governed-autonomous-shipping-loop.js | 44 |
| blueprint-intake.js | 39 |
| council-service.js | 38 |
| voice-rail-v1.js | 38 |
| lifere-receptionist-bridge.js | 34 |
| intake-blueprint-executor.js | 32 |
| clientcare-sellable-service.js | 31 |
| memory-intelligence-service.js | 30 |
| email-triage.js | 29 |
| oil-self-repair-detector.js | 28 |
| lumin-context-loader.js | 26 |
| adf-prediction-ledger.js | 25 |
| railway-managed-env-service.js | 25 |
| builder-council-review.js | 25 |
| faith-studio-service.js | 24 |
| lifeos-auth.js | 24 |
| boldtrail.js | 24 |
| deliberation-governance-service.js | 23 |
| site-builder-social-discovery.js | 23 |
| deployment-service.js | 23 |
| builderos-pbb-plan.js | 22 |
| lifeos-system-agent.js | 22 |
| ai-guard.js | 22 |
| truth-ladder.js | 21 |
| tc-email-document-service.js | 21 |
| go-vegas-outreach.js | 21 |
| commitment-tracker.js | 21 |
| founder-build-quorum-escalation.js | 20 |
| cognitive-core-oracle.js | 20 |
| lifere-alpha-surface-api.js | 20 |
| founder-provider-tool-action.js | 20 |
| lifeos-lumin.js | 20 |
| token-optimizer.js | 19 |