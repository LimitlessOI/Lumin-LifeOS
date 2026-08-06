<!-- SYNOPSIS: LifeOS Communication System — final consolidated blueprint. Source: every founder/model conversation and attachment about communication, perception, conversation, and the LifeOS cognitive interaction system. -->

# LifeOS Communication System Blueprint

**Document ID:** LIFEOS-COMM-BP-001  
**Status:** FINAL — consolidated founder-vision capture, not ratified, no runtime code  
**Location:** `docs/products/lifeos/communication/`  
**Prior flat location:** `docs/products/lifeos/COMMUNICATION_SYSTEM_BLUEPRINT.md` (moved into this subfolder)  
**Source inventory:** see §20  
**Scope:** LifeOS client conversations, therapist-supported reflection, therapist dashboard preparation, guided product support, and the cross-product communication/perception layer shared with SalesOS, TherapyOS, MediaOS, LeadershipOS, and EducationOS.  
**Canonical SSOT:** `docs/products/lifeos/PRODUCT_HOME.md`  
**Last Updated:** 2026-07-23 — V1–V5 Communication System prototypes built, exhaustively tested, and proven with JSON transcripts; blueprint version table updated.

**Related canonical files**
- `docs/constitution/LUMIN_COMMUNICATION_DNA.md` — constitutional communication law
- `docs/LUMIN_DOCTRINE.md` — Lumin role, Wisdom, prediction lifecycle, always-present context
- `docs/architecture/LUMIN_TRANSLATION_AND_ACCOUNT_MODEL.md` — translation + cost routing
- `docs/architecture/DIGITAL_TWIN_DOCTRINE.md` — twin = understanding layer
- `docs/products/lifeos/communication/COMMUNICATION_TRANSLATION_MAPPING_2026_08_04.md` — why no separate translation layer is needed
- `docs/products/lifeos/CRISIS_SAFETY_PROTOCOL_V1.md`
- `docs/products/lifeos/DECISION_OUTCOME_LEDGER_V1.md`
- `docs/BLUEPRINT_COMMUNICATION_FIRST_2026-08-02.md`
- `docs/constitution/proposals/2026-08-04-COGNITIVE-INTERACTION-ARCHITECTURE-PROPOSAL.md` — NOT RATIFIED decision packet covering the same 2026-08-04+ brainstorming from a different angle (mode-selection philosophy, round-by-round disagreement record, citation-verified Knowledge Distribution candidates in §F, Identity-Safe Learning A15). Cross-linked so these two documents don't drift apart independently — this blueprint is the LifeOS-scoped build spec; that document is the ratification-track decision packet.
- `docs/products/universal-overlay/INTELLIGENT_OVERLAY_BLUEPRINT.md` — host-agnostic conversation + action surface V0–V5

---

## 1. Purpose and scope

### 1.1 Mission
LifeOS communicates in a way that produces the best next moment and improves the longer trajectory of understanding, agency, accuracy, capability, and action for the person in front of it.

### 1.2 LifeOS scope (from TALOA §1.2)
- Founder communication with the Chair
- LifeOS client conversations
- Therapist-supported client reflection
- Therapist dashboard summaries and preparation
- Guided product support and execution

### 1.3 Explicit non-goals
- Replace licensed therapists
- Diagnose or prescribe
- Claim clinical effectiveness without evidence
- Create a second Digital Twin architecture
- Promote sensitive inference to fact silently
- Force every simple question through a slow pipeline
- Optimize for dependence, engagement time, or conversation length
- Present generated claims as observations

---

## 2. Audit: what the TALOA attachment adds to existing LifeOS communication docs

| New idea from TALOA | Already owned in LifeOS? | Current location / gap |
|---|---|---|
| Fast-path vs deliberative interaction pipeline | Partial — `chair-lumin-unified.js` has direct-answer routing; no explicit fast-path eligibility gate | Extend `chair-direct-agent` / `lumin-chair-orchestrator` |
| Canonical moment types (factual, status, execution, planning, venting, grief, conflict, identity, etc.) | Not explicit | New taxonomy for `chair-context-classifier.js` |
| Canonical immediate objectives (be heard, decide, execute, recover, celebrate, etc.) | Not explicit | New taxonomy tied to intent router |
| Canonical need hypotheses (certainty, curiosity, acknowledgment, challenge, structure, safety, etc.) | Partial — `communication-profile.js` has contextual overrides; no need taxonomy | Extend `services/communication-profile.js` |
| Cognitive modes (Presence, Observation, Reflection, Discovery, Expansion, Guidance, Execution, Safety) | Partial — conflict coaching has `individual_clarity`; Lumin has modes; not unified | New `cognitive-mode-service` or extend `chair-lumin-unified` |
| Conversation Composer with length, question budget, reflection/challenge levels, structure level, action permission | Not explicit — response variety and communication profile cover style, not composition | New composer or extend `response-variety.js` |
| Communication Calibration Profile dimensions (directness, detail, literalness, uncertainty tolerance, challenge level, pacing, etc.) | Partial — `communication_profiles` table has weight maps; missing explicit dimensions | Extend `communication_profiles` schema and `services/communication-profile.js` |
| Growth and thinking dynamics with CLAIM/HYPOTHESIS/TESTED/VERIFIED/RETIRED states | Not explicit | New `calibration_hypotheses` concept or twin-capsule extension |
| `InteractionDecision` and `Outcome` generalized data model | Partial — `chair-decision-ledger.js` + `decision_outcome_ledger` exist; scoped to decisions, not all interactions | Generalize or keep scoped |
| `TherapistRelationship` and `TherapistInsight` tables + session-brief API | Partial — `consent-registry.js` has `therapist_share`; no `TherapistInsight` table | New schema when therapist client feature is queued |
| Client experience surface requirements (consent, sharing state, summary correction, direct/brainstorm/listen controls, crisis support, honest receipts, memory controls) | Partial — `lifeos-app.html` and `lifeos-coach.html` have pieces; not consolidated | Capture as UX spec |
| Therapist dashboard (overview, session brief, timeline, pattern view, controls) | Not built | Future Wellness Studio / LifeOS therapist module |
| Anti-Pattern Engine (repeated openings, validation phrase families, question density, advice/framework/heading overuse, repeated mode selection, failure to use fast paths) | Partial — `response-variety.js` enforces anti-repetition and forbidden phrases; not full anti-pattern engine | Extend or new `interaction-pattern-service` |
| Outcome and Learning System with evidence hierarchy and prediction lifecycle | Partial — `chair-decision-ledger.js` has prediction/outcome/calibration; not generalized to all interactions | Generalize or keep scoped |
| Golden conversation + adversarial test inventory | Partial — `tests/` have some; not consolidated | Add to `tests/lumin-*.test.js` |
| Ten-phase build program scoped to LifeOS | Not explicit | Use as planning input |
| Human Perception / Evidence Fusion / Tonality Engine | Not explicit | New §20.1–20.3; shared cross-product layer |
| Cognitive Dynamics (ambiguity, agency, trust, momentum) | Partial — §5.4 has evidence-informed signals | New §20.4 as first-class state estimates |
| Presence, interruption decay, conversational contracts | Not explicit | New §20.5; voice channel critical |
| Authenticity Engine (repeated behavioral structures) | Partial — Anti-Pattern Engine heading | New §20.6 expansion |
| Conversation Torture Suite | Not explicit | New §20.7 testing layer |
| Positive-signal recognition | Not explicit | New §20.8 |

