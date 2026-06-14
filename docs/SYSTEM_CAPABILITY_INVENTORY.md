# SYSTEM CAPABILITY INVENTORY
**Status:** `AUTHORITATIVE`
**Produced:** 2026-06-13 by Claude Code (read pass — no runtime code modified)
**Source files:** register-runtime-routes.js, services/ listing, scripts/ listing, BUILDEROS_SYSTEM_INVENTORY.md, SYSTEM_TOOL_INVENTORY_AUDIT_V1.md, REPO_DEEP_AUDIT.md
**Classification legend:**
- `PRESENT` = real, callable, wired in current runtime
- `PARTIAL` = code exists but incomplete, uncoupled, or not yet canonical
- `MISSING` = named by architecture but not built as trustworthy system tool
- `SHADOW` = exists but contradicts BP law or SSOT — awaiting founder authorization

---

## EXECUTIVE SUMMARY

The repo has more capability than any single document admits. The problem is not absence — it is uneven governance. Three categories of gap dominate:

1. **Coverage gaps** — tools named in doctrine that do not exist as runtime artifacts
2. **Governance gaps** — tools that exist but are not wrapped by useful-work-guard, receipt-bearing, or amendment-owned
3. **Naming/authority gaps** — tools built under old BuilderOS assumptions that have not been absorbed into the new factory contract

---

## 1. BUILDEROS (Internal Autonomous Programming Machine)

**Amendment:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, `AMENDMENT_04_AUTO_BUILDER.md`
**SSOT file:** `docs/architecture/BUILDEROS_SYSTEM_INVENTORY.md`

| Capability | Status | Key Files |
|---|---|---|
| Builder supervisor / task runner | `PRESENT` | `routes/builder-supervisor-routes.js`, `services/builder-truth-surface.js` |
| Builder preflight gate | `PRESENT` | `scripts/council-builder-preflight.mjs`, `npm run builder:preflight` |
| Builder council review | `PRESENT` | `services/builder-council-review.js`, `services/builder-deliberation-hook.js` |
| Build audit before done | `PRESENT` | `services/builder-audit-before-done.js` |
| Build critic | `PRESENT` | `services/build-critic.js` |
| Outcome verifier | `PRESENT` | `services/builder-outcome-verifier.js` |
| Blueprint gate | `PRESENT` | `services/builder-blueprint-gate.js` |
| Instruction target resolver | `PRESENT` | `services/builder-instruction-target.js` |
| Build pipeline | `PRESENT` | `services/builderos-build-pipeline.js` |
| Governed loop executor | `PRESENT` | `services/builderos-governed-loop-executor.js` |
| Patch mode policy | `PRESENT` | `services/builderos-patch-mode-policy.js` |
| Routing policy | `PRESENT` | `services/builderos-routing-policy.js` |
| Structural proof | `PRESENT` | `services/builderos-structural-proof.js` |
| Metrics reporter | `PRESENT` | `services/builderos-metrics-reporter.js` |
| Control plane | `PRESENT` | `routes/builderos-control-plane-routes.js`, `services/builderos-control-plane-service.js` |
| Command + control service | `PRESENT` | `services/builderos-command-control-service.js`, `routes/lifeos-builderos-command-control-routes.js` |
| Alpha readiness guards | `PRESENT` | `services/builderos-system-alpha-readiness.js`, `services/builderos-alpha-readiness-guards.js` |
| Oil job audit | `PRESENT` | `services/builderos-oil-job-audit.js` |
| Governed proof parity | `PRESENT` | `services/builderos-governed-proof-parity.js` |
| Live enforcement pass | `PRESENT` | `services/builderos-live-enforcement-pass.js` |
| TSOS evidence | `PRESENT` | `services/builderos-tsos-evidence.js` |
| TSOS hook service | `PRESENT` | `services/builderos-tsos-hook-service.js` |
| Pre-commit governance | `PRESENT` | `services/builderos-precommit-governance.js` |
| Phase14 ledger | `PRESENT` | `services/builder-phase14-ledger.js` |
| BP priority queue | `PRESENT` | `services/bp-priority-queue.js`, `services/bp-priority-sync.js` |
| Oil probe (Phase 7) | `PRESENT` | `routes/builder-oil-audit-probe-routes.js`, `services/builder-oil-phase7-probe.js` |
| Factory autopilot scheduler | `PRESENT` | `services/factory-autopilot-scheduler.js` |
| Factory recovery proof | `PRESENT` | `services/factory-recovery-proof-service.js` |
| Continuous queue (shadow queue) | `SHADOW` | `scripts/lifeos-builder-continuous-queue.mjs` — contradicts BP law; awaiting founder authorization |
| Product development gate | `MISSING` | Named in NSSOT §2.11; no machine gate that verifies "BPB may begin now" |
| Founder packet completeness checker | `PARTIAL` | Checklist docs exist; not built as machine validator over structured data |
| Determinism checker at Builder tier | `MISSING` | Named in doctrine; not built as test harness |

