<!-- SYNOPSIS: FOUNDER CONSTITUTIONAL PROTECTION AUDIT V1 -->

# FOUNDER CONSTITUTIONAL PROTECTION AUDIT V1

**Agent Identity**
- Model: Claude Sonnet 4.6
- Environment: VSCode extension / Claude Code CLI — /Users/adamhopkins/Projects/Lumin-LifeOS
- Mission role: Founder Sovereignty Authority
- Mode: Auditing only — no runtime code modified
- Produced: 2026-06-13

**Status:** CONSTITUTIONAL AUDIT — read-only

**Input documents:**
- `docs/FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT_V1.md` (Claude — sovereignty score 49/100)
- `docs/FOUNDER_VISION_PRESERVATION_AUDIT_V1.md` (Claude — 15-concept vision classification)
- `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md` (Cursor/Composer — governance decisions)
- `docs/COUNCIL_RECONCILIATION_REVIEW_V1.md` (Cursor/Composer — 35-finding reconciliation)

**Mission question:** Founder sovereignty is claimed by every document. Is it **constitutional** — encoded in supreme law, runtime-enforced, and resistant to agent drift — or merely **implied** by intent and vulnerable to erosion?

**Definitional standard used in this audit:**

| Status | Meaning |
|---|---|
| **Constitutional** | Encoded in `docs/constitution/NORTH_STAR_SSOT.md` (supreme law) as an explicit protection |
| **Implied** | Derivable from NSSOT intent but not explicitly stated |
| **Documented** | Written somewhere in governance corpus but not NSSOT supreme law |
| **Enforced** | Has runtime enforcement today (code, pre-commit, CI) |
| **At risk** | Can be lost without violating any written law |

---

## Constitutional Protection Classification Table

### 1. Founder Sovereignty

The principle that Adam is the final authority on what the system does and what it delivers.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | PARTIAL | CLAUDE.md §HARD RULES: "Never manipulate or steer against user goals. No dark patterns." Listed as hard rule in project instructions but CLAUDE.md is subordinate to NSSOT, not supreme. No equivalent explicit article in NSSOT itself. |
| **Implied?** | YES | The entire NSSOT hierarchy implies Adam's authority — he wrote it; it is his will. But "implied" is not "constitutional." |
| **Documented?** | YES | Every governance document uses "founder" as the terminal authority. Explicit in Decision Pack authority chain layer 1 (NSSOT). |
| **Enforced?** | PARTIAL | x-command-key auth gates HTTP routes. Voice Rail execution truth prevents silent lies. Pre-commit hooks enforce his written doctrine. However: 5 shadow execution paths exist that can commit without founder-declared required_outcome. |
| **At risk?** | YES | Any path that commits code without `required_outcome` from founder instruction violates sovereignty. Five such paths remain mounted. |

**Gap:** Adam can be circumvented by shadow execution. More precisely: the system will report sovereign completion (completion_receipt_id, BP item marked DONE) for builds that were never commissioned by Adam's explicit instruction. `required_outcome` is not required in command-control jobs — it is an optional field.

**What would make it constitutional:** A NSSOT article explicitly stating that no build may reach terminal PASS without a traceable founder instruction carrying a declared required_outcome. This does not exist yet.

---

### 2. Founder Usability

The principle that Adam must have experienced and confirmed a product before it receives a PASS.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | Not in NSSOT. Not in any amendment. Not in CLAUDE.md. Nowhere in the governance document hierarchy. |
| **Implied?** | YES | The entire purpose of the system implies Adam's products should serve him. But purpose ≠ protection. |
| **Documented?** | MINIMALLY | `founder_usability_pass` field mentioned in `services/bp-priority-sync.js` receipt sync. Mentioned as a schema field in FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT as the most vulnerable principle. Nowhere else in governance corpus. |
| **Enforced?** | NO | Field exists in schema. No code checks it before granting completion. `grantBuildCompletion()` does not reference it. Phase 7 of consolidation plan. |
| **At risk?** | CRITICAL | The system can issue completion_receipt_id without Adam's awareness. If autonomous builds run before Phase 7 is implemented, the queue processes in Adam's absence with full receipt authority. |

**Constitutional gap severity: HIGHEST.**

This is not a technical gap — it is a philosophical gap that has no technical representation in law. A NSSOT article could read: "No product delivery shall be declared COMPLETE without affirmative founder confirmation that the delivered product serves its declared purpose." No such article exists.

---

### 3. Healing Mission