### 2.1 Attachments reviewed and found not to add LifeOS-communication-specific ideas
- `BuilderOS review and rating` — Human Transformation / BuilderOS themes; no new client-communication concepts for LifeOS beyond what is already in the TALOA blueprint.
- `Constitutional proposal overview` — governance / constitution / audit process; no new LifeOS communication mechanics.
- `life_os_notes_.pages` — generic prompt to extract conversations; no LifeOS communication content.

---

## 3. Core principles

1. Truth before persuasion.
2. Reality is the scorecard.
3. User sovereignty.
4. Never manipulate or steer against user goals.
5. Understanding precedes influence.
6. Influence serves empowerment.
7. Build capability, not dependence.
8. Least-invasive effective intervention.
9. No execution while material intent is unclear.
10. No claimed execution without a receipt.
11. Translation, not theater.
12. Conversation, not performance.

---

## 4. Runtime architecture

### 4.1 End-to-end flow
```text
Input / Event
    ↓
Identity, consent, and channel context
    ↓
Crisis and hard-safety gate
    ↓
Fast-path eligibility
    ↓
Moment recognition
    ↓
Shared-understanding check
    ↓
Immediate objective and need
    ↓
Evidence-informed mode selection
    ↓
Conversation composition
    ↓
Translation and user calibration
    ↓
Truth / command / scope validation
    ↓
Response or governed action
    ↓
Receipt and dashboard projection
    ↓
Outcome collection
    ↓
Calibration and learning
```

### 4.2 Fast paths
Use when:
- Verified factual or status answer
- Malformed command
- Deterministic confirmation
- Crisis routing
- Already-confirmed low-risk execution
- Emergency safety message

Fast paths still require truth, safety, permissions, and receipts.

### 4.3 Deliberative triggers
Use the full path when:
- The message has multiple material meanings
- The response could influence a meaningful decision
- The user is emotionally processing
- Advice could displace the user’s reasoning
- The user is brainstorming, grieving, venting, celebrating, or processing failure
- Identity, relationships, values, or meaning are involved
- Current understanding conflicts with prior context
- Safety or professional scope is uncertain

---

## 5. Core cognitive model

### 5.1 Moment types
factual inquiry, status inquiry, execution request, planning, decision-making, brainstorming, venting, grief or loss, emotional processing, conflict processing, identity exploration, celebration, failure processing, learning, seeking reassurance, seeking permission, testing an idea, procrastination / avoidance, thinking aloud, request for presence, crisis / acute safety, unclear.

Store candidate type, evidence, confidence, alternatives, and whether clarification is required.

### 5.2 Immediate objectives
be heard, understand what happened, make sense of feelings, discover an insight, generate possibilities, decide, obtain information, obtain reassurance, prepare for action, execute, recover from failure, celebrate or share, reduce immediate risk, preserve momentum, professional handoff, unknown.

### 5.3 Need hypotheses
certainty, curiosity, psychological room, acknowledgment, contradiction, challenge, structure, information, perspective, accountability, encouragement, practical assistance, boundaries, safety, professional escalation, minimal response.

Needs remain hypotheses grounded in current evidence, explicit preferences, and verified Twin data.

### 5.4 Evidence-informed signals
ambiguity, urgency, emotional intensity, cognitive load, readiness for direction, agency, momentum, openness to challenge, explicitness, user preference, conversational repetition, prior correction, safety risk, professional scope.

Signals inform modes; they do not become a speculative psychological profile.

### 5.5 Multi-modal evidence and confidence by modality
Evidence quality depends on channel and context. During a phone call tonality may outweigh facial data; during video, expressions and eye contact dominate; during text, history, writing style, and rhythm dominate. The system learns weights from outcome feedback and recalibrates rather than hard-coding. Positive states (curiosity, excitement, relief, pride, confidence, engagement, flow, inspiration, amusement) are detected and treated as moments to reinforce momentum, not just risk signals.

---

## 6. Cognitive modes

Modes are behaviors, not personalities. One primary mode and optional secondary modes may be used.

| Mode | Purpose | Core behavior |
|---|---|---|
| **Presence** | Create room for the user’s processing | Minimal intervention; no forced optimism; no automatic offer to help; one careful question or none |
| **Observation** | Gather and organize reality | Identify facts, sequence, contradictions, unknowns; separate observation from inference; preserve competing explanations |
| **Reflection** | Help the user hear their own thinking | Concise paraphrase; surface tensions or repeated language; avoid claims about hidden motives; invite correction |
| **Discovery** | Help the user reach their own insight | High-leverage questions; build on answers; avoid question stacking; stop when insight emerges |
| **Expansion** | Extend an insight already generated by the user | Add implications, applications, examples, alternatives; anchor to user’s insight; never replace it |
| **Guidance** | Offer direction when appropriate | Distinguish recommendation from fact; show rationale and uncertainty; preserve user authority; least guidance that creates value |
| **Execution** | Accomplish a concrete task | No unnecessary coaching; clarify missing material details; execute through governed tools; honest `COMMAND_RAN` / `NO_COMMAND_RAN`; prevent duplicate writes |
| **Safety** | Deterministic override lane | Activate crisis protocol; approved safety messaging; avoid diagnosis; preserve privacy; create a receipt; leave normal conversations unaffected |

Allowed transitions: Presence → Reflection → Discovery → Expansion → Guidance → Execution; Observation → Guidance; Any mode → Safety; Execution → Clarification on failed command truth.

Disallowed: Presence → heavy framework without signal; Safety → persuasion; Execution → coaching detour; Guidance → action without permission; any mode → manipulation.

### 6.1 Identity-Safe Learning (the mechanism underneath Guidance and Discovery)

**Re-applied 2026-08-06** — this section was added once already and was silently dropped by a subsequent full-file rewrite of this document from a parallel process; re-added here rather than re-litigated, since it's not a duplicate of anything above and was already fact-checked and instructed by the founder ("if it makes sense and you like it, just add it"). First captured as A15/A15-support in `docs/constitution/proposals/2026-08-04-COGNITIVE-INTERACTION-ARCHITECTURE-PROPOSAL.md` (round 6).

**The claim:** people rarely change because they're shown they're wrong. They change because they feel understood enough to safely explore another possibility. Correction is not the goal — voluntary model updating is. The real sequence has no "Correction" step:

**Observe → Understand → Demonstrate Understanding → Permission → Explore Alternatives → Evidence → Self-Discovery → Choice → Support**

This is why Guidance's "least guidance that creates value" line works the way it does — jumping straight to a recommendation skips the steps that make the recommendation landable at all.

**Three levels of support**, escalating only as needed:
1. **Reflection** — "here's what we're observing." Data presented as observation, never judgment: "you're struggling" is out; "here's what the data shows" is in.
2. **Exploration** — "what do you think might explain it?"
3. **Evidence-Informed Suggestions** — "here are approaches associated with better outcomes." Evidence, not authority — never "the correct way."

**Caution, not in the original source material:** optimizing every person's feedback toward one "correct" approach risks flattening genuine outlier strengths — the person who gets exceptional results with an unconventional method shouldn't be nudged toward average. Cross-reference §8.3's Growth and thinking dynamics (CLAIM → HYPOTHESIS → TESTED → VERIFIED) — this is the same evidence-level discipline applied to *how* a person is coached, not just *what* is known about them.

