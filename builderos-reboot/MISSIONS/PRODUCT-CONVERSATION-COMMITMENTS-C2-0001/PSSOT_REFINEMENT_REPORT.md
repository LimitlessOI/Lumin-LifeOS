<!-- SYNOPSIS: PSSOT Refinement Report (Phase 0) -->

# PSSOT Refinement Report (Phase 0)

**Mission:** PRODUCT-CONVERSATION-COMMITMENTS-C2-0001  
**Project:** LifeOS  
**Agent role:** AIC Product Development  
**Date:** 2026-06-09  
**Inputs reviewed:** `PSSOT.md`, `FOUNDER_PACKET.md`, `FOUNDER_PACKET.json`, `PRODUCT_DEVELOPMENT_RESULT.json`, `SALVAGE_REVIEW_CHECKLIST.md`

---

## Executive summary

The Founder Packet is **strong on mission intent and v1 boundaries** (what not to build, proof question, fail-closed). It is **weaker on operational specifics** needed for BPB: intake UX, evidence schema, Sherry consent mechanics, duplicate data-model strategy, and C2 bucket definitions tied to existing routes.

**Recommendation:** **PASS_WITH_REFINEMENTS** — packet is sufficient to guide salvage; founder must approve 6 items before blueprint steps.

---

## Domain evaluation (Founder Packet adequacy)

| Domain | Adequate? | Notes |
|--------|-----------|-------|
| Conversation intake | **Partial** | Lists modes (paste, transcript, capture) but no default v1 path or approval workflow |
| Commitment extraction | **Yes** | Confidence, owner, ≥3 proof — good |
| Task generation | **Partial** | "Stage for approval" — no MIT vs `daily_mits` vs `commitments` table choice |
| Calendar integration | **Partial** | Suggestion-only stated; no Google vs native calendar decision |
| Evidence linking | **Gap** | Required in success criteria; **no schema** (span id, hash, message id) in packet |
| Household / Sherry | **Partial** | Boundary requirement stated; **no consent/linking workflow** |
| Private vs shared | **Gap** | No field-level rules; `shared_commitments` exists in DB but not referenced |
| C2 surfacing | **Partial** | Bucket names listed; **not mapped** to existing C2/CC routes |
| Communication density | **Gap** | Not mentioned; C2 charter includes density — needs v1 default |
| Future coaching | **Yes (deferred)** | Correctly out of v1 |
| Programs Map compatibility | **Gap** | Not referenced; `LIFEOS_PROGRAM_MAP_SSOT.md` exists — needs pointer + non-conflict rule |
| Therapist integration | **Yes (deferred)** | Correctly out of v1 |
| Sales coaching | **Yes (deferred)** | Correctly out of v1 |
| Relationship coaching | **Yes (deferred)** | Correctly out of v1; conflict/mediation code exists separately |

---

## Identified gaps (detail)

### G1 — Evidence schema undefined

| Field | Value |
|-------|-------|
| **Description** | Success criterion #9 requires source evidence; packet does not define `evidence_json` shape or storage column |
| **Why it matters** | BPB cannot wire extraction → DB without schema; risk of non-auditable AI claims |
| **Severity** | **P0** |
| **Recommendation** | Add appendix: `{ source_type, conversation_id, message_ids[], text_span, sha256, extractor_model, extracted_at }` |
| **Founder approval** | **No** — product dev can propose; founder approves if privacy fields included |

### G2 — Three commitment data models in repo

| Field | Value |
|-------|-------|
| **Description** | `commitments` (core/mirror), `lifeos_commitments` (tracker API), mission `commitments` — packet hints one path |
| **Why it matters** | Blueprint could wire wrong table; duplicate UX |
| **Severity** | **P0** |
| **Recommendation** | Salvage must pick **one canonical v1 table**; others REFERENCE or ADAPT merge |
| **Founder approval** | **Yes** — which surface Adam uses daily (Mirror vs Today vs C2) |

### G3 — Sherry / household consent workflow missing

| Field | Value |
|-------|-------|
| **Description** | `household_links`, `shared_commitments`, `lifeos-conflict-routes` consent exist; packet says "respect boundaries" only |
| **Why it matters** | Privacy failure is trust-killing for household product |
| **Severity** | **P0** |
| **Recommendation** | v1: explicit opt-in share per commitment; default private; link Sherry only after `household_links` active |
| **Founder approval** | **Yes** — default private vs default shared for spouse |

### G4 — C2 bucket UI not specified