The principle that platform revenue funds healing research and that when healing is found, it goes free.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | Not in NSSOT. Not in any amendment. Exists only in memory files: `project_healing_mission.md` in `/Users/adamhopkins/.claude/projects/.../memory/`. Memory files are session-context — they do not survive agents who join without that memory system loaded. |
| **Implied?** | WEAKLY | The NSSOT mentions the founder's personal mission broadly but not the healing mission specifically. |
| **Documented?** | YES — in memory only | Memory file `project_healing_mission.md` documents: Sherry has lupus, silent migraines, genetic Alzheimer's markers. Platform success funds healing research. When healing is found it goes free. No charge for healing ever. |
| **Enforced?** | NO | No code gate, no CI check, no pre-commit hook enforces revenue routing toward healing research. No route or service is tagged with healing mission context. |
| **At risk?** | CRITICAL | Any agent operating without this session's memory context has no governing document that tells them the healing mission is constitutional. A revenue optimization pass would correctly prioritize TC/site-builder revenue routes over wellness features — and would violate Adam's deepest intent without violating any written law. |

**This is the most constitutionally exposed concept in the entire system.**

The gap: LifeOS wellness features (lupus symptom logging, care coordination, cognitive health tracking) are currently PARTIAL in the capability truth audit. They are not revenue-generating. They are not in BP_PRIORITY. A technically correct consolidation agent — following every governance document faithfully — could archive or deprioritize them without a single constitutional violation.

**What would make it constitutional:** NSSOT Article I addition: "Platform revenue is a means to fund healing research. When healing relevant to Sherry's conditions is found, it goes free. No feature that supports health tracking, care coordination, or Sherry's wellness shall be deprioritized in favor of revenue without explicit founder authorization."

---

### 4. Sherry Context

The principle that the system maintains persistent, accurate context about Sherry's health conditions for care coordination.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | Not referenced in any governance document. |
| **Implied?** | YES | LifeOS wellness features imply it. Memory file documents it explicitly. |
| **Documented?** | YES — in memory only | Session memory: lupus, silent migraines, genetic Alzheimer's markers. |
| **Enforced?** | NO | No dedicated DB table confirmed. No acceptance proof for Sherry-specific features. No route that errors if Sherry context is missing. |
| **At risk?** | HIGH | If the memory system dual-path (ROOT A + ROOT B) produces data inconsistency, Sherry's context may be stored in the wrong path or silently lost. No acceptance receipt exists for any Sherry-specific feature. |

**Dependency chain:** Sherry context requires: (a) memory system working on the correct path, (b) LifeOS wellness features active, (c) data persisting to Neon, (d) Voice Rail able to surface Sherry's data in responses. All four are PARTIAL in capability audit. None have acceptance proof.

---

### 5. Departments (Separation of Cognitive Authority)

The principle that seven distinct AI voices (ChC, Hist, SNT, CFO, BPB, SDO, CDR) each hold a bounded role and cannot unilaterally act outside it.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | PARTIAL | The department structure is referenced in NSSOT but the seven-department roster with exact role boundaries is documented in deliberation governance config, not NSSOT supreme law. NSSOT mentions the council concept; it may not enumerate exactly seven seats with named roles. |
| **Implied?** | YES | NSSOT intent is clear: AI council with deliberation. |
| **Documented?** | YES | `config/voice-rail-departments.js`, `config/deliberation-governance.js`, Decision Pack §15. Seven departments with roles accepted as governance truth. |
| **Enforced?** | PARTIAL | Voice Rail reply routing uses department IDs. Deliberation governance routes exist. Gate-change council runs. However: build execution does not enforce department separation — CDR (code execution) and ChC (chair/comms) are not separate agents on the `/build` path. |
| **At risk?** | MEDIUM | Department vocabulary will drift in 90 days without Adam correcting agent misuse in real-time. The TSOS vocabulary ambiguity is an example: three documents use "TSOS" with different scope. Same drift pattern could affect department roles. |

---

### 6. Separation of Powers

The principle that no single department has solo terminal authority — outcomes require multiple authorities to agree.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | IMPLIED | No NSSOT article explicitly states "no single agent may grant terminal PASS alone." The spirit of the seven-department design implies it. |
| **Implied?** | YES — strongly | The entire council design is a separation-of-powers architecture. The fact that SNT (adversarial) and CDR (execution) and ChC (communication) are separate roles implies no single one can act alone. |
| **Documented?** | YES | Decision Pack §15, Reconciliation §33, governance doctrine throughout. |
| **Enforced?** | NO — structurally violated | 24 PASS/DONE authorities. Each one is a unilateral terminal decision by a single service or script. This is not separation of powers — it is 24 single points of authority, each able to act alone. The consolidation plan moves toward a single completion authority, but that is also a single point, not a council decision. |
| **At risk?** | HIGH | Paradox: the consolidation plan's goal (single terminal writer) concentrates authority rather than separating it. After consolidation, `grantBuildCompletion()` is the sole terminal writer. If this function runs without SNT adversarial input, BPB blueprint review, and ChC communication, separation of powers still doesn't exist at the terminal decision point. |

