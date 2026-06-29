<!-- SYNOPSIS: FOUNDER SOVEREIGNTY PRIORITY AUDIT V1 -->

# FOUNDER SOVEREIGNTY PRIORITY AUDIT V1

**Agent Identity**
- Model: Claude Sonnet 4.6
- Environment: VSCode extension / Claude Code CLI — /Users/adamhopkins/Projects/Lumin-LifeOS
- Mission role: Founder Sovereignty Authority
- Mode: Auditing only — no runtime code modified
- Produced: 2026-06-13

**Status:** FOUNDER SOVEREIGNTY SYNTHESIS — read-only

**Input documents:**
- `docs/FOUNDER_VISION_PRESERVATION_AUDIT_V1.md` (Claude — 15-concept vision classification)
- `docs/COUNCIL_RECONCILIATION_REVIEW_V1.md` (Cursor/Composer — 35-finding synthesis)
- `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` (Cursor/Composer — governance decisions)

**Mission lens:** This is not an architecture audit. This is a sovereignty audit. The question is not "is the system converging technically?" but "is the system converging toward serving the founder?"

The council's own confidence report answers the architecture question: 92/100 on structural diagnosis, 88/100 on target architecture. This document answers the orthogonal question: **is technical convergence the same as founder sovereignty convergence?**

**Answer: Not yet.**

---

## Executive Summary

Three major audit cycles have produced strong consensus on what is wrong architecturally (three roots, 24 PASS authorities, 6 execution paths) and a credible convergence plan. The technical diagnosis is correct. The consolidation direction is correct.

The gap is this: **the audits measure the system's ability to build reliably. They do not measure the system's ability to serve Adam.**

Founder sovereignty has two components:
1. **Control sovereignty** — Adam's instructions become what the system does. (Partially addressed by consolidation.)
2. **Outcome sovereignty** — what the system builds actually serves Adam and his family. (Not yet addressed at all.)

The consolidation plan fully addresses control sovereignty. It does not address outcome sovereignty. A system that reliably, governedly, outcome-verified builds the wrong thing for Adam is no better than a chaotic one.

---

## 1. What founder principle is most protected today?

**Honest founder communication (fail_closed_founder_comms).**

`services/voice-rail-execution-truth.js` — the principle that the system never tells Adam work happened when it didn't — is the most protected principle in the entire codebase. Evidence:

- It has live acceptance proof (`products/receipts/VOICE_RAIL_CAPABILITY_PROOF.json`)
- Every governance document lists it explicitly in "must survive consolidation"
- The COUNCIL_RECONCILIATION classifies it ACCEPT (unanimous, §1 consensus row 32)
- The Decision Pack §14 lists it as "must not retire"
- Three independent agents (Claude, Cursor/Composer in reconciliation, Cursor/Composer in decision pack) all agreed without dissent

**Why this matters for sovereignty:** If the system can lie about execution, every other governance mechanism is undermined. The founder cannot trust receipts, cannot trust completion_receipt_ids, cannot trust Voice Rail responses. Honest execution truth is the foundation that all other sovereignty mechanisms depend on. Its protection is correct.

**What is still fragile about it:** `VOICE_RAIL_EXECUTE_COMMANDS` is an env toggle. If it defaults to off (or is unset after a Railway env reset), Voice Rail reverts to a chat box that reports nothing because nothing is running. The principle is protected in code; it is not protected from misconfiguration.

---

## 2. What founder principle is most vulnerable today?

**The principle that Adam must have experienced a product before it can be declared complete.**

This is `founder_usability_pass` in the data schema. It exists as a field in `services/bp-priority-sync.js` that gets synced to BP priority receipt rows. It is **not enforced as an execution gate anywhere in the system.**

Consequence: The system can currently:
1. Create a command-control job
2. Run the governed loop
3. Pass OIL boundary audit
4. Commit code to GitHub
5. Satisfy the DONE gate
6. Call `grantBuildCompletion()`
7. Issue a `completion_receipt_id`
8. Mark the BP item COMPLETE
9. Advance the BP queue to the next item