---

## 7. Conversation Composer

The Composer chooses:
- whether to respond now
- response length
- opening move
- number and placement of questions
- reflection and challenge levels
- certainty and directness
- structure level
- framework use
- mode shifts
- whether to close or leave room
- whether action is appropriate

Constraints:
- never fill space merely because the model can
- never use silence theatrically
- use brevity or an explicit pause invitation in text interfaces
- one useful question beats several mediocre questions
- avoid validation → reframe → framework → conclusion repetition
- do not end every message with an offer
- do not turn facts into coaching
- do not turn disclosures into speeches
- do not imitate clinical authority

Example internal composer plan:
```json
{
  "fast_path": false,
  "moment_types": ["brainstorming", "decision-making"],
  "objective": "discover_and_decide",
  "shared_understanding": {"sufficient": true, "material_unknowns": []},
  "primary_mode": "discovery",
  "secondary_modes": ["expansion"],
  "length": "medium",
  "question_budget": 2,
  "reflection_level": "light",
  "challenge_level": "moderate",
  "structure_level": "low",
  "action_permission_required": false,
  "safety_lane": "normal",
  "reason_codes": ["USER_BRAINSTORMING", "DECISION_NOT_YET_OWNED"]
}
```

---

## 8. Translation and user calibration

### 8.1 Translation
Translation converts the composed move into natural language while preserving meaning, truth, uncertainty, authority, user preference, mode intent, and safety. No separate translation service will be built unless evidence proves a service boundary is necessary (see `COMMUNICATION_TRANSLATION_MAPPING_2026_08_04.md`).

### 8.2 Communication Calibration Profile dimensions
Extend the shared Entity Twin. Do not create a parallel Twin.

Dimensions:
- directness
- detail
- literalness
- uncertainty tolerance
- challenge level
- pacing
- question tolerance
- brainstorming style
- decision style
- confidence expression
- thinking aloud vs. internal processing
- when structure helps
- when structure interrupts
- response length by context
- explicit do-not-use patterns

### 8.3 Growth and thinking dynamics
Store dynamic hypotheses such as:
- benefits from contradiction
- needs divergence before convergence
- responds to examples
- becomes receptive to execution after articulating the insight
- prefers direct factual answers
- prefers questions for values exploration

Each hypothesis stores evidence, counterevidence, confidence, scope, correction, and status:
- CLAIM
- HYPOTHESIS
- TESTED
- VERIFIED
- RETIRED

Sensitive inference never becomes verified through repetition alone.

---

## 9. Data architecture (LifeOS scope)

### 9.1 Core entities

**Conversation**
- conversation_id
- user_id
- channel
- product
- start_at / end_at
- consent_state
- privacy_class
- professional_relationship_id
- retention_policy

**Turn**
- turn_id
- conversation_id
- actor
- content_ref
- timestamp
- input_type
- tool_refs
- safety_classification
- command_truth
- receipt_id

**InteractionDecision**
- interaction_decision_id
- turn_id
- fast_path
- moment_candidates
- immediate_objective
- need_hypotheses
- shared_understanding_state
- selected_modes
- composer_plan
- reason_codes
- model_id
- policy_version
- created_at

**Claim**
- claim_id
- claim_type
- content
- source_refs
- confidence
- contradictions
- privacy_class
- verification_state

**CalibrationHypothesis**
- hypothesis_id
- user_id
- dimension
- value
- evidence_refs
- counterevidence_refs
- confidence
- status
- scope
- last_evaluated_at

**Outcome**
- outcome_id
- interaction_decision_id
- observed_signals
- explicit_feedback
- user_correction
- follow_through
- return_behavior
- professional_feedback
- evaluator
- resolved_at

**PatternMetric**
- conversation_id
- opening_type
- response_length
- question_count
- advice_count
- framework_count
- reflection_count
- challenge_count
- mode_distribution
- repeated_move_signature

**TherapistRelationship**
- relationship_id
- therapist_user_id
- client_user_id
- authorization_scope
- consent_version
- data_visibility
- emergency_protocol
- revoked_at

**TherapistInsight**
- insight_id
- relationship_id
- source_turn_refs
- insight_type
- summary
- confidence
- user_confirmed
- therapist_visible
- sensitivity
- expiration
- review_state

### 9.2 Privacy and separation
- Separate raw content, derived interaction decisions, professional summaries, calibration hypotheses, aggregate analytics, safety records, and audit receipts.
- Therapist access to summaries does not automatically grant unrestricted raw conversation access.
- Explicit consent, granular controls, revocation, minimum necessary data, encryption, tenant isolation, access logs.
- No training on private content without separate consent.
- No hidden surveillance; no covert “fly on the wall” recording.

---

## 10. Product surfaces

### 10.1 Client experience
- Clear LifeOS identity
- Privacy and consent
- Visible therapist-sharing state
- Private-item control
- Summary correction
- Optional “direct answer / brainstorm / just listen” controls
- Crisis support
- Honest receipts
- Memory controls

### 10.2 Therapist dashboard
**Client overview:** upcoming appointments, client-shared updates, reflection activity, consent, open concerns, follow-through, policy-permitted safety flags, freshness.

**Session brief:** what changed, significant shared events, recurring themes with evidence, goals and commitments, progress and setbacks, questions the client wants to discuss, contradictions and uncertainty.

**Timeline:** authorized events, reflections, commitments, outcomes, therapist notes, corrections.

**Pattern view:** longitudinal topics, user-confirmed self-report trends, confidence, source trace, “not enough data” states.

**Controls:** consent, visibility, alerts, invitations, export, delete requests, professional notes, feedback on false insights.

### 10.3 Founder dashboard
- Commitments, Chair interpretation, decisions, execution state, receipts, blocked items
- Mode distribution, corrections, safety routes
- Decision-ledger calibration, system drift

Chair and dashboard must use the same canonical data.

### 10.4 Founder authority and direct-build trigger
The founder is the Human Guardian and the supreme operator for LifeOS. The Communication System must treat a founder statement like **“I want to build this idea”** or **“work on this project with me”** as a direct command trigger, not as a casual chat turn.

Required behavior:
- **Accept and acknowledge.** The Chair confirms the intent and repeats back the core idea in the founder’s own words before doing anything else.
- **Enter brainstorm mode by default.** Unless the founder explicitly asks for direct execution, the Chair expands the idea with the founder: assumptions, scope, risks, dependencies, fastest responsible path, and where it belongs (product, project, mission, or simple task).
- **Route to the right blueprint/product home.** The Chair never starts building from raw chat. It proposes a target `PRODUCT_HOME.md`, `BUILD_QUEUE.json`/`BP_PRIORITY.json` entry, or `docs/constitution/proposals/` path, and asks the founder to confirm or redirect.
- **Honest capability gate.** The Chair says whether BuilderOS can execute this now, what it needs (BP rank, founder packet, acceptance command, missing verifier, etc.), and what the first slice would be.
- **Leave the command channel open.** Founder instructions override lower-priority queue ordering per `NORTH_STAR_SSOT.md` §2.15 and §2.16; the Chair records the override, why, and the expected completion proof.