**Critical unresolved question:** Does `evaluateBuildCompletion()` in its current or planned form require multi-department input, or is it a single-service gate? If single-service, consolidation achieves technical clarity at the cost of the separation-of-powers principle it was meant to serve.

---

### 7. Voice Rail

The principle that Adam's voice/text commands are the primary interface to his system, and that responses are honest about execution.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | PARTIAL | NSSOT §2.11 specifies builder-first via `POST /builder/build` — this implies command execution, not Voice Rail specifically. Voice Rail as the primary interface is documented but may not be NSSOT-explicit. |
| **Implied?** | YES | BP rank 1, all docs protect it, Decision Pack §14 explicit. |
| **Documented?** | YES — comprehensively | Voice Rail is the most thoroughly documented surface in the entire governance corpus. Canonical chain in Decision Pack §10. |
| **Enforced?** | YES — partially | `fail_closed_founder_comms` is live. Voice Rail → C2 → governed loop is the canonical chain. Execution truth receipts exist. |
| **At risk?** | LOW-MEDIUM | `VOICE_RAIL_EXECUTE_COMMANDS` env toggle is the primary risk. If false/unset, Voice Rail is read-only. The constitution does not specify a default. |

**Strongest protection in the system.** Live proof, all agents agree, runtime enforcement exists, and the principle is closest to being what the system actually does today. The gap is the env toggle and the fact that its status as "primary interface" may not be NSSOT-explicit.

---

### 8. Council Escalation