---

## 2. C2 — COMMAND CENTER / CONTROL PLANE

**Amendment:** `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`

| Capability | Status | Key Files |
|---|---|---|
| Command center aggregate | `PRESENT` | `routes/lifeos-command-center-routes.js`, `routes/command-center-routes.js` |
| Supervised autonomy readiness | `PRESENT` | `services/supervised-autonomy-readiness.js`, `GET /api/v1/lifeos/command-center/supervised-autonomy/readiness` |
| PB execution authority | `PRESENT` | `services/pb-execution-authority.js` |
| Proof freshness | `PRESENT` | `services/oil-proof-freshness.js`, `GET /api/v1/lifeos/command-center/proof-freshness` |
| Phase 14 cert | `PRESENT` | `GET /api/v1/lifeos/command-center/phase14` |
| Canonical admin routes | `PRESENT` | `routes/canonical-admin-routes.js` |
| Canonical system routes | `PRESENT` | `routes/canonical-system-routes.js` |
| Canonical execution routes | `PRESENT` | `routes/canonical-execution-routes.js` |
| Canonical backlog | `PRESENT` | `routes/canonical-backlog-routes.js` |
| Autonomous telemetry | `PRESENT` | `routes/autonomous-telemetry-routes.js`, `services/autonomous-telemetry-service.js` |
| Capability map | `PRESENT` | `routes/capability-map-routes.js`, `services/capability-map.js` |
| Mission ledger | `PRESENT` | `services/mission-ledger.js`, `routes/mission-routes.js` |
| Deliberation governance | `PRESENT` | `routes/deliberation-governance-routes.js`, `services/deliberation-governance-service.js` |
| Gate change council runner | `PRESENT` | `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-council-run.js` |
| Founder debrief | `PRESENT` | `services/founder-debrief-service.js` |
| Founder value engine | `PRESENT` | `services/founder-value-engine.js` |
| Founder direct provider | `PRESENT` | `services/founder-direct-provider.js`, `services/founder-provider-tool-action.js` |
| Lane intel | `PRESENT` | `routes/lane-intel-routes.js`, `services/lane-intel-service.js` |
| TSOS efficiency | `PRESENT` | `routes/tsos-efficiency-routes.js` |
| TSOS platform kernel | `PRESENT` | `routes/tsos-platform-kernel-routes.js`, `services/tsos-platform-kernel.js` |
| Telemetry cycle guard | `PRESENT` | `services/telemetry-cycle-guard.js` |
| Constitutional lock | `PRESENT` | `services/constitutional-lock.js` |
| Kingsman gate | `PRESENT` | `services/kingsman-gate.js` |
| Sovereignty check | `PRESENT` | `services/sovereignty-check.js` |
| OIL security receipts | `PRESENT` | `routes/oil-security-receipt-routes.js`, `services/oil-security-receipts.js` |
| Self-repair executor | `PRESENT` | `routes/self-repair-executor-routes.js`, `services/self-repair-executor.js` |
| Agent recruitment routes | `PARTIAL` | `routes/agent-recruitment-routes.js` — not mounted in register-runtime-routes.js |
| Runtime mode controller | `PRESENT` | `services/runtime-modes.js` |
| Useful work guard | `PRESENT` | `services/useful-work-guard.js` — wraps all scheduled AI calls |
| Metered AI call | `PRESENT` | `services/metered-ai-call.js` |

---

## 3. LIFEOS — PERSONAL OPERATING SYSTEM

**Amendment:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Route count:** 48 lifeos-prefixed route files