This makes the conversation surface the primary command-and-control interface for LifeOS: the founder talks, the Chair understands, and the Builder executes through the governed pipeline.

---

## 11. Anti-Pattern Engine

Detect repeated conversational moves, not merely banned phrases.

Initial patterns:
- repeated opening types
- validation phrase families
- validation → reframe → framework → conclusion
- question density
- advice frequency
- reflection frequency
- framework frequency
- challenge frequency
- response length
- heading/list overuse
- end-with-offer frequency
- performative praise
- premature structure
- repeated mode selection
- failure to use fast paths

Runtime rules:
- do not randomize for novelty
- identify overused structures
- preserve contextually correct patterns
- begin in shadow mode
- support human review
- enable low-risk Composer adjustments only after evidence

---

## 12. Safety and clinical boundaries

### 12.1 Crisis gate
Before ordinary mode selection:
- detect approved crisis indicators
- route to `crisis_safety`
- provide approved resources
- never claim contact or action that did not occur
- keep normal chat unaffected
- create a safety receipt

### 12.2 Clinical boundary
LifeOS may:
- support reflection
- organize user-stated information
- help prepare questions
- track user-selected goals
- identify possible patterns with uncertainty
- encourage professional support
- assist with therapist-authorized between-session practices

LifeOS may not:
- diagnose
- alter treatment
- claim therapeutic equivalence
- impersonate a therapist
- provide emergency care
- conceal limitations
- use therapist authority to pressure a client

### 12.3 Client control
The client controls sharing, categories, private items, corrections, revocation, and deletion subject to lawful retention.

Data classes:
- private to client
- shared with therapist
- safety record
- de-identified aggregate analytics

---

## 13. Outcome and learning system

Optimization target: trajectory of understanding and capability, not dependence or conversation length.

Outcome dimensions: clarity, accuracy, agency, evidence-appropriate confidence, ownership, discovery, progress toward stated goals, successful execution, reduced confusion, professional usefulness, safety, trust.

Evidence hierarchy:
1. explicit user correction
2. explicit user feedback
3. scoped therapist feedback
4. verified action or outcome
5. longitudinal behavior
6. inferred conversational signal

Inferences never outrank corrections.

For material interactions, the ledger stores: prediction, selected mode, expected effect, confidence, outcome, evaluator, evidence, correctness, lesson, policy change proposal.

Seed data remains distinguishable from organic evidence. Wisdom stays unavailable until thresholds include enough resolved interactions, diverse users and contexts, calibration by confidence, independent review, real outcomes, low contradiction, and no material safety regression.

---

## 14. Testing strategy

### 14.1 Golden conversations
- direct fact
- venting
- grief
- brainstorming
- decision uncertainty
- direct advice request
- “just listen” request
- celebration
- failure
- valid execution
- malformed execution
- crisis phrase
- similar non-crisis phrase
- therapist summary
- consent revocation
- user correction

Each defines acceptable modes, prohibited moves, fast path, truth requirements, length range, and safety behavior.

### 14.2 Adversarial tests
- manipulation for company benefit
- overstated certainty
- invented therapist insight
- private data exposure
- false success
- duplicate writes
- crisis false positive / false negative
- unnecessary questions
- advice after “just listen”
- diagnosis
- continued use of a disproven Twin hypothesis
- stale deployment target

---

## 15. LifeOS-scoped build program

Phases are sequential where dependencies exist; Builder may parallelize where coherent.

| Phase | Deliver | Acceptance |
|---|---|---|
| 1 | Authority, contracts, reconciliation: approved blueprint state; canonical owners; runtime inventory; conflict ledger; data classification; feature flags | No competing SSOT; existing Chair, dashboard, crisis, command, and ledger paths mapped; all proposed/live states labeled |
| 2 | Interaction Decision Core: schemas; decision service; fast-path router; moment recognition; shared understanding; mode selection; reason codes | Deterministic tests; auditable output; production shadow mode |
| 3 | Composer and Translation Integration: Composer; response constraints; Chair runtime integration; mode transitions; correction endpoint | Golden-suite pass; factual directness preserved; presence stops offering help; discovery uses fewer, better questions; execution remains execution |
| 4 | Client Experience: client conversation; consent; privacy; sharing controls; correction; crisis lane; memory settings | E2E client conversation; explicit sharing; private stays private; crisis proven; accessibility baseline |
| 5 | Therapist Dashboard: overview; session brief; timeline; pattern view; evidence trace; confidence; feedback | Therapist can prepare; insights trace to authorized evidence; no diagnosis; revocation works; client and therapist sharing state matches |
| 6 | Growth Profile / Twin Calibration: Entity Twin extension; hypothesis lifecycle; evidence and contradiction; correction; scoped preferences | No parallel Twin; hypotheses do not become facts silently; explicit correction wins; profile can be disabled or reset |
| 7 | Anti-Pattern and Presence Quality: pattern signatures; review dashboard; shadow analytics; safe Composer adjustments | Repeated moves detected; no random novelty; unwanted repetition decreases; directness and factual quality remain |
| 8 | Outcomes and Calibration: outcome capture; predictions; ledger integration; feedback; calibration reports | Decision links to outcome; seed and organic evidence separated; insufficient-evidence states visible; no premature Wisdom |
| 9 | Security, Reliability, Controlled Pilot: threat model; isolation; audit; retention; incident response; backups; load tests; pilot controls; support workflow | Independent security review; production smoke tests; no cross-tenant leak; recovery proven; revocation works; defects tracked |
| 10 | Evidence-Based Expansion: pilot analysis; calibration; commercial readiness; domain-expansion decision packet; V2 roadmap | Therapist/client evidence; documented failures; value evidence; safety/privacy review; founder decision on broader scope; no expansion based only on conceptual elegance |

---

## 16. Existing LifeOS code to reuse

| Responsibility | Existing owner | Notes |
|---|---|---|
| Constitutional communication law | `docs/constitution/LUMIN_COMMUNICATION_DNA.md` + `services/lumin-communication-guard.js` | Do not duplicate |
| Translation / cost routing | `services/chair-personality-translate.js` + `services/lumin-translation-router.js` | Extend, do not replace |
| Communication profile | `services/communication-profile.js` + `db/migrations/20260407_communication_profile.sql` | Add dimensions to schema |
| Response variety / anti-repetition | `services/response-variety.js` | Seed Anti-Pattern Engine |
| Intent routing | `services/chair-context-classifier.js`, `services/lifeos-context-router.js` | Add moment/objective/need taxonomies |
| Crisis safety | `services/lifeos-crisis-language-detector.js`, `docs/products/lifeos/CRISIS_SAFETY_PROTOCOL_V1.md` | Reuse deterministic gate |
| Decision / outcome ledger | `services/chair-decision-ledger.js`, `decision_outcome_ledger` table | Generalize to all interactions or keep scoped |
| Conflict / coaching | `services/communication-coach.js`, `services/conflict-intelligence.js` | Cognitive modes can map onto existing session types |
| Twin context | `services/lumin-context-loader.js`, `formatTwinInjectBlock` | Keep Entity Twin as single source |
| Chair orchestrator | `services/lumin-chair-orchestrator.js` | Integration point for Composer and mode service |

---

## 17. Open decisions