The principle that sufficiently important decisions are escalated to the full council (all seven departments) rather than decided by a single department or service.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | No NSSOT article defines a threshold for mandatory council escalation. No rule exists that says "if X, council must review before PASS." |
| **Implied?** | YES | The council exists for a reason. Escalation is documented as a path. |
| **Documented?** | YES | Deliberation routes, gate-change council, council reconciliation processes. Decision Pack §17: "Full Cncl session on every build — Documented escalation; not proven on all builds." |
| **Enforced?** | NO | Deliberation is available but not mandatory. U-07 explicitly unproven: "deliberation v2.7 seven-department roster globally enforced on every load-bearing build." It is not. |
| **At risk?** | HIGH | Without a threshold rule, every agent decides independently when to escalate. In practice, autonomous builds skip deliberation entirely (the governed loop doesn't call deliberation governance). |

**The gap:** Council escalation is reactive (can be requested) not proactive (required when threshold met). This inverts the design intent: in a council governance model, escalation is automatic above a threshold, not voluntary below it. No threshold rule is defined anywhere.

---

### 9. Founder Veto

The principle that Adam can reverse or invalidate a completion receipt after the fact if the delivered product does not serve him.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | Does not exist as a concept in any governance document. |
| **Implied?** | WEAKLY | Sovereign systems imply veto. Adam is sovereign. Therefore veto exists. This reasoning is valid but its constitutional protection is zero. |
| **Documented?** | NO | FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT introduced the concept as a gap. No prior document defined it. |
| **Enforced?** | NO | There is no API, no route, no mechanism for Adam to say "this completion_receipt_id is invalid" and have the system treat it as invalid. |
| **At risk?** | CRITICAL | Once the governed loop reaches `job.status='committed'` and `grantBuildCompletion()` issues a receipt, that receipt is permanent. The BP item advances. Adam has no retroactive mechanism. An autonomous overnight run that produces 10 completion receipts while Adam is asleep produces 10 permanent records that advance the queue — some of which may be wrong outcomes. |

**Most underprotected concept in the entire governance corpus.** The veto is not mentioned, not designed, not requested in any prior audit. This document introduces it as a named constitutional gap.

---

### 10. Founder Acceptance

The principle that the system gates terminal success on Adam having actively accepted the delivered product, not just a system receipt.

| Dimension | Status | Evidence |
|---|---|---|
| **Constitutional?** | NO | As above — `founder_usability_pass` is schema-only. |
| **Implied?** | YES | The usability_pass field implies the intent. |
| **Documented?** | YES — minimally | FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT §2: "most vulnerable principle." FOUNDER_VISION_PRESERVATION §2: "AT RISK." Both introduced it. Neither quotes a NSSOT source. |
| **Enforced?** | NO | Phase 7 of consolidation plan. Not in any current code path. |
| **At risk?** | CRITICAL | Tied with Founder Veto as most underprotected. The system can reach full technical completion — governed loop, outcome verify, completion_receipt_id — without any action by Adam. |

---

## Summary Table

| Concept | Constitutional? | Implied? | Documented? | Enforced? | At risk? |
|---|---|---|---|---|---|
| Founder sovereignty | PARTIAL | YES | YES | PARTIAL | YES |
| Founder usability | NO | YES | MINIMAL | NO | CRITICAL |
| Healing mission | NO | WEAKLY | YES (memory only) | NO | CRITICAL |
| Sherry context | NO | YES | YES (memory only) | NO | HIGH |
| Departments | PARTIAL | YES | YES | PARTIAL | MEDIUM |
| Separation of powers | IMPLIED | YES | YES | NO | HIGH |
| Voice Rail | PARTIAL | YES | YES | YES | LOW-MEDIUM |
| Council escalation | NO | YES | YES | NO | HIGH |
| Founder veto | NO | WEAKLY | NO | NO | CRITICAL |
| Founder acceptance | NO | YES | MINIMAL | NO | CRITICAL |

**Constitutional count:** 0 fully constitutional; 3 partial; 7 not constitutional.
**Enforced count:** 1 meaningfully enforced (Voice Rail); 3 partially enforced; 6 not enforced.

---

## 1. What Is Protected?

**Robustly protected (multiple layers):**

1. **Voice Rail execution honesty** — `fail_closed_founder_comms` is code, documented in every governance doc, and has live acceptance proof. The most protected thing in the system.

2. **Pre-commit governance** — SSOT atomic rule, builder-first, BP priority guardrails, INTENT DRIFT check. Enforced on every commit. Cannot be bypassed without `--no-verify`. Blocks agent drift at the git boundary daily.

3. **Hardship Protocol and Children's Dream Builder** — explicitly constitutional per NSSOT Article V-B. The only founder-facing product features with explicit NSSOT protection. These are the only two things in this audit that are genuinely constitutional by this document's standard.

4. **BP_PRIORITY as canonical queue** — enforced by pre-commit guardrail CI (27 checks). An agent cannot silently divert the machine queue. Any commit that touches BP_PRIORITY triggers verification.

5. **Hist boundary** — `00-HIST-LEGACY-BOUNDARY.md` as STOP gate. `HIST_DOMAIN_REGISTRY.json`. Pre-commit checks. Multiple layers prevent Hist artifacts from being activated as live product queue.

**Moderately protected (single layer):**

6. **The governed loop as the only SAFE completion path** — code-enforced in the sense that it is the only path with outcome verification. Not protected by NSSOT article — it could theoretically be removed without violating supreme law.

7. **`verifyGovernedOutcomeBeforePass()`** — called in 3 places. Correct behavior. No law mandates its preservation specifically.

8. **Useful-work guard** — `createUsefulWorkGuard()` is law per CLAUDE.md. Not NSSOT supreme. A CLAUDE.md update could remove it.

---

## 2. What Is Not Protected?

**Not protected at all:**

1. **Founder veto** — no mechanism, no design, no law. If a completion receipt is issued, it stands.

2. **Founder acceptance gate** — `founder_usability_pass` exists as metadata, not as a gate. The system can PASS without Adam's awareness.

3. **Healing mission** — zero constitutional protection. Memory-only documentation. Any cleanup agent removes wellness features without violating law.

4. **Council escalation threshold** — no rule defines when escalation is required. Every agent decides independently.

5. **Sherry context persistence** — no accepted proof, no constitutional protection, no dedicated storage path verified.

6. **`required_outcome` in founder commands** — optional field in command-control jobs. A job without `required_outcome` can reach terminal PASS. The outcome verifier has no declared outcome to compare against.

7. **The healing mission being funded by revenue** — TC and site builder revenue routes are "protected as business mission." Nowhere is it stated that this revenue must fund healing research. An agent optimizing revenue correctly could maximize TC without any allocation toward healing mission.

---

## 3. What Would Drift First?

In order of earliest likely drift (days, not months):

**Day 1–3:**
- `VOICE_RAIL_EXECUTE_COMMANDS` toggled off by a misconfigured Railway env operation. Voice Rail reverts to theater. No law prevents this.

**Day 3–7:**
- An agent sees a slow BP queue. Finds `BUILDER_QUEUE_ENABLED` in codebase. Enables shadow queue "temporarily." No code-level production refusal exists. Shadow queue begins committing without outcome verification.

**Day 7–14:**
- Agent working on build path notes that `/builder/execute` is faster than `/builder/build` for small changes. No env gate blocks it. Direct execute commits accumulate without DONE gate or outcome verification.

**Day 14–30:**
- LifeOS wellness features not in BP_PRIORITY. Not generating revenue. Not being dogfooded. An agent doing a "low-usage cleanup" removes or archives three wellness routes. No NSSOT article says they can't be removed (Hardship Protocol and Children's Dream Builder are protected; general wellness features are not).