| Phase / Domain | Status | Key Route File |
|---|---|---|
| Core engine + gateway | `PRESENT` | `lifeos-engine-routes.js`, `lifeos-core-routes.js` |
| Auth (user registration, login) | `PRESENT` | `lifeos-auth-routes.js`, `services/lifeos-auth.js` |
| Daily briefing | `PRESENT` | `lifeos-briefing-routes.js`, `services/lifeos-daily-briefing.js` |
| Habits + streaks | `PRESENT` | `lifeos-habits-routes.js`, `services/lifeos-habits.js` |
| Commitments | `PRESENT` | `lifeos-commitment-routes.js`, `services/lifeos-commitment-tracker.js` |
| Emotional layer | `PRESENT` | `lifeos-emotional-routes.js`, `services/emotional-pattern-engine.js` |
| Health | `PRESENT` | `lifeos-health-routes.js`, `services/health-pattern-engine.js` |
| Family sync | `PRESENT` | `lifeos-family-routes.js`, `services/household-sync.js` |
| Purpose discovery | `PRESENT` | `lifeos-purpose-routes.js`, `services/purpose-discovery.js` |
| Decisions | `PRESENT` | `lifeos-decisions-routes.js`, `services/decision-intelligence.js` |
| Identity intelligence | `PRESENT` | `lifeos-identity-routes.js` |
| Vision / Future Self | `PRESENT` | `lifeos-vision-routes.js`, `services/future-self-simulator.js` |
| Finance OS | `PRESENT` | `lifeos-finance-routes.js`, `services/lifeos-finance.js` |
| Conflict coach | `PRESENT` | `lifeos-conflict-routes.js`, `services/conflict-intelligence.js` |
| Mediation engine | `PRESENT` | `lifeos-mediation-routes.js`, `services/mediation-engine.js` |
| Healing | `PRESENT` | `lifeos-healing-routes.js` |
| Legacy builder | `PRESENT` | `lifeos-legacy-routes.js`, `services/lifeos-legacy-core.js` |
| Ethics | `PRESENT` | `lifeos-ethics-routes.js` |
| Growth + mastery | `PRESENT` | `lifeos-growth-routes.js`, `services/mastery-tracker.js` |
| Scorecard / scoreboard | `PRESENT` | `lifeos-scorecard-routes.js`, `services/lifeos-daily-scorecard.js` |
| Victory vault | `PRESENT` | `lifeos-victory-vault-routes.js`, `services/victory-vault.js` |
| Weekly review | `PRESENT` | `lifeos-weekly-review-routes.js`, `services/lifeos-weekly-review.js` |
| Assessment battery | `PRESENT` | `lifeos-assessment-battery-routes.js`, `services/lifeos-assessment-battery.js` |
| Children (Kids OS) | `PRESENT` | `lifeos-children-routes.js`, `kids-os-routes.js`, `services/kids-os-core.js` |
| Communication OS | `PRESENT` | `lifeos-communication-routes.js`, `services/lifeos-communication-os-service.js` |
| Calendar integration | `PRESENT` | `services/lifeos-calendar.js`, `services/google-calendar-service.js` |
| Ambient intelligence | `PRESENT` | `lifeos-ambient-routes.js`, `lifeos-ambient-intelligence-routes.js`, `services/lifeos-ambient-intelligence.js` |
| Cycle tracking | `PRESENT` | `lifeos-cycle-routes.js`, `services/lifeos-cycle.js` |
| Sleep | `PRESENT` | `lifeos-sleep-routes.js`, `services/lifeos-sleep-service.js` |
| Backtest | `PRESENT` | `lifeos-backtest-routes.js` |
| Extension points | `PRESENT` | `lifeos-extension-routes.js` |
| Council builder | `PRESENT` | `lifeos-council-builder-routes.js` |
| LifeOS direct action | `PRESENT` | `lifeos-direct-action-routes.js`, `services/lifeos-direct-action.js` |
| System proof | `PRESENT` | `lifeos-system-proof-routes.js`, `services/lifeos-system-proof-event.js` |
| System agent | `PRESENT` | `services/lifeos-system-agent.js` |
| LifeOS chat | `PRESENT` | `lifeos-chat-routes.js` |
| Lumin AI persona | `PRESENT` | `services/lifeos-lumin.js` |
| Wearable integration | `PARTIAL` | `services/wearable-integration/` — directory only; HealthKit bridge exists but iOS hook not proven |
| Conflict interrupt | `PRESENT` | `lifeos-conflict-interrupt-routes.js`, `services/lifeos-conflict-interrupt.js` |
| Decision review | `PRESENT` | `lifeos-decision-review-routes.js`, `services/lifeos-decision-review.js` |
| Workshop of mind | `PRESENT` | `routes/lifeos-workshop-routes.js` (disk-only; not in register-runtime-routes.js) |
| Copilot | `PRESENT` | `routes/lifeos-copilot-routes.js` (disk-only; not in register-runtime-routes.js) |
| Simulator | `PARTIAL` | `routes/lifeos-simulator-routes.js` — on disk; not confirmed mounted |
| Emergency detection | `PRESENT` | `services/emergency-detection.js` |
| Self-sabotage monitor | `PRESENT` | `services/self-sabotage-monitor.js` |
| User auth (multi-user) | `PARTIAL` | Auth routes wired; full multi-user registration flow pending production validation |

---

## 4. VOICE RAIL