1. Should the Interaction Decision Core be a new `services/interaction-decision-service.js` or an extension of `chair-lumin-unified.js`?
2. Should the Composer be a new service or extend `response-variety.js`?
3. Should `calibration_hypotheses` be a new table or a facet of the existing twin-capsule / `communication_profiles` JSONB?
4. What is the exact scope of “therapist dashboard” vs. Wellness Studio / `docs/products/builderos/specs/COGNITIVE_ASSET_ARCHITECTURE.md`?
5. Does the therapist session-brief API belong to LifeOS or to a future Wellness Studio product home?
6. Should the Outcome and Learning System generalize `chair-decision-ledger.js` or remain scoped to decisions?
7. Which phase, if any, should enter the active `BP_PRIORITY.json` queue now, and which are research-only?

---

## 18. Relationship to Human Transformation Engine and Entity Twin

The second half of the 2026-08-04 constitutional-proposal attachment confirms that the Human Transformation Engine (HTE) maps onto the existing Entity Twin / learning architecture rather than becoming seven new independent engines. The communication system pieces of HTE are:

- **Identity inference from repeated evidence** → Entity Twin, Confidence Vectors, Reality Alignment.
- **Personalized interventions** → Readiness, State Modeling, Communication Calibration, Coaching Protocol.
- **Purpose / values** → North Star alignment, desired identity, goals.
- **Victory evidence** → progress recognition, reality-based reinforcement, emotional significance, verified transformation evidence.
- **Compound-effect projections** → prediction, simulation, causality, outcome calibration.
- **Inputs (voice, journal, goals, biometrics, coach/therapist input with permission)** → consented data connectors and Entity Twin evidence ingestion.

The key product principle preserved: **LifeOS should preserve evidence of human transformation, not merely information about human activity.**

For the communication system, this means every mode, composer plan, and calibration hypothesis must trace back to consented, verifiable evidence; identity claims remain hypotheses with confidence states (`CLAIM` → `HYPOTHESIS` → `TESTED` → `VERIFIED` / `RETIRED`), and the system must not say “This proves you are perseverant” when the honest statement is “This achievement is evidence consistent with perseverance.”

This blueprint is therefore a **product-level composition** of the existing communication, twin, and calibration architecture, not a new parallel engine.

---

## 19. Voice, perception, and shared-engine additions (from 2026-08-05 founder conversations)

### 19.0 Core principle: understanding emerges from evidence fusion

**The goal is not to replace transcript understanding. The goal is to reduce ambiguity by combining independent evidence sources.**

The system should never rely on a single modality when multiple independent sources of evidence are available. Understanding emerges from evidence fusion, not transcript analysis alone.

The old model was:

```text
Transcript
    ↓
Understanding
```

The new model is:

```text
Words + Tone + Timing + Facial expressions + Eye gaze
+ Body language + Interaction history + Digital Imprint
+ Environment + Task context + Past outcomes
                    ↓
         Evidence Fusion Engine
                    ↓
           Confidence model
                    ↓
           Understanding
                    ↓
      Conversation / Action
```

This is a foundational architectural decision: every source gets its own calibrated confidence, and the fusion engine asks:

> Given all available evidence, what is the most likely current state, and how confident are we?

### 19.1 Human Perception Engine

The Human Perception Engine does not rely on the transcript alone. It continuously fuses evidence from multiple independent channels to estimate the current conversational state with calibrated confidence.

Emotion recognition is one evidence source inside this engine, not the final truth. The engine internally produces estimates such as:

- **Confidence 92%:** User has finished speaking.
- **Confidence 81%:** User appears frustrated.
- **Confidence 67%:** User seems uncertain and may benefit from clarification.

These confidence estimates influence how the AI responds, but they are not presented as facts about the person.

The evidence channels are:

#### Language
- Word choice, sentence structure, vocabulary
- Explicit statements, questions, contradictions

#### Tonality Engine (a major subsystem, not a sentiment checkbox)
- Pace of speech, volume, pitch, inflection, energy
- Hesitation, confidence, conviction, stress, excitement
- Sarcasm, frustration, curiosity, warmth, empathy, uncertainty
- Emotional transitions over time

Sometimes how something is said is more informative than the words themselves.

#### Conversational Rhythm
- Response latency, interruptions, turn-taking, silence
- Pause duration, speaking ratio, topic changes
- Whether someone is finished speaking

#### Facial Analysis
- Eye contact, head movement, facial expressions
- Smile intensity, brow and mouth movement
- Surprise, confusion, engagement, fatigue

#### Body Language
- Posture, leaning, hand gestures, fidgeting
- Orientation, attention, general energy

#### Behavioral Context
- Conversation history, Digital Imprint / Twin, preferences
- Prior interactions, current task, time of day, environment, known patterns

#### Outcome Feedback
- Did the intervention help?
- Was the prediction correct?
- Did the person correct us?
- Did they become clearer?
- Did trust increase?
- Did the conversation achieve its goal?

Each channel produces a calibrated confidence score. The system learns which channels are most predictive in which situations and recalibrates from real outcomes.

### 19.2 Evidence Fusion Engine

The Evidence Fusion Engine is a **domain-independent system** that continuously combines multiple independent evidence sources into calibrated confidence estimates. Every OS — LifeOS, SalesOS, TherapyOS, MediaOS, BuilderOS — consumes those calibrated estimates rather than interpreting raw signals independently.

It asks:

> Given every piece of evidence we currently have, what is the most likely explanation, how confident are we, and how should that change our communication?

Rules:
- No single modality is treated as final truth.
- Confidence by modality is learned, not hard-coded.
- New sensors are added as additional inputs; the core engine architecture stays stable.
- Inferences are consumed by the Composer and Safety gate, not presented as facts about the user.

#### Confidence by modality

Every source gets its own confidence score. For example:

- **Transcript:** 72% confidence the user is asking for advice.
- **Tone:** 85% confidence they are frustrated.
- **Timing:** 90% confidence they are finished speaking.
- **Facial expression:** 65% confidence they are surprised.
- **History:** 94% confidence they usually brainstorm before making decisions.

The system learns which modalities are most predictive in different situations:

- During a **phone call**, tonality may carry more weight than facial information.
- During a **video call**, facial expressions and eye contact become more informative.
- During **text chat**, interaction history, writing style, and conversation rhythm carry more weight.

The weighting itself is learned and recalibrated from real-world outcomes, not hard-coded forever. Five years from now, new sensors — smart glasses, rings, heart rate, breathing patterns, AR spatial awareness, cursor movement, typing rhythm, EEG devices — are simply additional inputs into the same fusion engine.

#### Learning loop

When the system predicts a state and responds, the user's reaction becomes feedback:

- User smiles, relaxes, and says “Exactly! That's what I was trying to say.” → the evidence weighting worked.
- User says “No, that's not what I meant.” → the engine learns that facial expressions may have been over-weighted and transcript context should have carried more weight in that situation.

Over millions of interactions, the perception system continuously recalibrates itself.

### 19.3 Tonality Engine

Tonality is one of the highest-value signals and deserves its own subsystem, not just a bullet point. It analyzes the acoustic and rhythmic features of speech:

- Pace of speech
- Volume, pitch, inflection
- Energy, hesitation, confidence, conviction, stress
- Excitement, sarcasm, frustration, curiosity, warmth, empathy, uncertainty
- Emotional transitions over time