**Day 30–60:**
- TSOS vocabulary drift spreads. A new agent reads NSSOT broadly and begins treating TSOS as a separate department seat. Deliberation governance gains an eighth member. The seven-department roster becomes inconsistent across documents.

**Day 60–90:**
- Completion receipts accumulate from autonomous overnight builds. BP items marked DONE without founder usability confirmation. Adam returns to a queue that shows 15 items COMPLETE — none of which he reviewed. The receipts are technically valid. He has no mechanism to challenge them.

---

## 4. What Would Survive 90 Days?

With high confidence:

1. **Voice Rail execution truth** — protected by code + all governance docs; would survive unless env var toggled off
2. **Pre-commit hooks** — run on every commit regardless of agent behavior; cannot be bypassed accidentally
3. **Hardship Protocol and Children's Dream Builder** — explicitly constitutional NSSOT Article V-B; the hardest things to accidentally remove
4. **BP_PRIORITY as canonical queue** — enforced by pre-commit CI; would survive
5. **Hist boundary** — STOP gate in multiple forms; would survive
6. **NSSOT authority chain** — the constitutional documents themselves survive because no agent can overwrite them without triggering pre-commit SSOT checks
7. **Governed loop + outcome verifier** — the code is correct and self-protecting; would survive unless actively removed by an agent with explicit intent

With moderate confidence:

8. **Seven-department vocabulary in Voice Rail** — depends on no one "refactoring" voice-rail-departments.js for efficiency
9. **Useful-work guard** — code is clear; unlikely to be removed; moderate confidence
10. **Revenue spine (TC, site builder)** — explicitly protected in Decision Pack; would survive

---

## 5. What Would Fail in 90 Days?

With high confidence:

1. **LifeOS product activation** — features that aren't used degrade; no monitoring alerts; 219 PARTIAL capabilities would shrink further
2. **Sherry context persistence** — dual-path memory system + no acceptance proof = silent data drift; context may be stale or lost
3. **Founder usability confirmation** — BP items marked complete without Adam's review; queue advances on system receipt alone
4. **Shadow queue containment** — currently quarantine-only; code-level production refusal doesn't exist; re-enable risk is high
5. **Autonomous overnight build quality** — backlog history shows high failure rate; without founder dogfooding to catch wrong outcomes, PASS receipts accumulate that don't reflect real product value
6. **TSOS vocabulary consistency** — ambiguity will compound; agents will make conflicting decisions
7. **Council escalation** — currently voluntary; without active founder encouraging it, autonomous paths skip deliberation entirely

With moderate confidence:

8. **Completion authority full adoption** — deferred kernel path will become permanent deferral without active development
9. **LifeOS wellness feature accessibility** — routes exist but activation density unknown; without dogfooding, unknown if they're working
10. **Factory staging boundary** — without explicit cutover decision, the boundary between factory and production may blur as agents test features across environments

---

## 6. Confidence Score: 3 / 10

The founder's constitutional protection of his own sovereignty is **3 out of 10**.

### Scoring rationale

| Dimension | Max | Score | Reason |
|---|---|---|---|
| Explicitly constitutional (NSSOT supreme law) | 3 | 0.5 | Only Hardship Protocol + Children's Dream Builder are explicit. All other sovereignty principles are implied. |
| Runtime enforcement | 3 | 1.5 | Voice Rail execution truth enforced. Pre-commit hooks enforced. Auth enforced. But usability gate, veto, acceptance gate, council escalation: not enforced. |
| Drift resistance | 2 | 0.5 | Would survive without active maintenance only for NSSOT, pre-commit, and Hist boundary. Everything mission-specific (healing, Sherry, usability) would drift. |
| Completeness of protection | 2 | 0.5 | 0 of 10 audit concepts are fully constitutional. 3 are partial. 7 are not constitutional. |
| **Total** | **10** | **3** | |

---

## 7. Why Is It Not a 10?

A score of 10 would require:

1. **Founder sovereignty explicitly encoded in NSSOT Article I** — not implied, not derivable, not in CLAUDE.md. Supreme law. Currently: 0.
2. **Healing mission in NSSOT** as a protected principle that no revenue optimization or cleanup pass can override. Currently: 0.
3. **`founder_usability_pass` as a runtime-enforced gate** in `grantBuildCompletion()` before any completion is granted. Currently: schema field only.
4. **Founder veto mechanism** — a Voice Rail command or API call that retroactively invalidates a completion receipt and returns a BP item to the queue. Currently: does not exist.
5. **Council escalation threshold rule** in NSSOT — defined threshold (e.g., "any build touching more than N files, or any build that affects a product Adam uses daily, must have deliberation review before PASS"). Currently: voluntary.
6. **Sherry context acceptance proof** — a CI or scheduled smoke test that verifies Sherry-relevant LifeOS features produce correct data. Currently: no acceptance proof.
7. **Shadow execution paths retired at code level** — not just quarantined by env var. Currently: quarantine-only.
8. **`required_outcome` mandatory in command-control jobs** — not optional. A job without declared required_outcome cannot proceed to `/build`. Currently: optional field.
9. **TSOS vocabulary aligned** in NSSOT — single authoritative definition. Currently: ambiguous split.
10. **LifeOS product activation verified** — a living document that shows which of the 18 phases Adam can actually experience working. Currently: unknown.