| Field | Value |
|-------|-------|
| **Description** | Packet lists today/overdue/waiting-on/unconfirmed/important; `lifeos-command-center.html` is builder/repair focused (grep: no commitment buckets) |
| **Why it matters** | BPB may build new panel vs extend Mirror/Today |
| **Severity** | **P1** |
| **Recommendation** | v1 C2 panel **or** extend `lifeos-today.html` / `lifeos-mirror.html` with C2 deep-link; document choice |
| **Founder approval** | **Yes** — where Adam opens each morning |

### G5 — Intake approval gate vague

| Field | Value |
|-------|-------|
| **Description** | "Approved conversation" undefined — who approves, when, retroactive import |
| **Why it matters** | Consent + surveillance boundary |
| **Severity** | **P1** |
| **Recommendation** | v1: user clicks "Process this conversation" on paste/upload; no background ingest |
| **Founder approval** | **No** |

### G6 — `waiting-on` vs `unconfirmed` semantics

| Field | Value |
|-------|-------|
| **Description** | Buckets named but not defined (waiting on other person vs unconfirmed extraction?) |
| **Why it matters** | UI and queries need definitions |
| **Severity** | **P1** |
| **Recommendation** | Define: unconfirmed = AI extract not approved; waiting-on = owner≠Adam and status=open |
| **Founder approval** | **No** |

### G7 — Calendar write scope

| Field | Value |
|-------|-------|
| **Description** | Staging only — but `lifeos-event-stream.js` can `calendar.createEvent` on apply |
| **Why it matters** | Accidental calendar writes violate v1 |
| **Severity** | **P1** |
| **Recommendation** | v1: new status `staged_calendar` only; disable auto-apply path for this mission |
| **Founder approval** | **No** |

### G8 — Word Keeper / Amendment 16 overlap

| Field | Value |
|-------|-------|
| **Description** | `commitment-detector.js` is Word Keeper (audio chunks, Claude+Grok); separate from LifeOS event stream |
| **Why it matters** | Two detectors unless unified |
| **Severity** | **P1** |
| **Recommendation** | ADAPT detector logic; single extraction service for v1 text path |
| **Founder approval** | **No** |

### G9 — Programs Map / dashboard IA

| Field | Value |
|-------|-------|
| **Description** | `LIFEOS_PROGRAM_MAP_SSOT.md` governs nav; packet silent |
| **Why it matters** | New UI could drift from program map |
| **Severity** | **P2** |
| **Recommendation** | Add reference: commitment feature registers in program map when shipped |
| **Founder approval** | **No** |

### G10 — Failure criteria incomplete

| Field | Value |
|-------|-------|
| **Description** | Packet lists failure_modes (4 items); missing: wrong-owner rate, evidence missing rate, Sherry leak |
| **Why it matters** | SENTRY acceptance needs measurable fails |
| **Severity** | **P2** |
| **Recommendation** | Add: v1 fails if any commitment lacks evidence link; if shared without explicit share flag |
| **Founder approval** | **No** |

### G11 — Coaching requirements (future roadmap)

| Field | Value |
|-------|-------|
| **Description** | Packet mentions foundation for coaching; no compatibility hooks |
| **Why it matters** | Low for v1 |
| **Severity** | **P3** |
| **Recommendation** | Add "Future hooks" bullet: debrief table, conflict routes — REFERENCE only |
| **Founder approval** | **No** |

---

## Missing assumptions (explicit)

1. Adam has `lifeos_users` row and can authenticate to overlay/API  
2. Neon migrations for `commitments` / event stream tables applied on production  
3. Council keys exist on Railway production (not sandbox)  
4. Sherry has or will have a `lifeos_users` account for shared features  
5. v1 does not require Word Keeper audio pipeline  

---

## Recommended Founder Packet edits (next revision)

1. Add **Evidence schema** appendix (G1)  
2. Add **Canonical data model** decision placeholder pending salvage (G2)  
3. Add **Sherry privacy defaults** — founder choice (G3)  
4. Add **Primary daily surface** — Mirror vs Today vs C2 (G4)  
5. Add **Bucket definitions** (G6)  
6. Add **Programs Map** pointer (G9)  

---

## Founder approval required (summary)

| # | Topic |
|---|--------|
| 1 | Which commitment table + daily UI is canonical for Adam |
| 2 | Sherry default: private until explicit share? |
| 3 | Morning surface: Mirror, Today, or Command Center panel |