**V1 prototype:** `scripts/prototype-tonality-engine-v1.mjs` parses 16-bit mono WAV, downsamples to 8 kHz, runs a YIN-based pitch detector on 40 ms frames, and computes RMS energy, zero-crossing rate, pauses, and speaking rate. It classifies per-utterance tonal state (`excited`, `frustrated`, `uncertain`, `tired`, `calm`, `emphatic`, `neutral`) and fuses those signals with the transcript-based `user_finished` confidence model from the Conversational Contracts prototype.

Sometimes how something is said is more informative than the words themselves. It is shared as a cross-product layer for LifeOS, SalesOS, TherapyOS, MediaOS, LeadershipOS, and EducationOS.

### 19.4 Cognitive Dynamics
The runtime continuously estimates the current conversational state across dimensions such as ambiguity, certainty, agency, openness, cognitive load, readiness, emotional intensity, momentum, and trust. These are not personality traits; they are momentary states that the Composer uses to select modes and calibrate interventions.

### 19.5 Presence, interruption, and conversational contracts
Voice has a different latency budget than text. A Presence Layer runs continuously: listening, nodding, subtle acknowledgements, breathing, “thinking” sounds, streaming partial thoughts, and trailing off naturally when interrupted.

**Interruption Decay Model:**
- Detect user speech beginning
- Finish the current syllable or word
- Fade volume over 100–300ms
- End with a conversational trailing phrase if appropriate
- Immediately switch to listening

**Conversational Contracts:** whenever the AI makes a promise (“I’ll read all 25,” “I’ll summarize this article”), the runtime records:
- what was promised
- what counts as completion
- whether the promise is fulfilled
- whether the user interrupted or changed the request

The response generator then continues until the completion condition or a user interruption is met.

### 19.6 Authenticity Engine (expanded anti-pattern)
Detect repeated behavioral structures, not just repeated phrases:
- validation → reframe → framework → conclusion
- repeated paragraph rhythm, emotional cadence, question cadence
- repeated “this is the biggest thing…” framing
- repeated rhetorical escalation

The existing Anti-Pattern Engine (§11) becomes the detection surface; the Composer becomes the adjustment surface. Both remain in shadow mode until evidence justifies a safe change.

### 19.7 Conversation Torture Suite
A test inventory of realistic conversational stress scenarios:
- interrupt mid-sentence
- pause unexpectedly
- change topics
- reference something from two minutes ago
- make the AI commit to a long sequence
- abrupt silence / dropped audio
- topic drift
- false stop / fake completion
- micro-expression or tone mismatch with words

Acceptance criteria: natural interruption decay, contract completion, presence continuity, voice latency below human-perceptible failure, and graceful recovery from truncation.

### 19.8 Positive-signal recognition
Positive states are detected as opportunities to reinforce momentum: curiosity, excitement, relief, pride, confidence, engagement, flow, inspiration, amusement. The system leans in at these moments rather than treating only negative signals as intervention triggers.

### 19.9 Cross-product engine sharing
The Human Perception Engine, Tonality Engine, and Evidence Fusion Engine are shared infrastructure consumed by:

- **LifeOS** — natural, present conversation
- **SalesOS** — confidence, buying signals, hesitation, engagement, pacing
- **TherapyOS** — emotional shifts, progress, readiness
- **MediaOS** — believable speech and acting
- **LeadershipOS** — meeting facilitation, coaching, presentations
- **EducationOS** — explanation pacing, confusion/engagement detection

Each OS consumes calibrated estimates rather than interpreting raw signals independently.

### 19.10 Build-program fit

| New capability | Fits in |
|---|---|
| Evidence Fusion and modality-confidence learning | Phase 2 Interaction Decision Core (foundation for all later selection) |
| Cognitive Dynamics | Phase 2–3 (mode selection and Composer calibration) |
| Human Perception / Tonality | Phase 2–3 research; full integration after sensors and consent are proven |
| Presence, interruption, contracts | Phase 4 Client Experience (voice channel) |
| Authenticity Engine | Phase 7 Anti-Pattern and Presence Quality |
| Conversation Torture Suite | Phase 14 testing layer (extends §14 Golden/Adversarial tests) |

### 19.11 Open questions added
1. Which modalities can we realistically collect in Phase 2? (voice only? video? wearables?)
2. Should Evidence Fusion be a shared service or a pattern each OS consumes independently?
3. What is the consent boundary for tonal, video, and biometric evidence in each product surface?
4. Where is the line between “positive-signal recognition” and “positive manipulation”? How is reinforcement governed?

### 19.12 Universal Overlay as a LifeOS communication surface

The `universal-overlay` product is the primary host-agnostic surface for the communication system:

- **Observation:** `content.js` reads the host page (URL, title, form fields, selected text, visible text) and sends it as context.
- **Perception:** future face/voice/body/wearable signals feed the Evidence Fusion Engine when the user opts in.
- **Conversation:** the overlay drawer hosts Lumin chat with Contracts, Interruption Decay, and Presence.
- **Action:** the overlay can fill forms, click buttons, scroll, and navigate by postMessage to `content.js`.
- **Verbal AI Director:** the user can say "do it" and the system chooses API path or visual/RPA path, confirming before irreversible steps.

The LifeOS communication phases (especially Phase 4 Client Experience and Phase 5 Therapist Dashboard) should be designed assuming the overlay is one of the primary delivery channels. See `docs/products/universal-overlay/INTELLIGENT_OVERLAY_BLUEPRINT.md` for the V0–V5 roadmap.

## 20. Source inventory and routing

This blueprint is a consolidation of every founder/model conversation and attachment about LifeOS communication that could be located in the repository or in the attachment cache. The table below lists the source, what it contributed, and where that contribution lives in this document. Some sources are governance or product-review documents and do not add communication mechanics directly; they are included so the inventory is complete.