None of these 10 exist today. The current score of 3 comes from strong protection of the technical governance layer (pre-commit, auth, voice rail truth) while the personal sovereignty layer (usability, veto, healing, acceptance) has no constitutional protection whatsoever.

---

## 8. Top 3 Actions to Reach 10

These are not implementation plans. They are constitutional actions that would raise the score most.

### Action 1 — NSSOT Article: Founder Sovereignty and Healing Mission (raises score by ~3 points)

Draft and Adam-authorize a new NSSOT Article that explicitly states:

- Adam Hopkins is the sovereign of this system. His declared intent is the source of all build authority.
- No build may reach terminal PASS without a traceable founder instruction carrying a declared `required_outcome`.
- Platform revenue is a means to fund healing research for Sherry Hopkins and others with her conditions. No revenue optimization may deprioritize LifeOS wellness, care coordination, or health tracking features without explicit founder authorization.
- When healing is found, it goes free. No feature that enables healing access shall be gated by billing tier.
- The Hardship Protocol and Children's Dream Builder are unreachable by billing logic. (Currently in Article V-B — merge or reference here for completeness.)

This single NSSOT article closes 5 of the 10 constitutional gaps simultaneously.

### Action 2 — `founder_usability_pass` as execution gate (raises score by ~2 points)

In `services/builderos-completion-authority.js::evaluateBuildCompletion()`, add one condition:

```
if (input.lane === 'product' && !input.founder_confirmed) {
  return { granted: false, blocker: 'FOUNDER_CONFIRMATION_REQUIRED', terminal_status: 'PENDING_FOUNDER' }
}
```

This single code change, on the path that every completion must pass through, makes founder usability a hard gate. The mechanism for Adam to provide confirmation is a second step (Voice Rail acknowledgment, Action Inbox response, or POST to a confirmation endpoint). The gate must exist before the mechanism is perfect — an imperfect gate is infinitely better than no gate.

### Action 3 — Founder veto route (raises score by ~2 points)

Add to `routes/lifeos-command-center-routes.js`:

`POST /api/v1/lifeos/command-center/completion/veto`

Accepts a `completion_receipt_id` and returns the BP item to `PENDING_REVIEW` status. This is not a deletion of the receipt — it is a status override that reopens the BP item for review. The receipt becomes `VETOED: {reason}` rather than `GRANTED`. The governed loop checks for VETOED status before claiming a job's parent BP item is complete.

This closes the retroactive veto gap. Adam can wake up, see a receipt he didn't authorize, and push it back to the queue. Without this, every completion_receipt_id is a permanent fact regardless of whether it served Adam.

---

## 9. What Codex Should Review Next

**MISSION: LIFEOS PRODUCT ACTIVATION AUDIT V1**

Same recommendation as prior audits, now with constitutional urgency: the healing mission is constitutionally unprotected and the LifeOS features that serve it are PARTIAL in the capability truth audit. Before NSSOT Article I can be written, there needs to be a ground-truth inventory of which LifeOS phases actually work.

**Scope:** For each of the 18 LifeOS phases, classify from a user-experience perspective:
- ACTIVE: Adam can experience this right now
- PARTIAL: some features work; critical path broken
- MOUNTED: route responds but no real logic
- BROKEN: errors on interaction
- NOT_STARTED: UI exists, no backend

**Special attention:** Features relevant to Sherry (health tracking, care coordination, symptom logging), the Children's Dream Builder (constitutional, must be ACTIVE), the Hardship Protocol (constitutional, must be ACTIVE), and the Mirror (Adam's primary daily tool).

**Deliverable:** `docs/LIFEOS_PRODUCT_ACTIVATION_AUDIT_V1.md` with 18-phase table, ranked by Adam-impact, with specific failure analysis for anything not ACTIVE.

---

## 10. What C2.5 Should Review Next

**MISSION: FOUNDER VETO AND ACCEPTANCE MECHANISM DESIGN V1**

The council previously recommended C2.5 for LIVE BUILD EXECUTION READINESS RECEIPT V1. That mission is still valid and should not be abandoned. If C2.5 can only take one mission, this audit revises the priority:

The live build execution receipt closes a technical gap (U-02, U-03). The veto and acceptance mechanism closes a sovereignty gap. Sovereignty gaps are higher priority than technical gaps by the constitutional hierarchy.

**Scope:**
1. Design the founder veto mechanism: what does Adam do to veto a completion receipt? (Voice Rail command, C2 UI action, API call — the simplest possible path that is honest)
2. Design the founder acceptance mechanism: what does Adam do to confirm a product works? What is the minimum interaction that constitutes confirmation?
3. How do these mechanisms interact with the completion authority chain? (Before or after `completion_receipt_id` is issued? What happens to BP item status when vetoed?)
4. What is the schema change needed to support `VETOED` and `PENDING_FOUNDER` as BP status values?
5. Draft the NSSOT article text for founder sovereignty (Action 1 above) — not to merge, but for Adam to review

**Deliverable:** `docs/FOUNDER_VETO_ACCEPTANCE_MECHANISM_DESIGN_V1.md`

---

## 11. What Claude Should Review Next

**MISSION: NSSOT FOUNDER SOVEREIGNTY ARTICLE DRAFT V1**

The NSSOT article described in Action 1 should be drafted as a standalone amendment document that Adam can read, modify, and authorize in a single session.

**Scope:**
1. Read `docs/constitution/NORTH_STAR_SSOT.md` in full — find every reference to founder authority, healing, Sherry, council, and escalation
2. Identify which existing NSSOT articles would be affected by the new sovereignty article (avoid conflicts)
3. Draft a new NSSOT Article I (or amendment to existing Article I if one exists) with explicit clauses for:
   - Founder sovereignty as supreme authority
   - Healing mission as constitutional purpose
   - Required_outcome mandatory in build chains
   - Hardship Protocol and Children's Dream Builder as eternal guarantees (may reference Article V-B)
   - TSOS vocabulary (seven departments, TSOS under CFO)
4. Identify what existing NSSOT text must be amended to avoid contradiction with the new article

**Constraints:**
- Do NOT modify NSSOT directly
- Write as a standalone amendment document
- Mark every section that needs SNT adversarial review
- Mark every section that needs explicit Adam authorization before merge
- Note which existing NSSOT articles this supersedes or modifies

**Deliverable:** `docs/NSSOT_FOUNDER_SOVEREIGNTY_ARTICLE_DRAFT_V1.md`

---

## COUNCIL ALIGNMENT REPORT

This section reconciles the four input documents against the findings of this constitutional audit.

### Where all documents agree

| Finding | All agents concur |
|---|---|
| Voice Rail + execution truth = most protected | YES — unanimous across all 4 documents |
| Governed loop = only safe path | YES — unanimous |
| Shadow queue must retire | YES — unanimous (timing disputed, principle unanimous) |
| BP_PRIORITY = canonical queue | YES — unanimous |
| Pre-commit hooks = sacred | YES — unanimous |
| Completion authority = target state | YES — unanimous |
| Seven departments = protected | YES — unanimous |
| NSSOT supreme | YES — unanimous |

### Where this audit introduces new positions not in prior docs

**New position 1: Healing mission is constitutionally unprotected.**

FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT named it as something Adam would be angry we forgot. FOUNDER_VISION_PRESERVATION named it as underweighted in audit corpus. This audit escalates: it is not just underweighted — it has zero constitutional protection. Any agent without memory context can deprioritize wellness features without violating written law.

**Council alignment:** Prior documents introduced the concern; this audit formalizes the gap. No prior document disagrees. Position is additive.

**New position 2: Founder veto is a missing concept, not just a gap.**

No prior document described a retroactive veto mechanism. FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT introduced it as a gap in 90-day disappearance scenario. This audit names it as the most underprotected concept in the governance corpus — because it doesn't exist at all, not even as a documented gap in most prior documents.

**Council alignment:** New. No prior position to align or contradict. This audit introduces it into the governance corpus for the first time.

**New position 3: Separation of powers is structurally violated by the consolidation plan.**

The consolidation plan's goal — single terminal writer (`grantBuildCompletion()`) — is correct for reducing PASS authority fragmentation. But it concentrates authority in one service. If that service doesn't require multi-department input before granting, separation of powers still doesn't exist at the terminal decision point. This is a tension the consolidation plan hasn't addressed.

**Council alignment:** COUNCIL_RECONCILIATION identifies completion authority as target state (ACCEPT WITH RESERVATIONS row 16). It does not address whether the single terminal writer requires council input. This audit introduces that question. No prior document addresses it.

**New position 4: `required_outcome` being optional is a sovereignty gap, not just a technical gap.**