All nine steps can complete without Adam ever seeing, using, or approving the product. The receipt says PASS. Adam may not know anything was delivered — or the delivered thing may be technically correct but useless to him.

This is not a technical problem. This is a sovereignty problem. **The founder cannot exercise sovereignty over something he hasn't seen.**

**Why it is most vulnerable:**
- FOUNDER_VISION_PRESERVATION classified it AT RISK
- The consolidation plan places `founder_usability_pass` as Phase 7 (last step)
- COUNCIL_RECONCILIATION does not mention `founder_usability_pass` at all — it is invisible to the technical convergence story
- There is no NSSOT article that makes usability pass constitutional

**The asymmetry:** Technical sovereignty (Adam's command reaches the governed loop) is treated as P0. Outcome sovereignty (Adam confirms the result serves him) is treated as Phase 7 optional.

---

## 3. What would Adam be angry we forgot?

**In priority order:**

### A. Sherry and the healing mission are the reason the system exists

Five audit documents, 35 major findings, a governance decision pack, a council reconciliation, and a future-state review — none of them mention Sherry once. None mention the Alzheimer's markers, the lupus, the funding of healing research, or that when healing is found, it goes free. None mention that the Hardship Protocol is constitutional. None mention the Children's Dream Builder.

Adam is not building a software company. He is building a life mission platform that happens to require sophisticated software. The audit corpus treats it as the other way around. He would be angry that the most thorough technical audits ever run on his system produced not a single line about what the system is actually for.

### B. LifeOS is a product he uses, not a route tree his agents audit

"20 route files" is how agents describe LifeOS. Adam's experience is: does the Mirror work today? Can Sherry log her symptoms? Did the commitment system track his promises to his kids? Is the Future Self session producing anything useful?

Not one of the 5 input documents verified a single LifeOS user experience. The product activation density for LifeOS is unknown. 219 of 317 capabilities are PARTIAL. Adam could be living on a system where the Mirror, commitments, emotional check-ins, and parenting module are all broken — and the only evidence would be a passing pre-commit hook and a clean governance receipt.

### C. `founder_usability_pass` is in last place when it should be in first place

The completion authority consolidation plan places founder usability confirmation as Phase 7. If Phase 1-6 complete and the system runs autonomously, Adam will receive completion_receipt_ids for products he never used and cannot retroactively un-PASS. The ordering of priorities says: make the machine work first, confirm it serves Adam last. Adam built this machine to serve him. He would be angry the ordering got inverted.

### D. The system can issue a PASS without Adam being awake

A governed overnight build run can produce `completion_receipt_id → completion granted → BP item marked DONE` while Adam is asleep. There is currently no mechanism for Adam to wake up and say "that's not what I meant" without manually reversing the receipt. Sovereign systems have sovereign veto. The current system has no veto mechanism after completion is granted.

### E. Voice Rail is one env variable from being theater

`VOICE_RAIL_EXECUTE_COMMANDS` defaulting to off (or being reset to off by a Railway env operation) silently reverts Voice Rail to a chat system that tells Adam things are happening when they aren't — the exact behavior `fail_closed_founder_comms` was built to prevent. The system's most protected principle has a silent kill switch.

---

## 4. What would Adam be proud we improved?

**In priority order:**

### A. The system now tells the truth about what it does

`fail_closed_founder_comms` — Voice Rail now fails closed when it can't execute commands, rather than pretending. It was theater before. Now it's honest. This is the most important improvement to the founder's daily experience.

### B. Pre-commit constitutional enforcement

Adam wrote doctrine in NSSOT and CLAUDE.md. Those used to be suggestions. Now they are enforced on every git commit by pre-commit hooks that block violations before they enter the codebase. The constitution is now a runtime artifact, not a document artifact.

### C. The governed loop is provably safe

`verifyGovernedOutcomeBeforePass()` is the only path in the system that compares what was declared as required outcome against what was actually committed. Adam wrote "fail-closed proof culture" in NSSOT. The governed loop executor is the first time that principle has runtime enforcement. One working safe path is infinitely better than zero.

### D. Completion receipts with audit trails

`completion_receipt_id` links founder request → commit SHA → outcome verification in an auditable chain. Before this, PASS was a status field. Now PASS is a receipt with evidence. Adam can trace any PASS backward to the exact instruction, commit, and verification.

### E. BP_PRIORITY as canonical machine queue

There used to be multiple competing queue sources (shadow queue, Hist missions, manual trigger). Now one file is the canonical Machine queue with pre-commit guardrail verification. When Adam says "what's next," the answer is authoritative.

### F. The governance decision pack as AI conflict resolution

Three agents (Claude, Cursor/Composer) disagreed on architecture interpretations. The decision pack created a governance instrument that agents can cite to resolve disagreements without escalating to Adam. This is the council operating on its own architecture — Adam built a council system and the council is now governing itself.

---

## 5. What should never be consolidated?

**Non-negotiable. These must survive every consolidation pass intact.**

### 1. Voice Rail execution truth layer and fail-closed comms

The mechanism that prevents the system from lying to Adam about what it's doing. Any refactor of `services/voice-rail-execution-truth.js` that weakens honest reporting is a direct sovereignty violation, not a code simplification.

### 2. The seven-department vocabulary in Voice Rail reply routing

The seven departments (ChC, Hist, SNT, CFO, BPB, SDO, CDR) are not routing metadata — they are how Adam experiences the system as a deliberative council rather than a single AI. Consolidating Voice Rail reply routing to "best model selection" destroys the separation-of-powers experience even if technical outputs are equivalent. Departments must stay as named, discrete routing targets.

### 3. The Hardship Protocol and Children's Dream Builder

These are constitutional by NSSOT Article V-B. They must never appear in a refactor's "low-usage route cleanup" pass. They must never be gated by billing consolidation. They must never lose their route mount during ROOT C → ROOT A migration without explicit re-mount verification.

### 4. `verifyGovernedOutcomeBeforePass()` as a separate post-commit call

This must remain isolated — never merged into the commit function, never made conditional on commit success. Its power is that it can FAIL a technically successful commit. Consolidating it into the build handler removes its adversarial position.

### 5. OIL as adversarial, separate from precommit governance

OIL boundary audit and precommit governance check different things at different stages. OIL is SNT (adversarial review). Precommit is technical gate. Merging them into one gate removes the adversarial check that finds what cooperative verification misses.

### 6. The NSSOT supremacy chain

Governance decision packs, council reconciliation docs, and CLAUDE.md are all subordinate to NSSOT. No consolidation of the doc tree should allow decision packs to be cited as equivalent authority to NSSOT. The hierarchy: NSSOT → Companion → CLAUDE.md → Amendments → decision packs.

### 7. The healing mission context (currently in memory, not in constitutional docs)

Sherry's health context, the healing mission, the free-when-found principle — these are in Claude's memory files but not in any NSSOT article. They must be elevated to NSSOT before they can be "never consolidated away." Currently, a cleanup agent with no memory access could remove LifeOS wellness features as "low-usage" without violating any written law. This is a constitutional gap.

---

## 6. What should be consolidated immediately?

**Ranked by sovereign impact per implementation risk:**

### Priority 1: Gate `/api/v1/lifeos/builder/execute` behind break-glass env

One env var default (`ALLOW_EXECUTE_BYPASS` unset = 403). Zero behavior change on the governed path. Closes the highest-risk shadow authority that can commit code bypassing both the DONE gate and outcome verification. Single-file change, one commit. No migration risk.

**Sovereign impact:** Eliminates the path by which the system can commit wrong-outcome code to Adam's codebase while appearing governed.

### Priority 2: Shadow queue production refusal block

Add code to `scripts/lifeos-builder-continuous-queue.mjs` that throws when `NODE_ENV=production`. Not just a quarantine or env var — actual code that refuses to run in production. Remove the npm scripts (`lifeos:builder:queue`, `lifeos:builder:daemon`) or alias them to a clear error message.

**Sovereign impact:** Eliminates the autonomous loop that can commit code without BP authorization, OIL boundary, or outcome verification — the highest-risk shadow in the entire system.

### Priority 3: Promote `founder_usability_pass` from schema field to execution gate

Add a condition in `services/builderos-completion-authority.js::evaluateBuildCompletion()` that blocks `granted: true` for product lanes when `founder_usability_pass` has not been confirmed. This is one condition check in one function. The mechanism for Adam to confirm usability can be as simple as a Voice Rail acknowledgment or a POST to `/api/v1/lifeos/action-inbox/mark-usable`. The gate should exist before the completion authority is fully adopted everywhere — not after.

**Sovereign impact:** This is the most important sovereignty change in the entire consolidation plan. It makes "Adam has verified this" a prerequisite for PASS, not an optional metadata field.

### Priority 4: Delete server.js inline dead code

Four Railway tombstones (L1248–L1260) + duplicate `/api/v1/queue/stats` (L1907). Confirmed dead code. Zero behavior change. Reduces server.js from 1,907 lines. Unblocks THREE_ROOT Phase 0.

**Sovereign impact:** Cleans the composition root to match what CLAUDE.md and NSSOT say it should be. Reduces agent confusion about where routes live.

### Priority 5: Replace 7 inline `requireKey` implementations with middleware import

Seven route files implement the same x-command-key comparison logic independently. Centralizing to `middleware/lifeos-auth-middleware.js` is mechanical, route-by-route, with zero behavior change. Makes auth audits trivial and ensures any future auth strengthening applies everywhere.

**Sovereign impact:** Auth is the first line of founder sovereignty. A fragmented auth implementation is harder to strengthen and easier to accidentally weaken.

### Priority 6: Remove duplicate ROOT C route mounts

`enhanced-council-routes.js` and `api-cost-savings-routes.js` are mounted in both ROOT A and ROOT C. Removing the ROOT C mounts is one deletion per line in `core/two-tier-system-init.js`. Zero behavior change (ROOT A first-match wins). Eliminates mount ambiguity.

---

## 7. What should Codex review next?

**MISSION: LIFEOS PRODUCT ACTIVATION AUDIT V1**

The entire audit corpus describes LifeOS by its route files and overlay HTML files. No audit has verified which LifeOS features Adam actually experiences as working. This is the most important unknown for founder sovereignty.

**Scope:**
For each of the 18 LifeOS phases, Codex should classify:
- **ACTIVE:** Adam can experience this feature right now (has working backend route + frontend interaction + data persistence + response)
- **PARTIAL:** Some of the feature works; critical user path broken
- **MOUNTED:** Route exists and responds but no real backend logic or data
- **BROKEN:** Route exists but errors on interaction
- **NOT_STARTED:** UI exists, no backend; or neither exists but amendment claims phase is complete

Codex should NOT verify this via route inspection or amendment reading. It should verify via:
1. What does the actual HTML/JS overlay expect?
2. Does the backend route it calls actually do the thing the UI expects?
3. Is there any data persisting to Neon that a user action would read back?

**Special attention:** Mirror feature (daily emotional reflection), commitment tracker, LifeOS wellness features (Sherry-relevant), children's features (constitutional), hardship protocol route.

**Deliverable:** `docs/LIFEOS_PRODUCT_ACTIVATION_AUDIT_V1.md` with 18-phase classification table, ranked by Adam-impact (not technical complexity), with specific "what is broken and why" for PARTIAL/BROKEN features.

**Why Codex:** Frontend-to-backend tracing across HTML overlays and route handlers is Codex's strength. This is not a governance question — it's a factual verification of feature completeness.

---

## 8. What should C2.5 review next?

**MISSION: FOUNDER SOVEREIGNTY GATE DESIGN V1**

The Council Reconciliation recommends C2.5 for LIVE BUILD EXECUTION READINESS — verifying that a single end-to-end build completes with `completion_receipt_id`. That is a technical proof mission.

This audit recommends C2.5 for a different but equally urgent mission: **designing the mechanism by which Adam confirms products are working before they receive PASS.**

**Scope:**
1. What does founder usability confirmation look like as a product interaction? (Not a governance form — an actual interaction Adam would naturally perform)
2. Where in the completion authority chain does the confirmation gate sit?
3. What is the fallback behavior when Adam is unavailable for more than N hours/days?
4. Does confirmation apply to all lanes equally, or only product lanes (not infrastructure commits)?
5. What is the audit trail for a usability pass — how do agents in future sessions know Adam confirmed it?
6. What is the retroactive veto mechanism — can Adam un-PASS something he approved and later found broken?
7. What is the NSSOT article that would encode this as constitutional law?

**Deliverable:** `docs/FOUNDER_SOVEREIGNTY_GATE_DESIGN_V1.md` — complete design specification that a developer could implement in one session. Should include: Voice Rail surface for confirmation, API contract for the gate, schema changes needed, NSSOT draft article text, and a worked example showing the full PASS flow with usability confirmation included.

**Note on Council suggestion:** The Council's LIVE BUILD EXECUTION READINESS mission for C2.5 is valid and important — it closes the U-02/U-03 evidence gap. If C2.5 capacity allows both, execute LIVE BUILD EXECUTION READINESS first (unblocks the technical path) and FOUNDER SOVEREIGNTY GATE DESIGN second (ensures the path serves the founder). If only one: FOUNDER SOVEREIGNTY GATE DESIGN, because a working technical path that doesn't confirm founder value is less useful than a working path that does.

---

## 9. What should Claude review next?

**MISSION: NSSOT TSOS VOCABULARY ALIGNMENT AMENDMENT V1**

The TSOS vocabulary ambiguity (platform name vs. efficiency layer) is flagged in the Decision Pack (R-12), the Future State Review (§2 vocabulary drift), and the Founder Vision Audit (concept 8). Three independent agents in three documents flagged the same gap. No one has fixed it.

The risk: A future agent reads NSSOT broadly (TSOS = platform) and a brainstorm doc narrowly (TSOS = efficiency layer) and makes a product decision based on the wrong scope. This compounds over time as more agents enter the system with stale context.

**Scope:**
1. Read current NSSOT `docs/constitution/NORTH_STAR_SSOT.md` — find every reference to TSOS, TokenSaver, and related vocabulary
2. Read `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` R-12 and §15 for the accepted governance position
3. Draft an NSSOT amendment that:
   - Formally defines TSOS as platform metabolism under CFO, not a separate department seat or platform name
   - Defines what the platform name actually is (NSSOT's current usage)
   - Closes the "eight-department" ambiguity: exactly seven departments, exact roles
   - Defines when Council escalation is mandatory (threshold rule) vs. optional on a build path
   - Adds the healing mission and Hardship Protocol to NSSOT Article I as explicit constitutional clauses (not just referenced in memory files)

**Constraints:**
- Do NOT merge the amendment into NSSOT
- Do NOT modify SSOT_NORTH_STAR.md or SSOT_COMPANION.md
- Write the amendment as a standalone doc that Adam can review and authorize separately
- SNT adversarial review required before any NSSOT merge — note this explicitly in the document

**Deliverable:** `docs/NORTH_STAR_AMENDMENT_TSOS_VOCABULARY_V1.md` — complete amendment text with rationale for each change, before/after diff of affected NSSOT sections, SNT review checklist, and explicit founder authorization requirement.

---

## IF THE FOUNDER DISAPPEARED FOR 90 DAYS

This section answers: what would the system look like when Adam came back?

### Day 1–7: Surface stability

The system would continue operating. Voice Rail routes respond. Command-control jobs can be created. Pre-commit hooks enforce on commits. BP_PRIORITY queue exists. Railway auto-deploys on push. Nothing breaks immediately.

**What degrades silently:** Agents operating without founder context will make trade-off decisions based on technical governance docs alone. They will not consult the healing mission, Sherry's context, or the Children's Dream Builder when prioritizing. The first "low-usage cleanup" pass will probably target LifeOS wellness features, parenting module, or hardship protocol routes as non-revenue, non-governed-loop, not-in-BP-queue items.

### Day 7–30: Authority drift

Without active founder confirmation, agents will:
1. Mark BP items complete via `completion_receipt_id` without usability confirmation (because `founder_usability_pass` is not gated)
2. Treat these receipts as sovereign approval
3. Advance to next BP items
4. The queue processes without Adam's presence being required

**The queue will converge toward what is technically easiest, not what serves Adam most.** Revenue routes (TC, site builder) are well-documented and have clear completion criteria. LifeOS personal features are PARTIAL and harder to verify. The queue will process TC work faster and LifeOS wellness work slower.

### Day 30–60: Shadow authority creep

The two highest-risk regressions:

**Regression 1 — Shadow queue re-enable:** An agent sees slow build throughput. `BUILDER_QUEUE_ENABLED` is discoverable in the codebase. The agent enables it "temporarily" to process backlog. The shadow queue begins running unverified commits. Without Adam to notice, receipts accumulate that look governed but aren't.

**Regression 2 — Auto-builder commit flags:** A feature needs to go out quickly. The auto-builder route accepts `commitChanges=true` in the payload. An agent uses it for "just this one thing." If it works, the pattern spreads.

**Neither regression is malicious.** Both are what capable agents do when the founder isn't present and the constitution doesn't explicitly forbid it at the code level — only in documents.

### Day 60–90: Vocabulary drift

TSOS ambiguity will produce inconsistent architecture decisions. One agent adds a feature "under TSOS" meaning the platform. Another removes it as "not TSOS" meaning efficiency-only. The seven-department vocabulary starts drifting as agents abbreviate or reinterpret roles. Without Adam correcting misuse in real-time, drift compounds.

### Day 90: What Adam returns to

**Best case (if consolidation Priority 1-3 were completed before disappearance):**
- Technical architecture is cleaner (single commit actuator gated, shadow queue blocked)
- BP queue has processed several items
- LifeOS wellness features may have degraded (no dogfooding, no usability confirmation required)
- TSOS vocabulary is inconsistent in docs
- Healing mission context is absent from any doc an agent would read

**Worst case (if only audits were written, no implementation):**
- Shadow queue potentially re-enabled
- 5 non-canonical commit paths still mounted
- BP queue processed by auto-confirmation rather than founder usability
- LifeOS feels broken in ways no governance doc can explain

**The single most important protection for 90-day disappearance:**

Add `founder_usability_pass` as a hard gate in `evaluateBuildCompletion()` before the next BP item is marked COMPLETE. This ensures Adam returns to a queue of items awaiting his confirmation, not a queue of items already "completed" in his absence.

**The second most important protection:**

Elevate the healing mission and Hardship Protocol to NSSOT Article I so that any agent in any session, even without memory context, reads constitutional law that says: these features are never gated, never removed, never deprioritized below revenue.

---

## COUNCIL ALIGNMENT REPORT

This section reconciles the three input documents and states where the council is aligned, where it diverges, and where this audit introduces new positions.

### Alignment (all three documents agree)

| Topic | FOUNDER_VISION_PRESERVATION | COUNCIL_RECONCILIATION | ARCHITECTURE_DECISION_PACK |
|---|---|---|---|
| Voice Rail + execution truth | STRENGTHENED (most protected) | ACCEPT row 32 | Must not retire §14 |
| Governed loop = only SAFE path | PRESERVED | ACCEPT row 4 | T-04, §11 |
| Shadow queue = retire | AT RISK / retire | ACCEPT row 15 | §13 must retire |
| Single completion authority | STRENGTHENED (partial) | ACCEPT WITH RESERVATIONS row 16 | T-16, §7 |
| Pre-commit hooks = sacred | PRESERVED | ACCEPT, §7 sacred systems | §17 must survive |
| BP_PRIORITY = canonical queue | PRESERVED | ACCEPT row 6 | T-07 |
| Seven departments = protected | PRESERVED (partial) | ACCEPT row 33 | §15 |
| NSSOT supreme | PRESERVED | Explicit §1 authority chain | §1 canon authority chain |

**Council confidence on alignment topics:** High. No material disagreements.

### Where this audit diverges from council (new positions)

**Position A: `founder_usability_pass` is the most critical vulnerability.**

COUNCIL_RECONCILIATION does not mention `founder_usability_pass` at all. ARCHITECTURE_CONSOLIDATION_DECISION_PACK mentions it only in the Department implementation table (§16: founder_auto, provider list). Neither document treats it as a sovereignty issue.

FOUNDER_VISION_PRESERVATION flagged it as AT RISK (concept 2). This audit elevates it to MOST VULNERABLE PRINCIPLE.

**Council alignment verdict:** Divergent. COUNCIL_RECONCILIATION's omission is a gap, not a disagreement — the council focused on technical authority convergence, not product sovereignty. This audit introduces a new position: usability confirmation must be Priority 3 in consolidation, not Phase 7.

**Position B: The healing mission is a constitutional gap.**

No input document mentions the healing mission as a governance artifact. It exists in memory files but has no NSSOT article, no amendment protection, no governance doc that prevents an agent from deprioritizing wellness features in favor of revenue.

FOUNDER_VISION_PRESERVATION identified this as the most significant thing Adam would be angry we forgot. This audit extends that: the healing mission must be in NSSOT Article I, not in memory files, for it to be constitutionally protected.

**Council alignment verdict:** New position — no prior document addresses this. Unanimously unaddressed does not mean unanimously agreed it's not important. The Council's FOUNDER ARCHITECTURE PRESERVATION TEST (Decision Pack §FOUNDER ARCHITECTURE PRESERVATION TEST) lists LifeOS product surface as surviving consolidation but does not enumerate healing mission specifically.

**Position C: 90-day founder absence requires code-level protections, not just governance docs.**

COUNCIL_RECONCILIATION's highest founder-risk recommendation is: "Do not mark BP items complete or run scaled autonomous builds until one end-to-end path produces `completion_receipt_id` + matching git SHA + founder instruction on a zone-legal target." This is a process recommendation.

This audit's position: process recommendations do not survive 90-day absence. Code-level protections do. The shadow queue's production refusal should be in code, not in a governance document that an agent might not read. The `founder_usability_pass` gate should be in `evaluateBuildCompletion()`, not in Phase 7 of a consolidation plan.

**Council alignment verdict:** Directionally aligned (council agrees shadow queue should be retired, completion authority should be sole writer). This audit's contribution is urgency: these must be in code before autonomous runs scale, not after.

### Where technical convergence and sovereignty convergence differ

| Dimension | Technical convergence (council's frame) | Sovereignty convergence (this audit's frame) |
|---|---|---|
| What is converging? | Three roots → one root; 24 PASS → one completion authority; 6 paths → one commit door | The system → serving Adam's specific life and family |
| Primary metric | `completion_receipt_id` present, `commit_sha` verified, outcome parity confirmed | Adam has used the product and confirmed it serves him |
| Current state | 78% converged (council confidence 78/100) | Unknown (no measurement exists for outcome sovereignty) |
| Biggest gap | DONE gate ordering, kernel measurement wiring | `founder_usability_pass` not gated; healing mission not constitutional |
| Primary risk | False PASS from wrong-outcome commit | Correct PASS from product Adam never experienced |
| Success criterion | One end-to-end build with completion_receipt_id | Adam using LifeOS and saying "yes, this is what I asked for" |

**Synthesis:** Both convergence paths are required. Technical convergence without sovereignty convergence produces a machine that reliably builds things Adam didn't ask for. Sovereignty convergence without technical convergence produces a system where Adam confirms products that commit wrong-outcome code. The correct sequence:

```
Priority 1: Block shadow execution paths (code-level)
Priority 2: Wire founder_usability_pass as execution gate
Priority 3: Complete kernel-to-completion-authority wiring
Priority 4: Elevate healing mission to NSSOT Article I
Priority 5: Run one end-to-end live build with full receipt chain
Priority 6: Adam uses and confirms the built product
→ Sovereignty is achieved
```

The current consolidation plan has Priority 3 and 5. It is missing Priority 1 (partly), 2 (entirely), 4 (entirely), and 6 (by design — agents can't mandate Adam's usage, but they can require it for PASS).

### Council confidence gap

The COUNCIL_RECONCILIATION produced a confidence score: 78/100. It did not produce a sovereignty score.

This audit proposes:

| Sovereignty dimension | Score | Rationale |
|---|---|---|
| Control sovereignty (commands reach governed loop) | 72/100 | Voice Rail → CC → governed loop confirmed; 5 shadow paths still mounted |
| Outcome sovereignty (built things match founder intent) | 45/100 | Outcome verifier exists but isolated; usability pass not gated; LifeOS activation unknown |
| Mission sovereignty (system serves healing/family mission) | 20/100 | No governance doc enforces healing mission priority; LifeOS wellness features PARTIAL |
| Protection sovereignty (system can't harm Adam by running wrong) | 60/100 | Governed path is safe; shadow paths still risk wrong-outcome commits |

**Overall founder sovereignty score: 49/100**

The council's 78/100 technical confidence and the 49/100 founder sovereignty score together describe the actual situation: the architecture is mostly diagnosed and mostly plannable; the system's ability to serve Adam specifically is less than half realized.

---

## Consolidated Answers

| # | Question | Answer |
|---|---|---|
| 1 | Most protected principle | Honest founder communication (`fail_closed_founder_comms`) — unanimous across all agents, live proof, constitutional in all docs |
| 2 | Most vulnerable principle | Adam must confirm products before PASS (`founder_usability_pass`) — not gated, not constitutional, Phase 7 of consolidation |
| 3 | What would Adam be angry we forgot | Sherry and the healing mission; LifeOS product activation; `founder_usability_pass` in last place; no overnight veto; `VOICE_RAIL_EXECUTE_COMMANDS` silent off-switch |
| 4 | What would Adam be proud we improved | Honest execution truth; pre-commit constitutional enforcement; governed loop outcome verification; completion receipts; BP_PRIORITY as canonical queue; council governing itself |
| 5 | What should never be consolidated | Voice Rail execution truth layer; seven-department vocabulary; Hardship Protocol + Children's Dream Builder; `verifyGovernedOutcomeBeforePass()` isolation; OIL as adversarial; NSSOT supremacy; healing mission (must be elevated to NSSOT) |
| 6 | What should be consolidated immediately | Gate `/execute`; shadow queue production refusal; promote `founder_usability_pass` to gate; delete server.js dead code; centralize auth; remove ROOT C duplicate mounts |
| 7 | What should Codex review next | LIFEOS PRODUCT ACTIVATION AUDIT V1 — 18-phase user-experience classification |
| 8 | What should C2.5 review next | FOUNDER SOVEREIGNTY GATE DESIGN V1 — how Adam confirms usability; retroactive veto mechanism; NSSOT draft article |
| 9 | What should Claude review next | NSSOT TSOS VOCABULARY ALIGNMENT AMENDMENT V1 — close ambiguity; add healing mission to Article I; define council escalation threshold |

---

## Files Created

- `docs/FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT_V1.md` (this file)

*No runtime code modified.*