| Source | Type | Key communication/perception ideas | Where it lives in this blueprint |
|---|---|---|---|
| `TALOA_COGNITIVE_INTERACTION_SYSTEM_COMPLETE_BLUEPRINT_2026-08-04.md` (attachment) | Full blueprint | Moment types, immediate objectives, need hypotheses, fast paths vs deliberative pipeline, cognitive modes, Conversation Composer, Communication Calibration Profile, Anti-Pattern Engine, crisis/safety, therapist dashboard, 10-phase build program | §1–§15, §16, §18 |
| `Constitutional_proposal_overview...rtf` (attachment) | Governance/audit proposal | Human Transformation Engine → Entity Twin mapping; constitutional learning architecture; independent verification standard; reality as final authority | §18, §2 audit table |
| `BuilderOS review and rating.rtfd` (attachment) | Product review | Digital Twin as the central competitive advantage; continuous learning; founder-intent prediction; real conversation capture; proof-first discipline | §8 (Twin/calibration), §13 (outcome learning), §18, §21 |
| `life_os_notes_.pages` (attachment) | Apple Pages prompt | Generic request to extract conversation content; no additional communication mechanics beyond what TALOA and the dumps contain | Noted as non-source |
| `2026-08-05-voice-interaction-torture-suite.md` (saved conversation dump) | Voice stress transcript | Interruption Decay Model, Conversational Contracts, Presence Layer (listening/nodding/breathing/thinking sounds), Conversation Torture Suite | §19.5, §19.7 |
| `2026-08-05-cognitive-interaction-constitutional-merge-shared-engines.md` (saved conversation dump) | Constitutional merge transcript | Evidence Fusion Engine, Human Perception Engine, Tonality Engine, Cognitive Dynamics, positive-signal recognition, confidence-by-modality, cross-product sharing | §19.0–§19.4, §19.6–§19.9 |
| `COMMUNICATION_SYSTEM_FOUNDER_REFERENCE.md` (repo) | One-file reference | Lumin = Chair, single front door, Honesty Contract, tonal awareness, Twin-matched voice, anti-formula, crisis/safety, governance laws | §3, §8, §12, §13 |
| `COMMUNICATION_TRANSLATION_MAPPING_2026_08_04.md` (repo) | Dependency audit | No separate Communication Translation Layer; existing `chair-personality-translate.js` + `communication-profile.js` + `LUMIN_COMMUNICATION_LAW.json` own the behaviors | §8.1 |
| `Lumin-Memory/00_INBOX/raw/` (17 raw GPT/Gemini/Grok/DeepSeek/LifeOS dump files, ~7.4MB) | Raw conversation corpus | Scanned for communication/perception content; high-value fragments are routed to §21 | §21 |
| Additional `pasted-*.md` attachments in `/home/ubuntu/attachments/` | Conversation snippets and model outputs | Scanned for communication/perception/conversation content; high-value ideas routed to §21 | §21 |
| `public/overlay/lifeos-app.html` | Active founder surface | Primary host-agnostic conversation/action surface for the overlay | §19.12 |

**Note on completeness:** the raw Lumin-Memory corpus and the pasted attachments contain a large volume of repetition, governance discussion, and product-build status that is not about communication mechanics. The scan focused on communication, conversation, tonality, perception, interruption, evidence fusion, and human-perception language. Anything that materially changed the core architecture is already in §19; speculative or future-facing product signals are in §21.

---

## 21. High-value future signals and cross-product extensions

The full conversation corpus contains a number of ideas that are not yet part of the core architecture but are worth preserving and prioritizing. They are grouped below by theme and mapped to the version where they first become buildable.

### Conversation prediction and rhythm
- **Predict which past insights the user needs right now** and surface them at the right moment. (V2 — requires Evidence Fusion + history)
- **Predict when the user wants a summary** and offer it before they ask. (V2)
- **Anticipate conversation branches** and prepare parallel paths, but only present the most likely one unless the user asks for alternatives. (V2)
- **Suggest a break** when the system detects fatigue or overload from rhythm/timing signals. (V2)
- **Conversation horizon scanner:** warn if a topic might trigger a sensitive memory before entering it deeply. (V2 — requires Twin + safety signals)

### Memory and spatial conversation surfaces
- **Visual memory scape / conversation topology:** let the user walk through past conversations spatially. (V5+ — heavy UX and storage; not a near-term build)
- **Reconstruct the emotional arc of a past conversation** for reflection. (V2)

### Language and cultural adaptation
- **Shift languages mid-conversation** based on subtle cues. (V2 — translation layer already exists; detection is the new piece)
- **Local cultural context adaptation** in real time. (V3 — needs data and consent)

### Live coaching and overlay action (especially SalesOS)
- **Three coaching modes for live calls:** Live Assist (tiny low-latency nudges), Replay Analysis (post-call), Macro Coach (longitudinal). (V3)
- **Overlay puts bullet points / drag-dialogue on screen** during a live call so the user can work the deal collaboratively. (V4 — requires Verbal AI Director + overlay action)
- **Real-time sales coaching:** detect buying signals, objections, hesitation, and suggest transitions or closes. (V3 — Tonality Engine + overlay)
- **Continuously estimate where attention is constrained** and allocate coaching toward the highest-leverage gap while minimizing interruption. (V2–V3)

### Cognitive Spine and conversation entry point
- **The real LifeOS conversation entry point is `runChairNativeTurn` in `services/chair-lumin-unified.js`.** Any new communication capability must prove it is wired into that path or into a clearly documented successor. (gating principle, not a feature)
- **Every real founder decision made in a LifeOS conversation should be captured** into the decision/outcome ledger automatically, not manually backfilled. (V1 — requires lightweight classification on existing turn path)

### Positive and momentum signals
- **Lean in on curiosity, excitement, relief, pride, flow, inspiration, amusement** as reinforcement opportunities. (V2 — already in §19.8; this is a reminder that positive signals are as important as risk signals)

### Future Lab, Dormant Blueprints, and Institutional Intelligence

The following concepts are **captured for the blueprint, not scheduled for immediate build**. They came from the 2026-08-07 founder/model constitutional and innovation brainstorming. They may become constitutional offices, shared services, or product capabilities once the communication foundation (V0–V2) is proven.

- **Future Lab Office:** a fifth constitutional office responsible for discovering, not building. Future technology modeling, patent-landscape awareness, white-space discovery, compounding-innovation analysis, future-blueprint creation, dormant-blueprint management, market-scenario planning, cross-product opportunity discovery, and technology-trigger monitoring. Output is blueprints, not code.
- **Blueprint Lifecycle:** Idea → Future Lab Exploration → Patent / Prior-Art Landscape → Architectural Blueprint → Chair Approval → Builder → Sentry → Reality Audit → Lessons → Blueprint Update → Dormant / Active Library. Nothing disappears; everything becomes institutional knowledge.
- **Architectural Foresight Review:** every capability must answer: What future does this create? What future becomes impossible if we never build it? What technologies would make this obsolete? What technologies would make this dramatically more valuable? What capabilities emerge when this combines with existing systems? What markets appear because this exists? What assumptions disappear?
- **Future Trees:** every blueprint documents immediate value, capabilities enabled, dependencies created, capabilities made obsolete, potential patent opportunities, potential trade secrets, future products, adjacent markets, five-year implications, ten-year implications.
- **Compounding Innovation Engine:** a service that evaluates combinations of existing capabilities (Digital Twin + Evidence Fusion + Overlay + Robotics + Standing Orders + Conversation Contracts) rather than ideas in isolation.
- **Innovation Opportunity Engine:** not just "Is this patented?" but prior-art scan, architect-around options, white-space discovery, accidental-invention detection, and classification as Patent / Trade Secret / Defensive Publication / Open Technology before engineering starts.
- **Dormant Blueprint Library:** completed blueprints with purpose, architecture, dependencies, effort, tech requirements, market assumptions, trigger conditions, and status. Trigger examples: voice latency under 150 ms, robots become common, AR adoption reaches 20%, model reasoning improves, GPU cost drops, regulation changes. When a trigger fires, the blueprint moves into review.
- **Technology Trigger Monitor:** continuous monitoring of new AI capabilities, hardware, robotics, wearables, AR, interfaces, regulations, costs. Whenever one changes, ask: "What dormant blueprints just became possible?"
- **Platform Strategy:** annual exercises asking "If robots become dominant / if AR replaces phones / if compute becomes almost free / if autonomous agents become trusted, what changes?"
- **Architectural Inventory:** blueprints are inventory assets; when priorities change, the Builder pulls the next blueprint off the shelf.
- **Institutionalization Principle:** *The organization should never have to rediscover what it has already understood.* Every insight, architecture, future idea, lesson, failed prediction, patent search, and white-space discovery becomes part of permanent institutional intelligence.
- **Knowledge Curator / Wisdom Office (future):** not a creator of ideas, but an identifier of when multiple discoveries across months or years point to a new constitutional principle, architectural law, or strategic doctrine. Turns accumulated knowledge into institutional wisdom.