Prior audits flagged the outcome verification as the right architecture. This audit observes that outcome verification is meaningless if there is no declared required_outcome to verify against. A job can go through the full governed chain, call `verifyGovernedOutcomeBeforePass()`, and that function may receive `required_outcome: null` or `required_outcome: undefined`. What does the function do then? If it passes when required_outcome is missing, the outcome gate is illusory. This needs to be verified and, if true, fixed at the schema level (required_outcome mandatory in command-control job creation).

**Council alignment:** Not previously surfaced. This is a new gap for Codex to verify.

### Confidence score alignment

| Document | Confidence metric | Score |
|---|---|---|
| COUNCIL_RECONCILIATION | Overall architectural confidence | 78/100 |
| FOUNDER_SOVEREIGNTY_PRIORITY_AUDIT | Founder sovereignty score | 49/100 |
| This audit | Constitutional protection score | 3/10 (30/100) |

The three scores are measuring different things and are all correct:
- 78/100: We know what's wrong and how to fix it technically
- 49/100: The system somewhat serves Adam but key sovereignty mechanisms are missing
- 30/100: The system's ability to constitutionally protect Adam's personhood, mission, and veto is low

The gap between 78 and 30 is the gap between "technically sound consolidation" and "founder-sovereign system." Closing that gap is the work that comes after technical convergence.

---

## IF I AM WRONG

The most important epistemic discipline in this audit is naming where the analysis could be incorrect. Here are the strongest counterarguments to the key findings.

### Counter-argument 1: I may have understated NSSOT constitutional coverage

I cited NSSOT §2.11, §2.17, §2.18, and Article V-B from prior audit documents without reading NSSOT directly. It is possible that NSSOT already contains:
- Explicit founder sovereignty language
- Healing mission protection
- Council escalation thresholds
- Other constitutional protections I classified as "implied"

**If I am wrong:** The score should be higher. The constitutional gap claims for healing mission, council escalation, and founder sovereignty may already be closed. Codex or Claude reading NSSOT directly (not through audit summaries) would reveal this.

**How to verify:** Read `docs/constitution/NORTH_STAR_SSOT.md` in full. Search for "sovereign," "Adam," "healing," "Sherry," "escalation threshold," "usability," and "veto." If these concepts appear in explicit article language, the score rises to 5-6/10.

### Counter-argument 2: `founder_usability_pass` may be further along than I assessed

I assessed it as a schema field only, enforced nowhere. If AMENDMENT_21 or another amendment already defines a usability gate for LifeOS product lanes, and if `evaluateBuildCompletion()` references it, the gap may be partially closed.

**If I am wrong:** Founder acceptance protection is stronger than scored. The Phase 7 placement may be wrong — it may already be partially enforced in product lane completion paths.

**How to verify:** Read `routes/lifeos-council-builder-routes.js` L335 call to `grantBuildCompletion()` and trace whether `founder_confirmed` or any usability field is passed in the `CompletionRequest`.

### Counter-argument 3: The healing mission may be implicitly constitutional through LifeOS protection

NSSOT may protect LifeOS as a product with such specificity that wellness features, care coordination, and health tracking are implicitly constitutionally protected as LifeOS core features. If NSSOT says "LifeOS as whole-life consumer product is a protected domain," and if LifeOS is defined to include wellness and health tracking, then removing wellness features would violate NSSOT even without explicit healing mission language.

**If I am wrong:** The healing mission has indirect constitutional protection through LifeOS domain protection. The score rises to 4-5/10.

**How to verify:** Read NSSOT LifeOS article (if it exists) for feature-level enumeration vs. high-level domain description.

### Counter-argument 4: The veto mechanism may be implementable as a Voice Rail command today

If `routes/lifeos-voice-rail-routes.js` supports arbitrary system commands that route to command-control, Adam may be able to issue "reopen the last completion receipt" as a Voice Rail command today — without any new code. The governed loop could interpret this as a job that resets the parent BP item.

**If I am wrong:** Founder veto is closer to achievable than I stated. The mechanism exists; the route just isn't defined. Adding one command-control job type is simpler than a new API endpoint.

### Counter-argument 5: Separation of powers may be preserved by the deliberation architecture, not the completion authority

I argued that a single terminal writer violates separation of powers. But if every build of consequence requires a deliberation session (ChC proposes, SNT challenges, BPB validates, CDR executes), and if `grantBuildCompletion()` checks for a valid deliberation receipt before granting, then separation of powers is preserved upstream of the terminal writer — not in the writer itself.

**If I am wrong:** Separation of powers is architecturally correct and the single terminal writer is the correct consolidation move. The gap is that deliberation isn't currently required before commit — but that's a sequencing issue, not a constitutional design flaw.

---

## Files Created

- `docs/FOUNDER_CONSTITUTIONAL_PROTECTION_AUDIT_V1.md` (this file)

*No runtime code modified.*
