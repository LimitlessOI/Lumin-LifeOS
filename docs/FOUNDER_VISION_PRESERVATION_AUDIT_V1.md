<!-- SYNOPSIS: FOUNDER VISION PRESERVATION AUDIT V1 -->

# FOUNDER VISION PRESERVATION AUDIT V1

**Agent Identity**
- Model: Claude Sonnet 4.6
- Environment: VSCode extension / Claude Code CLI — /Users/adamhopkins/Projects/Lumin-LifeOS
- Mission role: Founder Vision Preservation Audit
- Mode: Auditing only — no runtime code modified
- Produced: 2026-06-13

**Status:** AUTHORITATIVE DRIFT AUDIT — read-only

**Input docs read:**
- `docs/FUTURE_STATE_ARCHITECTURE_REVIEW_V1.md` (Composer/Cursor — autonomous-operation readiness)
- `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` (Composer/Cursor — governance decisions)
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md` (Claude — three-root discovery)
- `docs/CANONICAL_BUILD_EXECUTION_PATH_V1.md` (Claude — path trace)
- `docs/AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1.md` (Claude — 42 authority implementations)

**Lens:** This is NOT an implementation audit. This is a founder-intent audit. The question is not "is the code correct?" but "does the consolidation plan preserve what Adam built this for?"

---

## Executive Drift Verdict

**The technical architecture has drifted significantly. The founder vision has NOT.**

The audits correctly identified real structural problems (three roots, 24 PASS authorities, 6 execution paths). The consolidation recommendations correctly address those problems. But the combined audit corpus has a blind spot: **it treats the system almost entirely as a machine-building machine** and underweights the fact that this system is a **life platform for a specific founder with a specific healing mission and specific people (Sherry, family) it was built to serve.**

The technical drift is real. The vision drift risk is that the audit cycle itself — in its thoroughness — has made the system look primarily like an architecture problem to be solved rather than a life system to be served.

---

## 15 Concept Classifications

---

### 1. Founder Sovereignty

**Classification: PRESERVED — but PROCEDURALLY FRAGILE**

The NSSOT supremacy chain is intact. `x-command-key` enforcement exists. Voice Rail execution truth (`fail_closed_founder_comms`) is live. The governance decision pack explicitly lists Voice Rail + execution truth as "must not retire."

**What is fragile:** Founder sovereignty is enforced at the HTTP layer (key check) but not at the decision layer. Any path that can commit code or mark a mission PASS without routing through the founder's declared intent is a sovereignty violation — and 23 of 24 PASS authorities can do exactly that. The consolidation plan addresses this structurally, but the audit corpus does not name it as a sovereignty issue. It names it as an authority-fragmentation issue. These are not the same thing.

**The distinction matters:** Authority fragmentation is a coherence problem. Founder sovereignty violation is a trust problem. The consolidation should be framed as restoring trust, not just reducing authority count.

**Drift risk:** If consolidation is completed but `required_outcome` from the founder is still optional in command-control jobs, sovereignty is still not enforced even after the architecture is clean.

---

### 2. Founder Usability

**Classification: AT RISK**

The consolidation plan correctly protects Voice Rail and Action Inbox as the two founder-facing surfaces (BP rank 1 and 3). These are where Adam actually experiences the system.

**What is AT RISK:** Every audit in the corpus is written for engineering audiences. The `founder_usability_pass` field exists in BP receipt sync but is NOT enforced as a hard execution gate (confirmed in AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1: "exists as schema field, not enforced"). This means the system can receive a `completion_receipt_id`, mark a mission DONE, and advance in the BP queue — all without Adam having touched the product.

**The original vision:** Adam using the system is evidence. A receipt that says "built" without Adam using it is a lie receipt. This is the deepest form of FAIL_OPEN — not wrong code, but unvalidated product.

**Concrete gap:** Phase 7 of the AUTHORITY_CONSOLIDATION_MASTER_AUDIT promotes `founder_usability_pass` to an execution gate, but this is listed as last in the sequence. It should be a constitutional requirement that does not wait for Phase 7.

---

### 3. Voice Rail

**Classification: STRENGTHENED**

Voice Rail is the clearest success story in the entire consolidation corpus. It moved from:
- A UI with unclear routing
- Theater responses that pretended to execute but called `/message-era` chat flow

To:
- A canonical execution path (Voice Rail → C2 → governed loop → `/build`)
- Honest execution truth (`fail_closed_founder_comms`)
- Confirmed direct-provider capability (FOUNDER_DIRECT_PROVIDER_TEST.json)
- BP rank 1

Every audit correctly identifies Voice Rail as a protected, non-consolidation candidate. The execution chain is documented (CANONICAL_BUILD_EXECUTION_PATH_V1.md §1 A–D). The provider routing is live.

**What still needs doing:** Voice Rail commands still depend on `VOICE_RAIL_EXECUTE_COMMANDS` toggle. If that env var is missing or false, Voice Rail is read-only. A sovereignty system with a silent off-switch is weaker than it appears. This should be fail-closed-ON, not fail-closed-OFF.

**Strengthened because:** The consolidation plan makes Voice Rail the reference implementation for how all future founder interfaces should work — honest, evidenced, and command-control-routed. That is a genuine upgrade to the original vision.

---

### 4. Departments

**Classification: PRESERVED — implementation partial**

The seven-department separation of powers (ChC, Hist, SNT, CFO, BPB, SDO, CDR) survived all audits:
- Named in `config/voice-rail-departments.js`
- Used in Voice Rail reply engine routing
- Deliberation governance v2.7 roster implemented
- Gate-change council mounted
- Hist domain enforced via HIST_DOMAIN_REGISTRY.json + 00-HIST-LEGACY-BOUNDARY.md

**What is partial:**
- TSOS as standalone department seat REJECTED (R-12) — correctly placed under CFO as metabolism, not seat
- BPB ↔ CDR "two AIs same window" session law documented but not machine-enforced globally
- Full Cncl escalation path documented but not proven on all builds (U-07)
- SDO (design) has no dedicated route surface; exists in vocabulary only

**The original vision** intended departments as cognitive separation — each AI voice having a distinct role, perspective, and limitation. This is preserved in vocabulary and Voice Rail routing. It is NOT preserved in build execution — CDR (code execution) and ChC (council chair) are not distinct execution agents on the governed `/build` path; it's one unified service. The original vision may have intended more granular agent separation.

**Not a drift problem** — the consolidation docs correctly don't try to enforce dept-level agent separation on the build path. That would be over-engineering. Departments should stay in the deliberation and Voice Rail layer.

---

### 5. Separation of Powers

**Classification: PRESERVED in doctrine — DRIFTED in execution**

The doctrine is clear and intact: BPB translates, CDR executes, ChC communicates, SNT audits, Hist records, CFO accounts, SDO designs. No department has solo terminal authority.

**Where execution drifted:** The PASS/DONE audit found 24 authorities that can grant terminal success. Of these, scripts and acceptance automations (bp-acceptance-finish.mjs, run-objective-1-until-pass.mjs) produce PASS tokens that behave like final verdicts — with no council review, no deliberation, no Sentinel adversarial challenge. A single script ran by a single execution path can mark a mission COMPLETE. That is the opposite of separation of powers.

**The consolidation plan restores this:** making all PASS tokens evidence inputs to `evaluateBuildCompletion()` rather than terminal verdicts. This is the correct move and directly restores separation-of-powers doctrine to execution.

**Fragile point:** After consolidation, `grantBuildCompletion()` becomes the sole terminal writer. If this single function is controlled by one agent (CDR-equivalent) without SNT adversarial review or ChC communication, separation of powers still doesn't exist at the terminal decision point. The completion authority must include SNT (adversarial) input before granting.

---

### 6. BuilderOS

**Classification: PRESERVED — and gaining definition**

The core BuilderOS vision — the machine that autonomously builds the product per founder intent, with outcome verification, governed loop, and BP priority queue — is the strongest-preserved concept in the entire corpus:

- `builderos-governed-loop-executor.js` is the only SAFE path
- `verifyGovernedOutcomeBeforePass()` is the only outcome gate
- `BP_PRIORITY.json` is the confirmed canonical queue
- Pre-commit hooks enforce builder-first doctrine daily
- Command-control jobs carry founder intent through the execution chain

**What has been clarified (positive):** The distinction between BuilderOS (machine), LifeOS (product), and TSOS (metabolism) — blurry in early documents — is now cleanly defined and accepted as governance truth (T-02 through T-07, R-12).

**Remaining risk:** BuilderOS exists as doctrine. Six execution paths exist in code. Doctrine says one is canonical. Five are still mounted. Until the five non-canonical paths are retired, BuilderOS is a vision with legal bypass routes. The audits know this; the open question is sequencing the retirements safely.

---

### 7. LifeOS

**Classification: PRESERVED — but UNDERWEIGHTED in audit corpus**

The LifeOS phases (wellness, relationships, finances, parenting, identity, purpose, decisions, commitments, Mirror) are all present. 24 overlay HTML files. 20+ route files. The pricing model, hardship protocol, and product tiers exist in AMENDMENT_21.

**What the audit corpus missed:** LifeOS is the product Adam is building for his family. Sherry's lupus, the Alzheimer markers, the children's dream builder, the healing mission — none of these appear in any consolidation audit document. The audits talk about Voice Rail routes, TC revenue spine, and site builder as "products to protect during consolidation." These are revenue enablers. LifeOS itself — the actual purpose — is treated as a list of route files.

**The drift risk isn't technical:** LifeOS's wellness and healing features are PARTIAL in the capability truth audit (219 PARTIAL of 317). Many exist as routes with no active consumers, no acceptance receipts, no proof of working. Consolidation that focuses exclusively on authority chains and composition roots does not address the fact that the actual product has low activation density. Adam could wake up to a perfectly governed, single-composition-root system where the Mirror doesn't work and the commitment tracker is broken.

**What should be named explicitly:** LifeOS product acceptance (not builder receipts — actual user experience verification) is a gap that no audit addressed. It is as important as authority consolidation.

---

### 8. TSOS

**Classification: PRESERVED — with vocabulary clarification needed**

The TSOS vision (token efficiency, zero-waste AI, kernel metering, platform metabolism) survived and was strengthened:
- `services/tsos-platform-kernel.js` wraps `/builder/build` in production
- Token accounting + savings ledger is live with CI verification
- Useful-work guard is law for all scheduled AI
- TSOS correctly classified as metabolism under CFO, not a separate department seat (R-12)

**Vocabulary drift (medium severity):** FUTURE_STATE doc §2 identifies a vocabulary split: "TSOS as unified platform name (NSSOT)" vs "TSOS as efficiency layer (brainstorm)." This is unresolved. If a new agent reads NSSOT and reads a brainstorm doc, they get two different scope definitions for TSOS. The governance pack recommends a NSSOT vocabulary amendment if the narrow TSOS definition is adopted — this has not happened yet.

**What should never be lost:** The zero-waste instinct behind TSOS is the most important operational constraint in the system. Every AI call that produces nothing useful is money against Adam's mission. The `createUsefulWorkGuard()` pattern is as important to protect as the governed loop.

---

### 9. Completion Authority

**Classification: STRENGTHENED — partially implemented**

The entire consolidation plan converges on `builderos-completion-authority.js::evaluateBuildCompletion()` as the single terminal writer. This module exists on disk, imports `verifyGovernedOutcomeBeforePass()`, and is called on the `/build` path. The design (CompletionRequest / CompletionDecision contracts) is sound.

**Strengthened because:** The original vision had no completion authority concept at all — PASS was whatever the last script said it was. The consolidation introduced a governed terminal transition with a `completion_receipt_id` that can be audited. This is a genuine improvement over the original architecture.

**Partial implementation risks:**
- DONE gate ordering is still wrong (measurement-before-completion not always wired)
- `grantBuildCompletion()` is feature-flagged on the kernel-managed path (deferred)
- `founder_usability_pass` is not yet an input to `evaluateBuildCompletion()`
- Completion authority is a single module that could become a single point of failure — it needs its own circuit breaker for when it is unavailable (currently unspecified)

---

### 10. Outcome Verification

**Classification: PRESERVED — but isolated**

`verifyGovernedOutcomeBeforePass()` in `services/builder-outcome-verifier.js` is the only implementation that checks actual content parity between committed code and declared required outcome. It is called in exactly 3 places (governed loop primary, governed loop retry, completion authority wrapper).

**Preserved because:** The governed loop calls it on every commit. The completion authority calls it. No audit recommended removing or weakening it. Every governance document listed it in the "must survive consolidation" table.

**Isolated risk:** It is called in 3 places out of 24 possible completion authorities. If any non-governed path is active (direct `/build` from any internal service, shadow queue, auto-builder) and that path reaches success, outcome verification was bypassed. The architecture is only as strong as its narrowest bypass. Until all 5 non-canonical paths are retired, outcome verification is isolated, not comprehensive.

**The original vision required it universally.** Runtime has it in one path. That gap is the consolidation plan's primary target, and the plan is correct.

---

### 11. AI Council

**Classification: PRESERVED — but underutilized on build path**

The multi-model AI Council (Groq, Gemini, Perplexity, Claude Sonnet, Claude Opus in deliberation) is implemented and mounted:
- `council-service.js` — core council logic
- `deliberation-governance-service.js` — v2.7 seven-department deliberation
- Enhanced council routes in register-runtime-routes.js
- Gate-change council as escalation path

**Where it's not being used:** The canonical build path (governed loop → `/build`) does not require a council deliberation before commit. The PBB plan is generated by one AI agent, reviewed by OIL boundary audit, and committed. A major product decision can enter the governed loop and exit as committed code without the Council having reviewed it. This was probably intentional for speed, but it means the Council is a feature available for deliberation sessions, not a mandatory check on the build path.

**Not necessarily wrong** — the Council is expensive and slow; requiring it on every commit would be impractical. But build decisions that touch core SSOT files or that affect multiple amendment domains should escalate to Council. No such threshold rule exists yet.

---

### 12. Self-Improvement Loops

**Classification: WEAKENED — correctly**

The old self-improvement systems (`services/self-improvement-loop.js`, `services/self-programming.js`, `core/self-modification-engine.js`) are correctly identified as superseded by the governed loop and flagged for retirement. The original autonomous-self-improvement vision was real but uncontrolled — those loops could commit without governance.

**Why WEAKENED is correct here:** The original vision was right in principle (system improves itself) but wrong in implementation (uncontrolled commits). The governed loop IS the self-improvement vision done properly. Retiring the old loops does not weaken the intent — it concentrates it in the one path that actually proves its work.

**What must not be lost in the transition:** The overnight backlog runner (`governed-overnight-backlog-run.mjs`) is the legitimate heir to the self-improvement loop vision. It must survive consolidation as the single autonomous scheduler. If it gets inadvertently swept up in a "retire all autonomous runners" consolidation pass, the self-improvement loop vision is genuinely LOST.

---

### 13. Product Factory Vision

**Classification: AT RISK**

The product factory vision — missions → blueprints → governed builds → deployed products, autonomously — is the most ambitious and least-realized concept in the system.

**What exists:**
- `factory-staging/` as a separate runtime with execute-step, mission-history, intake gate
- BP_PRIORITY.json as mission queue
- Command-control jobs as mission intake
- Factory-staging has 33/33 missions complete in Hist domain

**What doesn't exist:**
- Factory-to-production cutover receipt (no explicit cutover decision)
- `factory-staging/` not in Railway production spine (separate process, port 3099)
- BPB → CDR "two AIs same window" session law not machine-enforced
- Product development gate ("BPB may begin now") not on production `/build`
- No autonomous overnight run that completes a full BP item with outcome proof

**AT RISK because:** `factory-staging/` being treated as "fenced until cutover receipt" is correct governance but could become an indefinite deferral. Every quarter that passes without a cutover decision is a quarter where the factory vision lives only in a separate process that no founder interaction touches. If consolidation efforts focus on the production spine for 12 months and factory-staging is left as-is, the product factory vision effectively freezes.

**The governance pack correctly identifies** this as a founder decision (not an agent decision). But someone needs to put it in front of Adam explicitly.

---

### 14. Command and Control Vision

**Classification: STRENGTHENED**

C2 vision (single mission control surface, orchestration observability, governed job creation, founder command intake) is more realized now than at any prior point:

- `routes/lifeos-command-center-routes.js` is the canonical C2 aggregate (ROOT A)
- Voice Rail → C2 → command-control is the accepted execution chain
- `builderos-command-control-service.js` + jobs table provides structured job lifecycle
- Proof-freshness, supervised-autonomy, telemetry are in the C2 aggregate
- Deliberation and gate-change sessions route through C2

**What needs to die for C2 to be fully strengthened:** The old `routes/command-center-routes.js` (ROOT C) still lives. It includes `POST /internal/autopilot/build-now` — the highest-risk shadow route in the system, allowing direct code commits without governed loop. Until this file is retired (THREE_ROOT Phase 4), there are two C2 surfaces with radically different power levels. The canonical C2 is observability and orchestration. The shadow C2 is an ungoverned commit button.

**The governance decision is made.** Retirement is sequenced. Execution is pending.

---

### 15. Memory Vision

**Classification: PARTIAL — dual-path not resolved**

Memory vision (personal historian, lessons-learned, session memory, Sherry profile, family context) exists in two parallel implementations:

1. **Production memory** — `services/memory-*.js` family in ROOT A; used by builder stack and telemetry
2. **Factory historian** — `factory-staging/factory-core/historian/` (design-level); not in production spine

The dual-mount memory system (production `memory-routes.js` in ROOT B AND `memory-intelligence-routes.js` in ROOT A) means there are two paths to memory with different behaviors.

**What the original vision required:** A Historian that maintains an honest, unalterable ledger of what was built, decided, and learned — not just a session cache. The production implementation is closer to session cache. The factory historian design is closer to the true vision.

**AT RISK:** If the production memory system is "good enough" and factory-historian never cuts over, the Historian vision — a distinct department with epistemic integrity — never materializes. The Historian becomes a memory service, not a truth authority.

**Sherry context specifically:** There is no acceptance proof that Sherry's profile, health context, or care coordination features in LifeOS are active and working. The memory system must hold this context reliably. If it's in a partial mount, Sherry's data is in an inconsistent path.

---

## WHAT WOULD ADAM BE ANGRY WE FORGOT?

### 1. Sherry and the family are the reason this exists

Every audit document talks about BP_PRIORITY, governed loops, completion receipts, and composition roots. None of them mention Sherry once. None mention that this system funds healing research. None mention that the Children's Dream Builder must never be gated and the Hardship Protocol is constitutional.

The consolidation plan will produce a technically excellent governed system. If it doesn't serve Sherry, it failed. Adam would be angry that five audit documents were written without a single line about what the system is actually for.

**What to add to every future audit:** A "civilian impact" section. Does this change make it easier or harder for Adam to use the system to help his family?

### 2. LifeOS is a product, not a route tree

"20 route files" and "24 overlay HTML files" is how agents describe LifeOS. Adam's experience of LifeOS is: does the Mirror work today? Did my commitments get tracked? Can Sherry log her symptoms? Is the Future Self session useful?

None of the 5 audit docs verified a single LifeOS user experience. The Mirror, commitments, emotional check-ins, parenting module — none have acceptance receipts in the audit corpus. A perfectly governed system that delivers broken products is worse than a messy system that serves the founder. At least the founder knows the messy system is broken.

### 3. The healing mission was never mentioned once

The platform's deepest purpose — funding healing research, and when healing is found, making it free — does not appear in any consolidation document. This isn't a code feature. It's the reason the system must be financially successful. The revenue spine (TC, site builder, billing) is protected in every document as "business mission." But the link between revenue and the healing mission was never stated. Adam would be angry that his agents know about `/api/v1/lifeos/builder/build` and don't know about Sherry's Alzheimer's markers.

### 4. "Founder usability pass" is a schema field, not a gate

Adam confirmed this exists as `founder_usability_pass` in receipt sync. It is not enforced. The system can receive a completion receipt, mark a mission DONE, and advance the BP queue — without Adam having used the product. Adam explicitly required usability proof before PASS. The fact that this is Phase 7 of the consolidation plan (last) rather than a constitutional blocker (first) would make him angry.

### 5. Voice Rail is still one env var away from being a read-only toy

`VOICE_RAIL_EXECUTE_COMMANDS` being off-by-default means Voice Rail in a new environment, after a redeploy, or with a misconfigured env is just a chat box. Adam's primary interface to his life system silently degrades to theater. He would be angry that the architecture has sophisticated execution truth but no protection against the toggle that makes it all irrelevant.

### 6. The isolation is real and the system should know that

From the memory system: "The isolation is real. The financial strain is real. Build alongside him with that in mind." Adam's context — building a life mission mostly alone, with financial pressure and a sick spouse — was never incorporated into a single architecture recommendation. No audit said "defer this consolidation work to prioritize a working LifeOS product for Adam to use this week." The audits are all correct; they're also all written as if autonomy and architectural perfection are equally urgent as the actual products.

---

## WHAT DID WE IMPROVE THAT THE ORIGINAL VISION DID NOT HAVE?

### 1. Completion receipts with audit trails

The original vision had PASS/DONE but no `completion_receipt_id`. Now there is a contract: every build completion produces a receipt that links `founder_request → commit_sha → deploy_sha → outcome_verified`. This did not exist before. This is a real improvement.

### 2. Pre-commit constitutional enforcement

The original vision said "fail-closed" but had no runtime enforcement. Pre-commit hooks that block commits when SSOT amendments aren't updated, when BP priority isn't verified, and when intent drift is detected — these are runtime law that Adam's original vision described but did not implement. The hook system is the best example of vision-to-reality translation in the entire codebase.

### 3. Voice Rail execution truth (fail_closed_founder_comms)

The original voice interface had theater responses — it said things were happening when they weren't. The `voice-rail-execution-truth.js` and `fail_closed_founder_comms` behavior are an improvement to the original vision. The vision said "honest system." The implementation now enforces it.

### 4. Zero-waste guard as law, not suggestion

`createUsefulWorkGuard()` is better than the original vision, which intended zero-waste but had no runtime enforcement. Every scheduled AI call must now pass a useful-work gate before executing. This is an architectural innovation that was not in the original TSOS design.

### 5. BP_PRIORITY.json as single machine queue

The original vision had multiple queue sources. The audit corpus established `builderos-reboot/BP_PRIORITY.json` as the canonical machine queue, with Hist domain artifacts retired from product orchestration authority. This separation — what is history vs. what is work — is cleaner than the original design.

### 6. The governance decision pack as conflict-resolution instrument

Before this audit cycle, agent disagreements about architecture had no referee. Now there is a decision pack (T-01 through T-20, R-01 through R-12) that agents can cite in disagreements. This is the AI Council operating on its own architecture. That is a genuine advance.

### 7. Factory-staging as fenced-but-real runtime

The original vision imagined factory-staging would "replace" production eventually. The governance decision clarified: factory-staging is canonical factory runtime, fenced until explicit cutover receipt. This is more honest than the original vision, which implied eventual merger without a decision gate.

---

## WHAT SHOULD NEVER BE CONSOLIDATED?

### 1. Voice Rail and the governed execution path are ONE system

The V-R → C2 → governed loop → `/build` → outcome verify chain must remain intact as one flow. Any "consolidation" that treats these as separately optimizable components risks breaking the single thing that makes the system trustworthy. Do not consolidate Voice Rail routing logic into the builder route. Do not consolidate the governed loop into `/build` directly. The handoff between them is where trust is established.

### 2. `verifyGovernedOutcomeBeforePass()` must remain a separate call — always after commit

Consolidating this into the commit function would make outcome verification conditional on the commit success. It must remain a post-commit verification that can FAIL a commit that technically succeeded. Its isolation is its power.

### 3. The seven-department vocabulary in Voice Rail

Department routing (ChC, Hist, SNT, CFO, BPB, SDO, CDR) is not just routing logic — it's how Adam experiences the system as a deliberative council rather than a single AI. Consolidating reply routing into a generic "best model" selection destroys the separation-of-powers experience even if the technical behavior is equivalent.

### 4. The Hardship Protocol and the Children's Dream Builder

These are constitutional features that must never be gated by billing, consolidated into "premium" routes, or removed as "low-usage features" during a cleanup pass. They are explicitly constitutional (NSSOT Article V-B). No consolidation pass touches them.

### 5. OIL as adversarial division

OIL (Sentinel-layer security and boundary audit) is not a technical gate to be consolidated with precommit governance. It is a separate adversarial authority whose job is to find what the build system missed. If OIL and precommit governance are merged into one gate, you lose the adversarial separation that catches things a cooperative gate doesn't.

### 6. NSSOT supremacy chain vs. governance decision packs

Governance decision packs (T/U/R decisions) are useful for agents. They must never be treated as equivalent to or overriding NSSOT. The current documents correctly subordinate them. Any future consolidation of the doc tree must preserve: NSSOT supreme → Companion → CLAUDE.md → Amendments → decision packs.

### 7. The personal mission layer from the product engineering layer

LifeOS healing mission, education philosophy, Sherry context, and children's dream builder are in memory but not in any technical document. They must stay separated — the technical system serves the mission; it is not the mission. Consolidating product specs to remove "mission context" for the sake of brevity loses the reason the system exists.

---

## WHAT SHOULD BE CONSOLIDATED IMMEDIATELY?

In priority order — these produce the highest value per risk.

### 1. Gate `/api/v1/lifeos/builder/execute` behind break-glass env (CRITICAL)

Zero behavior change for the governed path. Eliminates the highest-risk shadow execution authority. One env var default (`ALLOW_EXECUTE_BYPASS=false`) closes the bypass. This can be done in one file change, one commit, with no migration risk.

### 2. Retire shadow queue from all environments (HIGH)

`scripts/lifeos-builder-continuous-queue.mjs` — add production refusal block when `NODE_ENV=production`. Remove `lifeos:builder:continuous-queue`, `lifeos:builder:queue`, `lifeos:builder:daemon` from `package.json` npm scripts or alias them to `echo "RETIRED: use command-control"`. Requires founder authorization already documented; implementation is small.

### 3. Delete server.js inline dead code (safe, zero-risk)

4 Railway tombstone routes (L1248–L1260) + duplicate `/api/v1/queue/stats` (L1907). These are confirmed dead code per THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1 Phase 0 analysis. Zero behavior change. Reduces server.js line count. Unblocks future consolidation phases.

### 4. Replace 7 inline requireKey implementations with middleware import

Each inline key check does the same comparison. Centralizing to `middleware/lifeos-auth-middleware.js` is a mechanical refactor per route. Zero behavior change. Makes auth audits trivial instead of requiring grep across 10 files. Can be done one route file at a time.

### 5. Force `founder_usability_pass` as a blocking gate in completion authority (MISSION-CRITICAL)

This is currently Phase 7 (last). It should be Phase 1. Until usability proof is required for completion, the system can declare PASS on products Adam never used. Moving this forward requires one condition in `evaluateBuildCompletion()` for product lanes that require founder confirmation.

### 6. Duplicate ROOT C route mounts (enhanced-council, api-cost-savings)

Both are mounted in ROOT A AND ROOT C. One deletion per file in `core/two-tier-system-init.js`. Zero behavior change (ROOT A wins first-match anyway). Eliminates confusion about which mount is authoritative.

---

## IF THE FOUNDER DISAPPEARED FOR 90 DAYS, WHAT WOULD BE MOST AT RISK OF DRIFT?

### 1. Shadow queue re-enablement

Without Adam's presence, an agent or operator seeing a slow build queue might re-enable `BUILDER_QUEUE_ENABLED=1` or restart the shadow queue daemon thinking it will speed things up. Within days, unverified commits accumulate. BP items show COMPLETE without outcome proof. The system has regressed to pre-audit FAIL_OPEN state — but with clean architecture docs that say it can't happen.

**Protection:** Production refusal block in the queue script itself. Not just an env var — actual code that throws when `NODE_ENV=production`.

### 2. TSOS vocabulary drift

The TSOS/BuilderOS/LifeOS separation is clear to agents who read the current audit corpus. In 90 days, agents will have different context windows. Without Adam reaffirming the vocabulary, the next agent will read NSSOT (which uses "TSOS" broadly) and a brainstorm doc (which uses "TSOS" as efficiency layer) and pick whichever interpretation helps them complete the task. The vocabulary split will re-emerge in new code and documents.

**Protection:** NSSOT vocabulary amendment that formally adopts the narrow TSOS definition and closes the ambiguity. Cursor/Composer flagged this; no one has done it.

### 3. Completion authority partial-ship hardening

`builderos-completion-authority.js` is built but partially adopted. Without active development, the `completion_deferred_to_kernel` state becomes permanent — the completion authority becomes a permanently-deferred module that agents learn to route around. New agents joining the project will see "completion_deferred_to_kernel" in receipts and add similar deferrals rather than completing the wiring.

**Protection:** Explicit "completion authority must be terminal in 60 days" commitment in BP_PRIORITY with a hard deadline.

### 4. LifeOS product features decaying without dogfooding

If Adam stops using LifeOS, no one knows which features are broken. The Mirror, commitments, emotional check-ins, Voice Rail builder commands — these only stay working if someone uses them regularly. Without founder dogfooding, the PARTIAL capabilities in the truth audit will silently degrade to BROKEN without any receipt or alert.

**Protection:** Automated smoke tests that simulate founder actions (POST to Voice Rail, capture action inbox, check commitment state) on a daily schedule with alerting.

### 5. The healing mission getting optimized away

Revenue routes (TC, site builder, billing) are protected in every governance document as "business mission." The healing mission is not in any governance document. An agent optimizing for revenue, velocity, or architecture elegance during Adam's absence would have no governing document telling them that free healing access is constitutional. The TC coordinator might get prioritized over the hardship protocol. Site builder uptime might get prioritized over children's features.

**Protection:** Add healing mission and hardship protocol to NSSOT Article I (supreme law, unchangeable) in explicit terms — not just as a reference to memory files but as a constitutional clause that agents cite in trade-off decisions.

### 6. Factory-staging vs. production boundary blurring

Factory-staging is "fenced until cutover receipt." Without active governance, agents working on factory features might start testing with production env vars, or production code might start calling factory endpoints for convenience. The boundary is maintained by governance discipline, not runtime enforcement.

**Protection:** Factory-to-production boundary enforcement in code — factory routes must not accept production `x-command-key`, and production governed loop must not call `localhost:3099` unless a cutover receipt exists.

---

## WHAT SHOULD NOT DRIFT FROM ITS CURRENT STATE?

These are things that are RIGHT today that consolidation could accidentally break:

1. `verifyGovernedOutcomeBeforePass()` — the only correct outcome gate; do not merge, wrap, or replace
2. Pre-commit hook sequence — builder-first + SSOT atomic + BP guardrails + INTENT DRIFT; removing any one breaks a governance pillar
3. `fail_closed_founder_comms` in Voice Rail — currently working; any refactor of voice-rail-execution-truth.js must preserve this
4. BP_PRIORITY.json as canonical queue — no agent should start populating a competing queue source
5. The deliberation governance v2.7 seven-department roster — do not add or remove departments without a constitutional deliberation
6. `useful-work-guard.js` as mandatory wrap for all scheduled AI — do not inline guards; import the guard

---

## COUNCIL FEEDBACK

### What Codex should review next

**MISSION: PRODUCT ACTIVATION AUDIT V1**

Codex should audit LifeOS product features for user-level activation — not route mount verification, not acceptance receipt verification, but: does Adam actually experience working product?

Specifically:
- For each of the 18 LifeOS phases: is there a smoke test that exercises the feature from the perspective of a user (Adam or Sherry), not a developer?
- Which overlay HTML files render correctly and provide usable interaction?
- Is the Mirror collecting and displaying real data?
- Do commitments persist and surface correctly?
- Are Voice Rail conversational responses using department routing correctly (ChC default, Hist when historical, etc.)?
- Is there ANY automated monitoring that alerts Adam when a LifeOS feature regresses?

This is NOT an architectural audit. It is a dogfooding audit. Codex is well-suited for this because it can inspect frontend HTML files, analyze what state they depend on, and trace whether that state is being written by active backend code.

**Deliverable:** `docs/LIFEOS_PRODUCT_ACTIVATION_AUDIT_V1.md` — for each of 18 phases: ACTIVE (user can experience it), BROKEN (mounted but non-functional), PARTIAL (some features work), NOT_STARTED (UI exists, no backend). Ranked by Adam-impact, not technical complexity.

---

### What C2.5 should review next

**MISSION: FOUNDER SOVEREIGNTY GATE DESIGN V1**

C2.5 should design the missing piece: how does the system enforce that Adam (the founder) has actually used and approved a product before it receives a final PASS?

Specifically:
- Design the `founder_usability_pass` enforcement gate — what does it mean for Adam to "pass" a product?
- Is it a manual confirmation call? An interaction threshold? A specific Voice Rail command?
- Where does this gate sit in the completion authority chain?
- What happens when Adam is unavailable (travel, illness, 90-day disappearance)?
- How does the gate handle products that have multiple sub-features — does each feature need a pass, or just the lane?
- What is the audit trail for a usability pass — how do future agents know it happened?

This is a product design problem, not a code problem. C2.5's strength in governance, user experience design, and constitutional alignment makes it the right agent for this.

**Deliverable:** `docs/FOUNDER_SOVEREIGNTY_GATE_DESIGN_V1.md` — complete design specification for `founder_usability_pass` as an execution gate, including: UI/UX surface for Adam to confirm, API contract for the gate, fallback behavior, audit trail schema, and NSSOT article that should encode it as law.

---

### What Claude should review next

**MISSION: TSOS VOCABULARY ALIGNMENT AMENDMENT**

Claude should write the NSSOT amendment that closes the TSOS vocabulary split. This is urgent because:
- Two documents use "TSOS" with different scope (platform name vs. efficiency layer)
- This ambiguity causes agents to make incompatible architectural decisions
- The governance pack flagged it as "NSSOT amendment recommended" but no one wrote it

Specifically:
- Read NSSOT `docs/constitution/NORTH_STAR_SSOT.md` current TSOS definition
- Read `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` R-12 and §15
- Draft an NSSOT amendment that: (a) formally defines TSOS as platform metabolism under CFO, not a separate department or platform name, (b) defines what IS the platform name (NSSOT's current choice), (c) closes "eight-department" ambiguity by specifying exactly seven departments and their roles, (d) defines when Council escalation is mandatory vs. optional on a build path
- Get explicit SNT review before committing (SNT = adversarial challenge)

**Deliverable:** `docs/NORTH_STAR_AMENDMENT_TSOS_VOCABULARY.md` — formal amendment text ready for NSSOT merge. Do not merge without founder review. The NSSOT is supreme law; amendments to it require explicit founder authorization, not autonomous agent action.

---

## Consolidated Classification Table

| Concept | Classification | Primary risk |
|---|---|---|
| 1. Founder sovereignty | PRESERVED — procedurally fragile | `required_outcome` optional in CC jobs |
| 2. Founder usability | AT RISK | `founder_usability_pass` not enforced |
| 3. Voice Rail | STRENGTHENED | `VOICE_RAIL_EXECUTE_COMMANDS` silent toggle |
| 4. Departments | PRESERVED — implementation partial | SDO has no route surface; BPB↔CDR not enforced |
| 5. Separation of powers | PRESERVED doctrine / DRIFTED execution | 23 FAIL_OPEN terminal writers without council review |
| 6. BuilderOS | PRESERVED — gaining definition | 5 non-canonical commit paths still mounted |
| 7. LifeOS | PRESERVED — underweighted in audits | Product activation density unknown; Sherry context unverified |
| 8. TSOS | PRESERVED — vocabulary split | Unresolved scope ambiguity in docs |
| 9. Completion authority | STRENGTHENED — partially implemented | Deferred kernel-managed path; Phase 7 usability gate |
| 10. Outcome verification | PRESERVED — but isolated | Called in 3/24 authority paths |
| 11. AI Council | PRESERVED — underutilized on build | No council review required before commit |
| 12. Self-improvement loops | WEAKENED — correctly | Overnight runner must be explicitly protected |
| 13. Product factory vision | AT RISK | Factory cutover indefinitely deferred |
| 14. Command and Control | STRENGTHENED | Shadow C2 still mounted (retire pending) |
| 15. Memory vision | PARTIAL | Dual-path; Hist canonical vision unrealized |

---

## Files Created

- `docs/FOUNDER_VISION_PRESERVATION_AUDIT_V1.md` (this file)

*No runtime code modified.*