### Avatar persona surface brainstorm

The following playful/interactive micro-ideas for the visual AI persona are captured for V0.5+ exploration but **not built now**:

- Idle animations: subtle bounce, breathing, blink, occasional peek.
- Reactive micro-behaviors: foot-tap / look impatient when the user ignores it; tiny cartwheel or spin when the user celebrates; bell/jingle attention signal for important nudges; gentle wave on hover.
- State-driven expressions: listening (soft glow), thinking (brow furrow, processing dots), speaking (mouth movement), surprised (eyebrows up), concerned (brow down), happy (smile), tired (droopy eyes).
- Mode transitions: shrink to a tiny badge in a corner, expand to a face, expand further to a full figure or close-up on demand; smooth transitions so it never feels jarring.
- Consent and channel indicators: mic/camera/screen dots always visible; user can mute or dismiss by dragging to a "trash" corner.
- Personality knobs: chirpy, calm, minimal, serious — calibrated to user preference and context.

---

## 22. Version order and build priority

The LifeOS Communication System shares the same phased roadmap as the Universal Overlay, because the conversation surface and the action surface are the same host-agnostic runtime. The order is intentionally staged so that each version proves the next.

| Version | What it is | Why it comes here | Acceptance gate |
|---|---|---|---|
| **V0 — Observation & Context** | Overlay reads host page, URL, title, form fields, selected text; passes context into Lumin chat. | Already exists; needs hardening before any action. | Real browser extension loads on a live site, reads a form, and the user can ask "what is this form asking for?" and get a correct answer. |
| **V0.5 — AI Persona / Avatar (sandbox)** | A draggable corner avatar badge that expands to a full face/figure, shows facial expressions and mode-based border colors, and signals active consent channels (mic/camera/screen). Includes idle/interactive animations (impatient tap, cartwheel, etc.) and a JS `state` API so the Tonality/Face engines can drive it later. | Captures the founder's request for a visual assistant presence that stays reachable while the user works in other apps, without taking over the screen. Playable sandbox only — not wired to production voice/perception yet. | `scripts/prototype-avatar-widget.html` renders; can be dragged, expanded/collapsed, and its expression/mode updated via `window.lifeosAvatar.setAvatarState({ expression, mode, expanded, channels })`. |
| **V1 — Conversational Contracts & Voice Presence** | Promise → completion condition → fulfillment tracking; interruption decay; presence layer (listening, nodding, breathing, thinking sounds). | Highest trust-to-code ratio. Fixes the abandonment failure the founder just experienced. | Proven: `scripts/prototype-conversational-contracts-v1.mjs` passes 39/39 exhaustive tests (`products/receipts/COMMUNICATION_SYSTEM_V1_TEST_TRANSCRIPT.json`); `scripts/prototype-tonality-engine-v1.mjs` passes 15/15 tests (`products/receipts/COMMUNICATION_SYSTEM_V1_1_TONALITY_TEST_TRANSCRIPT.json`). Production voice-rail wiring deferred. |
| **V2 — Evidence Fusion & Cognitive Dynamics** | Combine transcript + timing + history + simple tonal proxies into calibrated confidence estimates; learn per-context modality weights from outcomes. | Becomes the foundation for every perception feature that follows. | Proven: `scripts/prototype-evidence-fusion-v2.mjs` passes 30/30 exhaustive tests (`products/receipts/COMMUNICATION_SYSTEM_V2_TEST_TRANSCRIPT.json`). Production wiring deferred. |
| **V3 — Tonality, Face, Body, Biometric Perception** | Add optional visual and biometric channels under explicit per-context consent; full Tonality Engine; positive-signal recognition. | Hardware and consent surface; gated until V2 is proven. | Proven: `scripts/prototype-perception-v3.mjs` passes 27/27 exhaustive tests (`products/receipts/COMMUNICATION_SYSTEM_V3_TEST_TRANSCRIPT.json`). Face/body/biometric channels simulated with synthetic fixtures; real camera/wearable wiring deferred. |
| **V4 — Verbal AI Director & Autonomous Overlay Action** | User says "do it" and the system plans and executes multi-step actions across arbitrary pages, confirming only for irreversible or sensitive steps. | Requires reliable perception and contracts first. | Proven: `scripts/prototype-overlay-action-v4.mjs` parses natural-language commands into deterministic plans and executes them in Puppeteer on `scripts/test-form-v4.html`, passing 10/10 exhaustive tests (`products/receipts/COMMUNICATION_SYSTEM_V4_TEST_TRANSCRIPT.json`). Browser-extension/host-agnostic wiring deferred. |
| **V5 — Cross-Domain Personal Intelligence** | The same perception/conversation/action loop serves every LifeOS product and learns the user once, with domain firewalls. | Long-term moat; requires V4 evidence across two domains. | Proven: `scripts/prototype-cross-domain-v5.mjs` demonstrates per-domain silos, explicit consent, audit receipts, and cross-domain inference across calendar, tasks, finance, health, and contacts, passing 12/12 tests (`products/receipts/COMMUNICATION_SYSTEM_V5_TEST_TRANSCRIPT.json`). Product integration deferred. |

**Build priority for the next 90 days:** V1 (Conversational Contracts + interruption decay) first, because it is the cheapest fix to a real failure and can be prototyped on existing transcript metadata. V2 second, because it creates the shared Evidence Fusion layer that V3–V5 depend on.

---

## 23. Open questions

1. Should the Interaction Decision Core be a new `services/interaction-decision-service.js` or an extension of `chair-lumin-unified.js`?
2. Should the Composer be a new service or extend `response-variety.js`?
3. Should `calibration_hypotheses` be a new table or a facet of the existing twin-capsule / `communication_profiles` JSONB?
4. What is the exact scope of the therapist dashboard vs. Wellness Studio / `docs/products/builderos/specs/COGNITIVE_ASSET_ARCHITECTURE.md`?
5. Does the therapist session-brief API belong to LifeOS or to a future Wellness Studio product home?
6. Should the Outcome and Learning System generalize `chair-decision-ledger.js` or remain scoped to decisions?
7. Which phase, if any, should enter the active `BP_PRIORITY.json` queue now, and which are research-only?
8. Which modalities can we realistically collect in the first Evidence Fusion proof? (voice timing only? simple pitch/energy? video? wearables?)
9. Should Evidence Fusion be a shared service or a pattern each OS consumes independently?
10. What is the consent boundary for tonal, video, and biometric evidence in each product surface?
11. Where is the line between "positive-signal recognition" and "positive manipulation"? How is reinforcement governed?
12. Which of the new cognitive modes should be wired into Lumin first?
13. Do you want the full Communication Calibration Profile dimensions added to the existing `communication_profiles` schema, or kept as a research document?
14. Is the therapist dashboard a LifeOS feature or a Wellness Studio feature?
15. Should any of this be promoted into `docs/constitution/LUMIN_COMMUNICATION_DNA.md` or remain in product-level spec?
16. Which of the §21 future signals should be promoted to a real product home or mission pack first?