**Amendment:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` (§Voice Rail)

| Capability | Status | Key Files |
|---|---|---|
| Voice Rail v1 core | `PRESENT` | `services/voice-rail-v1.js`, `routes/lifeos-voice-rail-routes.js` |
| STT (speech-to-text) | `PRESENT` | `services/voice-rail-stt.js` |
| TTS (text-to-speech) | `PRESENT` | `services/voice-rail-tts.js` |
| Intent router | `PRESENT` | `services/voice-rail-intent-router.js` |
| Command executor | `PRESENT` | `services/voice-rail-command-executor.js` |
| System direct path | `PRESENT` | `services/voice-rail-system-direct.js` |
| System operator path | `PRESENT` | `services/voice-rail-system-operator.js` |
| Founder memory integration | `PRESENT` | `services/voice-rail-founder-memory.js` |
| Execution truth receipts | `PRESENT` | `services/voice-rail-execution-truth.js` |
| Usage receipt | `PRESENT` | `services/voice-rail-usage-receipt.js` |
| Attachment handling | `PRESENT` | `services/voice-rail-attachments.js` |
| Provider proof hard-route | `PRESENT` | `services/founder-provider-tool-action.js` (broadened 2026-06-13, commit 28f4ae447e) |
| Action Inbox | `PRESENT` | `routes/action-inbox-routes.js`, `services/action-inbox.js` |
| Native mobile mic (iOS/Android) | `MISSING` | Web UI only; no native microphone API integration proven |

---

## 5. MEMORY / HISTORIAN

**Amendment:** `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md`, `AMENDMENT_39_MEMORY_INTELLIGENCE.md`

| Capability | Status | Key Files |
|---|---|---|
| Conversation history | `PRESENT` | `routes/conversation-history-routes.js`, `services/conversation-store.js` |
| Memory intelligence | `PRESENT` | `routes/memory-intelligence-routes.js`, `services/memory-intelligence-service.js` |
| Memory capsule | `PRESENT` | `routes/memory-capsule-routes.js`, `services/memory-capsule.js` |
| Working memory | `PRESENT` | `services/memory-working.js` |
| Institutional memory | `PRESENT` | `services/memory-institutional.js` |
| Memory relationship graph | `PRESENT` | `services/memory-relationship.js` |
| Memory links | `PRESENT` | `services/memory-links.js` |
| Memory provenance | `PRESENT` | `services/memory-provenance.js` |
| Memory trust bridge | `PRESENT` | `services/memory-trust-bridge.js` |
| Memory healing | `PRESENT` | `services/memory-healing.js` |
| Memory health | `PRESENT` | `services/memory-health.js` |
| Memory explanation | `PRESENT` | `services/memory-explanation.js` |
| Memory receipts | `PRESENT` | `services/memory-receipts.js` |
| Memory signal intake | `PRESENT` | `services/memory-signal-intake.js` |
| Memory contradiction | `PRESENT` | `services/memory-contradiction.js` |
| Memory zombie (stale detection) | `PRESENT` | `services/memory-zombie.js` |
| Memory OIL bridge | `PRESENT` | `services/memory-oil-bridge.js` |
| Memory legacy bridge | `PRESENT` | `services/memory-legacy-bridge.js` |
| Memory candidate | `PRESENT` | `services/memory-candidate.js` |
| Self-repair memory | `PRESENT` | `services/self-repair-memory.js` |
| Lumin memory fetcher | `PRESENT` | `services/lumin-memory-fetcher.js` |
| Delta context | `PRESENT` | `services/delta-context.js` |
| Memory status routes | `PRESENT` | `routes/memory-status-routes.js` |
| Memory self-repair routes | `PRESENT` | `routes/memory-self-repair-routes.js` |
| Historian canonical contract (NSSOT §2.0I) | `PARTIAL` | Services exist; canonical Historian role in new factory not yet fully enforced |

---

## 6. PROOF / SENTRY (OIL)

**Amendment:** `docs/projects/AMENDMENT_40_OIL_SECURITY_DIVISIONS.md`

| Capability | Status | Key Files |
|---|---|---|
| OIL security receipts | `PRESENT` | `services/oil-security-receipts.js`, `routes/oil-security-receipt-routes.js` |
| OIL daily summary | `PRESENT` | `services/oil-daily-summary.js` (scheduled: daily, 24h interval) |
| OIL proof freshness | `PRESENT` | `services/oil-proof-freshness.js` |
| OIL self-repair detector | `PRESENT` | `services/oil-self-repair-detector.js` |
| Self-repair executor | `PRESENT` | `services/self-repair-executor.js` |
| Self-repair deploy scheduler | `PRESENT` | `services/self-repair-deploy-scheduler.js` |
| Self-repair lesson classifier | `PRESENT` | `services/self-repair-lesson-classifier.js` |
| Self-repair execution log | `PRESENT` | `services/self-repair-execution-log.js` |
| Self-repair prevention hook log | `PRESENT` | `services/self-repair-prevention-hook-log.js` |
| Self-repair prevention hook planner | `PRESENT` | `services/self-repair-prevention-hook-planner.js` |
| Self-repair prevention registry | `PRESENT` | `services/self-repair-prevention-registry.js` |
| Emergency repair | `PRESENT` | `services/emergency-repair.js` |
| Gemini proof routes | `PRESENT` | `routes/gemini-proof-routes.js` |
| System proof event | `PRESENT` | `services/lifeos-system-proof-event.js` |
| Integrity engine | `PRESENT` | `services/integrity-engine.js` |
| Integrity score | `PRESENT` | `services/integrity-score.js` |
| Council bypass audit | `PRESENT` | `services/council-bypass-audit.js` |
| Contradiction engine | `PRESENT` | `services/contradiction-engine.js` |
| Blind spot detector | `PRESENT` | `services/blind-spot-detector/` |
| AI guard | `PRESENT` | `services/ai-guard.js` |
| Anomaly detection | `PRESENT` | `services/anomaly-detection/` |
| Truth delivery | `PRESENT` | `services/truth-delivery.js` |
| Response variety | `PRESENT` | `services/response-variety.js` |
| Fraud detection | `PARTIAL` | `services/fraud-detection/` — directory; runtime integration not confirmed |
| Consent registry | `PRESENT` | `services/consent-registry.js` |
| Data sovereignty | `PRESENT` | `services/data-sovereignty.js` |

---

## 7. TSOS — TOKEN SAVER OS (External AI Efficiency Product)

**Amendment:** `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`, `AMENDMENT_44_TOKEN_ACCOUNTING_OS.md`

| Capability | Status | Key Files |
|---|---|---|
| API cost savings | `PRESENT` | `routes/api-cost-savings-routes.js` |
| TokenOS core | `PRESENT` | `routes/tokenos-routes.js`, `services/tokenos-service.js` |
| Token accounting | `PRESENT` | `routes/token-accounting-routes.js`, `services/token-accounting-service.js` |
| Operator consumption ledger | `PRESENT` | `routes/operator-consumption-ledger-routes.js`, `services/operator-consumption-ledger-service.js` |
| Token optimizer | `PRESENT` | `services/token-optimizer.js` |
| TSOS task ledger | `PRESENT` | `routes/tsos-task-ledger-routes.js` |
| TCO agent routes | `PRESENT` | `routes/tco-agent-routes.js` |
| TCO routes | `PRESENT` | `routes/tco-routes.js` |
| TSOS platform kernel | `PRESENT` | `routes/tsos-platform-kernel-routes.js`, `services/tsos-platform-kernel.js` |
| TSOS efficiency | `PRESENT` | `routes/tsos-efficiency-routes.js` |
| Model performance tracking | `PRESENT` | `routes/model-performance-routes.js`, `services/model-performance.js` |
| Response cache | `PRESENT` | `services/response-cache.js` |
| Free tier governor | `PRESENT` | `services/free-tier-governor.js` |
| Savings ledger | `PRESENT` | `services/savings-ledger.js` |
| AI model selector | `PRESENT` | `services/ai-model-selector.js` |
| Adaptive model routing | `PRESENT` | `services/adaptiveModel.js` |
| TokenOS quality check | `PRESENT` | `services/tokenos-quality-check.js` |
| Monetization map | `PRESENT` | `services/monetization-map.js` |

---

## 8. DEPLOYMENT

**Amendment:** `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`

| Capability | Status | Key Files |
|---|---|---|
| Deployment service (git + Railway) | `PRESENT` | `services/deployment-service.js` |
| Railway managed env routes | `PRESENT` | `routes/railway-managed-env-routes.js`, `services/railway-managed-env-service.js` |
| Env validator (boot-time) | `PRESENT` | `services/env-validator.js` |
| Env registry map | `PRESENT` | `services/env-registry-map.js` |
| Migration runner | `PRESENT` | `services/migration-runner.js` |
| DB health monitor | `PRESENT` | `services/db-health-monitor.js` |
| Project governance routes | `PRESENT` | `routes/project-governance-routes.js` |
| SSOT check script | `PRESENT` | `scripts/ssot-check.js` |
| Pre-commit hooks | `PRESENT` | `.git/hooks/` — enforce §2.11 builder-first, §2.15 drift gate, SSOT atomic |
| Coupling check | `PRESENT` | `scripts/check-coupling.mjs` |
| Snapshot service | `PRESENT` | `services/snapshot-service.js` |
| Sandbox service | `PRESENT` | `services/sandbox-service.js` |
| Account manager | `PRESENT` | `routes/account-manager-routes.js`, `services/account-manager.js` |
| Stripe integration | `PRESENT` | `routes/stripe-routes.js`, `services/StripeService.js` |
| Billing routes | `PRESENT` | `routes/billing-routes.js` |
| Auto-builder routes | `PRESENT` | `routes/auto-builder-routes.js` |

---

## 9. TC — TRANSACTION COORDINATOR (Real Estate)

**Amendment:** `docs/projects/AMENDMENT_17_TC_SERVICE.md`

| Capability | Status | Key Files |
|---|---|---|
| TC core routes | `PRESENT` | `routes/tc-routes.js` |
| MLS routes | `PRESENT` | `routes/mls-routes.js` |
| TC assistant service | `PRESENT` | `services/tc-assistant-service.js` |
| TC workflow runner | `PRESENT` | `services/tc-td-workflow-runner.js` |
| TC status engine | `PRESENT` | `services/tc-status-engine.js` |
| TC email monitor + intake | `PRESENT` | `services/tc-email-monitor.js`, `services/tc-email-document-service.js` |
| TC document validator | `PRESENT` | `services/tc-document-validator.js` |
| TC browser agent | `PRESENT` | `services/tc-browser-agent.js` |
| TC inspection service | `PRESENT` | `services/tc-inspection-service.js` |
| TC offer prep | `PRESENT` | `services/tc-offer-prep-service.js` |
| TC morning digest | `PRESENT` | `services/tc-morning-digest-service.js` |
| TC coordinator | `PRESENT` | `services/tc-coordinator.js` |
| TC Asana sync | `PRESENT` | `services/tc-asana-sync-service.js` |
| TC alert service | `PRESENT` | `services/tc-alert-service.js` |
| TC portal | `PRESENT` | `services/tc-portal-service.js` |
| TC Stripe | `PRESENT` | `services/tc-stripe-service.js` |
| TC pricing | `PRESENT` | `services/tc-pricing.js` |
| TC R4R attachment classify | `PRESENT` | `services/tc-r4r-attachment-classify.js` |
| TC report service | `PRESENT` | `services/tc-report-service.js` |
| TC review package | `PRESENT` | `services/tc-review-package-service.js` |
| TC SkySlope listing sync | `PRESENT` | `services/tc-listing-skyslope-sync.js` |
| TC mobile link | `PRESENT` | `services/tc-mobile-link-service.js` |
| TC TD party sync | `PRESENT` | `services/tc-td-party-sync.js` |
| TC form knowledge | `PRESENT` | `services/tc-td-form-knowledge-service.js` |
| BoldTrail real estate | `PRESENT` | `routes/boldtrail-routes.js`, `routes/boldtrail-coaching-routes.js` |
| MLS deal scanner | `PRESENT` | `services/mls-deal-scanner.js` |
| GLVAR monitor | `PRESENT` | `services/glvar-monitor.js` |
| ClientCare billing | `PRESENT` | `routes/clientcare-billing-routes.js`, `services/clientcare-billing-service.js` |
| ClientCare browser service | `PRESENT` | `services/clientcare-browser-service.js` |
| Life coaching / Twin | `PRESENT` | `routes/life-coaching-routes.js`, `routes/twin-routes.js`, `services/adaptiveModel.js` |
| Word Keeper | `PRESENT` | `routes/word-keeper-routes.js` |
| Word Keeper transcriber | `PRESENT` | `services/word-keeper-transcriber.js` |

---

## 10. MARKETING / SITE BUILDER / OUTREACH

**Amendment:** `docs/projects/AMENDMENT_05_SITE_BUILDER.md`, `AMENDMENT_08_OUTREACH_CRM.md`, `AMENDMENT_41_MARKETINGOS.md`

| Capability | Status | Key Files |
|---|---|---|
| Site builder core | `PRESENT` | `routes/site-builder-routes.js`, `services/site-builder.js` |
| Site builder discovery | `PRESENT` | `routes/site-builder-discovery-routes.js` |
| Site builder launch readiness | `PRESENT` | `routes/site-builder-launch-readiness-routes.js` |
| Site builder pipeline report | `PRESENT` | `routes/site-builder-pipeline-report-routes.js` |
| Site builder revenue | `PRESENT` | `services/site-builder-revenue-service.js` |
| Site builder opportunity scorer | `PRESENT` | `services/site-builder-opportunity-scorer.js` |
| Site builder quality scorer | `PRESENT` | `services/site-builder-quality-scorer.js` |
| Site builder prospect ranker | `PRESENT` | `services/site-builder-prospect-ranker.js` |
| Site builder email templates | `PRESENT` | `services/site-builder-email-templates.js` |
| Prospect pipeline | `PRESENT` | `services/prospect-pipeline.js` |
| Preview expiry cron | `PRESENT` | `services/preview-expiry-cron.js` (30-day auto-expiry) |
| Outreach CRM | `PRESENT` | `routes/outreach-crm-routes.js`, `services/outreach-engine.js` |
| Email reader + triage | `PRESENT` | `services/email-reader.js`, `services/email-triage.js` |
| Marketing routes | `PRESENT` | `routes/marketing-routes.js` |
| Marketing content engine | `PRESENT` | `services/marketing-content-engine.js` |
| Marketing coach | `PRESENT` | `services/marketing-coach.js` |
| Marketing transcriber | `PRESENT` | `services/marketing-transcriber.js` |
| Web intelligence | `PRESENT` | `routes/web-intelligence-routes.js` |
| Web search integration | `PRESENT` | `services/web-search-integration.js`, `services/web-search-service.js` |
| Website audit | `PRESENT` | `routes/website-audit-routes.js` |
| Financial routes | `PRESENT` | `routes/financial-routes.js` |
| Email provision (Postmark) | `PARTIAL` | Code wired; Railway env vars not set (EMAIL_PROVIDER, POSTMARK_SERVER_TOKEN) |

---

## 11. SCHEDULED JOBS / CRONS

All are registered via `startup/boot-domains.js` using `scheduleAsyncInterval`/`scheduleAsyncTimeout`. All AI-calling jobs must pass `createUsefulWorkGuard()`.

| Job | Interval | Status | Service |
|---|---|---|---|
| Twin auto-ingest | 30 min | `PRESENT` | `services/twin-auto-ingest.js` |
| OIL daily summary | 24h (60s delay) | `PRESENT` | `services/oil-daily-summary.js` |
| Lane intel tick | configurable | `PRESENT` | `services/lane-intel-service.js` (gated: `LANE_INTEL_ENABLE_SCHEDULED=1`) |
| LifeOS scheduled jobs (commitment prods + event ingest + outreach) | internal | `PRESENT` | `services/lifeos-scheduled-jobs.js` (gated: `LIFEOS_ENABLE_SCHEDULED_JOBS=1`) |
| Governed proof parity | +45s, +120s, +240s post-boot | `PRESENT` | `services/builderos-governed-proof-parity.js` |
| Factory autopilot | configurable | `PRESENT` | `services/factory-autopilot-scheduler.js` |
| Self-repair boot check | boot-time | `PRESENT` | `services/self-repair-deploy-scheduler.js` |
| Preview expiry | 30-day | `PRESENT` | `services/preview-expiry-cron.js` |
| Reminder cron | configurable | `PRESENT` | `services/reminder-cron.js` |
| TC deadline cron | configurable | `PRESENT` | `startup/boot-domains.js` — TC-specific |
| Builder continuous queue | always-on | `SHADOW` | `scripts/lifeos-builder-continuous-queue.mjs` — shadow queue; contradicts BP law |

---

## 12. BROWSER / WEB AGENT

| Capability | Status | Key Files |
|---|---|---|
| Browser agent core | `PRESENT` | `services/browser-agent.js` |
| TC browser agent | `PRESENT` | `services/tc-browser-agent.js` |
| ClientCare browser service | `PRESENT` | `services/clientcare-browser-service.js` |
| Web search integration | `PRESENT` | `services/web-search-integration.js` |
| Web search service | `PRESENT` | `services/web-search-service.js` |
| Website audit routes | `PRESENT` | `routes/website-audit-routes.js` |
| Web intelligence | `PRESENT` | `routes/web-intelligence-routes.js` |
| Research aggregator | `PRESENT` | `services/research-aggregator.js` |
| Funnel analyzer | `PRESENT` | `services/funnel-analyzer.js` |
| Document processor | `PARTIAL` | `services/document-processor/` — directory |
| PDF signature stamp | `PRESENT` | `services/tc-pdf-signature-stamp.js` |

---

## 13. LEGACY (Hist-Owned — Do Not Extend)

Per `prompts/00-HIST-LEGACY-BOUNDARY.md`: these repos/paths are Hist-owned. Salvage only. Do not add routes or services here.

| Area | Status | Notes |
|---|---|---|
| Historical server.js analysis | Archive | `scripts/analyze-historical-server.js`, `scripts/analyze-historical-server.mjs` |
| Legacy prompts (pre-2026) | Archive | `prompts/` — read-only for contract files; others are Hist boundary |
| Old self-programming path | `PARTIAL` | `services/self-programming.js` — legacy approach; new path is BuilderOS governed loop |
| Old self-improvement loop | `PARTIAL` | `services/self-improvement-loop.js` — legacy; superseded by factory autopilot |
| Orphan routes (CJS in ESM, not imported) | `SHADOW` | Per 2026-04-18 audit: ~8 route files on disk never mounted in register-runtime-routes.js |
| Autonomous efficiency intelligence | `PARTIAL` | `services/autonomous-efficiency-intelligence.js` — older pattern; BuilderOS metrics reporter is canonical |
| ChatGPT import | `PARTIAL` | `services/chatgpt-import.js` — legacy import utility |

---

## 14. PARTS-CAR (Utilities, Infrastructure, Cross-Cutting)

These files are not product features — they are the infrastructure that products run on.

| Capability | Status | Key Files |
|---|---|---|
| Logger (Pino) | `PRESENT` | `services/logger.js` |
| Adam logger | `PRESENT` | `services/adam-logger.js` |
| Telemetry | `PRESENT` | `services/telemetry.js` |
| DB connection pool | `PRESENT` | `services/db.js` |
| DB health monitor | `PRESENT` | `services/db-health-monitor.js` |
| Migration runner | `PRESENT` | `services/migration-runner.js` |
| Env validator | `PRESENT` | `services/env-validator.js` |
| Env registry map | `PRESENT` | `services/env-registry-map.js` |
| Response cache | `PRESENT` | `services/response-cache.js` |
| Queue (BullMQ) | `PRESENT` | `services/queue.js` |
| Execution queue | `PRESENT` | `services/execution-queue.js` |
| Request tracer middleware | `PRESENT` | `middleware/request-tracer.js` |
| Error boundary middleware | `PRESENT` | `middleware/error-boundary.js` |
| Websocket handler | `PRESENT` | `services/websocket-handler.js` |
| Twilio service | `PRESENT` | `services/twilio-service.js` |
| Twilio webhook registrar | `PRESENT` | `services/twilio-webhook-registrar.js` |
| Council service | `PRESENT` | `services/council-service.js` |
| Consensus service | `PRESENT` | `services/consensus-service.js` |
| Council prompt adapter | `PRESENT` | `services/council-prompt-adapter.js` |
| AI model service | `PRESENT` | `services/ai-model-service/` |
| AI performance tracker | `PRESENT` | `services/ai-performance-tracker.js` |
| Rules engine | `PRESENT` | `services/rules-engine.js` |
| Risk scorer | `PRESENT` | `services/risk-scorer.js` |
| Continuous improvement | `PRESENT` | `services/continuous-improvement.js` |
| Outcome tracker | `PRESENT` | `services/outcome-tracker.js` |
| Decision ledger | `PRESENT` | `services/decision-ledger.js` |
| Communication gateway | `PRESENT` | `services/communication-gateway.js` |
| Prompt IR | `PRESENT` | `services/prompt-ir.js` |
| Prompt translator | `PRESENT` | `services/prompt-translator.js` |
| Tools status | `PRESENT` | `services/tools-status.js` |
| UX evaluator | `PRESENT` | `services/ux-evaluator.js` |
| Design quality gate | `PRESENT` | `services/design-quality-gate.js` |
| Notification router (LifeOS) | `PRESENT` | `services/lifeos-notification-router.js` |
| Community growth | `PRESENT` | `services/community-growth.js` |
| Credential aliases | `PRESENT` | `services/credential-aliases.js` |
| Video pipeline | `PRESENT` | `routes/video-routes.js`, `services/video-pipeline.js` |
| Game publisher | `PRESENT` | `routes/game-routes.js`, `services/game-publisher.js` |
| Knowledge context | `PRESENT` | `routes/knowledge-routes.js`, `services/knowledge-context.js` |
| Idea queue | `PRESENT` | `routes/idea-queue-routes.js`, `services/idea-engine.js` |
| Teacher OS | `PRESENT` | `routes/teacher-os-routes.js`, `services/teacher-os-students.js` |

---

## CAPABILITY GAPS — RANKED BY SEVERITY

| # | Gap | Severity | Section |
|---|---|---|---|
| G1 | Shadow queue (`lifeos-builder-continuous-queue.mjs`) contradicts BP law — founder authorization pending | HIGH | §1 BuilderOS |
| G2 | Product development gate (machine "BPB may begin now" check) not built | HIGH | §1 BuilderOS |
| G3 | Email env vars not set (Postmark) — outreach/site builder blocked from going live | HIGH | §10 Marketing |
| G4 | Native voice mic (iOS/Android) not proven — Voice Rail web-only | MEDIUM | §4 Voice Rail |
| G5 | ~8 orphan route files on disk but never imported in register-runtime-routes.js | MEDIUM | §13 Legacy |
| G6 | Historian canonical contract (NSSOT §2.0I) not fully enforced at runtime | MEDIUM | §5 Memory |
| G7 | Founder packet completeness checker doc-only, not machine-validated | MEDIUM | §1 BuilderOS |
| G8 | Determinism checker at Builder tier named in doctrine, not built | LOW | §1 BuilderOS |
| G9 | BPB schema not yet factory-wide (FACTORY-0001-v1 is proof-slice only) | LOW | §1 BuilderOS |
| G10 | Workshop, Copilot, Simulator routes on disk but not confirmed mounted | LOW | §3 LifeOS |

---

*Phase 2 changes to any capability listed here require the owning amendment to be updated atomically per SSOT rules.*
