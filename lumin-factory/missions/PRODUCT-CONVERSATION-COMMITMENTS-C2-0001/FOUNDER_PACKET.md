<!-- SYNOPSIS: PSSOT technical appendix — LifeOS Conversation Commitments + C2 -->

# PSSOT technical appendix — LifeOS Conversation Commitments + C2

> **Master:** read **`PSSOT.md`** first — brainstorm + dump + mission truth.  
> This file is **technical depth** (TSOS, providers, salvage checklists, governance paths).  
> **`FOUNDER_PACKET.json`** = legacy factory intake filename; sync from PSSOT.

**Mission ID:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**Project:** LifeOS  
**Status:** Pre-build — FPP complete, BPB next  

---

## One-sentence mission

**Can LifeOS reliably turn real conversations into useful action?**

Capture or receive approved conversations → extract commitments → assign owners → stage tasks and calendar suggestions → surface what matters in C2 → link every item to source evidence → Adam and Sherry control approve / edit / delete / private / share.

---

## What this mission is NOT

- Not “build all of LifeOS”
- Not full therapy, mediation, or relationship analysis (later layers)
- Not always-listening surveillance AI
- Not autonomous send without consent
- Not C2 as brain, blueprint authority, or strategy setter

---

## What v1 must prove

| # | Proof |
|---|--------|
| 1 | A real or sample conversation goes in |
| 2 | LifeOS extracts **≥ 3 commitments** |
| 3 | Each commitment has **owner**, **due date** (if available), **confidence**, **source evidence**, **status** |
| 4 | Tasks are **created or staged for approval** |
| 5 | Calendar suggestions are **created or staged for approval** |
| 6 | C2 shows **today**, **overdue**, **waiting-on**, **unconfirmed**, **important follow-ups** |
| 7 | Adam can **delete, edit, approve, mark private** |
| 8 | Sherry-related items respect **shared / private** boundaries |
| 9 | **No AI claim without source evidence** |
| 10 | **No coaching or relationship interpretation required for v1** |

---

## Users

| User | Role | Need |
|------|------|------|
| Adam | Founder / operator | Turn conversations into follow-through without busywork |
| Sherry | Household user | Shared accountability with privacy boundaries |
| Future customer | Paid LifeOS user | Consent-driven commitment system they trust |

---

## Core flow (v1)

```text
Conversation in (upload, paste, approved transcript, or linked capture)
  → Extract commitments (confidence-scored)
  → Assign owner (Adam / Sherry / other / unknown)
  → Stage task OR create MIT/commitment row (approval gate)
  → Stage calendar suggestion (approval gate)
  → C2 surfaces buckets: today | overdue | waiting-on | unconfirmed | important
  → Every row links to source evidence (transcript span, message id, hash)
  → User: approve | edit | delete | private | share (where allowed)
```

**Fail-closed:** No outbound action (email, calendar write, send) without explicit approval in v1.

---

## C2 role (anti-drift)

C2 = **bridge + cockpit** inside LifeOS — displays truthful state, intake, density control.  
C2 does **not** assign builder work, set product strategy, or declare green without receipts.

**Surface strategy (founder locked):** Commitments are a core LifeOS behavior. **C2 is the long-term destination surface.** Mirror and Today are feature UIs that may be **reused or embedded** in C2 — BPB must not create another standalone commitment dashboard. v1 may ship Today/Overdue inside existing overlays; architecture must point toward C2 integration.

**Read before implementation:** `docs/C2_CANONICAL_DEFINITION.md`

---

## Evidence First Law (founder locked — non-negotiable)

LifeOS may suggest. LifeOS may infer. LifeOS may recommend.  
**LifeOS may never rewrite history.**

Every extracted commitment must preserve:

| Field | Requirement |
|-------|-------------|
| Source conversation | ID or stable reference to the ingested conversation / event |
| Source quote | Verbatim span from the conversation that supports the extraction |
| Timestamp | When the source was captured or when the commitment was spoken |
| Confidence | Model or rule confidence score (0–1 or equivalent) |
| Extraction method | Model id, rule name, or `manual` |

The user must always be able to click **“Why does LifeOS think this commitment exists?”** and see the evidence.

**Storage (v1 minimum):** extend `commitments.source_ref` (TEXT/JSON) and/or `lifeos_event_actions.details` JSONB to hold the evidence bundle. No commitment row without evidence link in the 7-day MVP.

**Fail-closed:** If extraction cannot attach a source quote → stage as `unconfirmed` suggestion only; do not promote to active commitment without user approval.

---

## Privacy default (founder locked)

**Private unless intentionally shared** — for Sherry and for everyone.

- `is_public` / share flags default **false**
- Household share requires explicit per-commitment (or explicit batch) user action
- No background sharing of extracted items

---

## Canonical data model (evidence-based — not founder philosophy)

Salvage evidence selects **`commitments`** (core table via `services/commitment-tracker.js`) as the **7-day MVP canonical store**.

| Evidence | Finding |
|----------|---------|
| Event stream apply path | `lifeos-event-stream.js` → `commitments.logCommitment()` → `commitments` table |
| Extract API | `POST /api/v1/lifeos/commitments/extract` on core routes |
| Mirror UI | `keep` / `snooze` → core `commitments` routes |
| Schema | `source`, `source_ref`, `committed_to`, `is_public`, `due_at`, status machine |
| Ecosystem | integrity-score, daily-scorecard, weekly-review, lumin, reminder-cron |

**Do not use for v1 writes:** `lifeos_commitments` table / `lifeos-commitment-tracker.js` — simpler but **split-brain** with core routes (GET list hits `lifeos_commitments`; Mirror keep hits `commitments`). Blueprint must **consolidate reads** onto core tracker or retire duplicate mount.

**Mission-runtime `commitments` rows** (with `mission_id`) remain a separate lane — REFERENCE only for this product mission.

---

## 7-day MVP blueprint scope (founder locked — BPB must not expand)

BPB blueprints **only** this slice. Everything else is a **future PSSOT** (new mission), not this blueprint.

```text
Conversation (paste / approved capture)
  → Extract (confidence + Evidence First bundle)
  → User approval gate
  → Write to commitments table
  → Today + Overdue surface (Mirror / Today UI; C2 embed path documented)
```

**Explicitly out of 7-day blueprint:**

- Waiting-on bucket
- Unconfirmed bucket (beyond staging unapproved suggestions)
- Calendar staging
- Sherry / household sharing
- Coaching, Programs Map, therapist mode
- New standalone dashboard
- Full Command Center rebuild

**30-day and beyond:** next packet adds buckets, calendar staging, Sherry share, C2 panel wiring — **after** Adam uses the 7-day proof daily.

---

## Required salvage review (before BPB blueprints)

The old LifeOS repo is a **parts car**, not automatic authority.  
**BPB must not silently reuse old code.** Every carry-forward needs **reason + risk note**.

### Inspect and classify (KEEP / ADAPT / REFERENCE / ARCHIVE / REJECT)

| Area | Likely paths |
|------|----------------|
| C2 / Command Center | `routes/lifeos-command-center-routes.js`, `routes/command-center-routes.js`, `services/command-center-communication-service.js`, `public/overlay/lifeos-command-center.html` |
| Commitment detection | `services/commitment-detector.js`, `services/commitment-tracker.js`, `services/lifeos-commitment-tracker.js`, `routes/lifeos-commitment-routes.js` |
| Event ingest | `services/lifeos-event-stream.js` |
| Calendar | `services/lifeos-calendar.js`, `services/google-calendar-service.js`, `services/lifeos-calendar-events-resolver.js`, `db/migrations/20260417_lifeos_calendar.sql` |
| Tasks / MITs | `daily_mits`, scorecard/today surfaces, `AMENDMENT_21` commitment desk backlog |
| Memory / Historian | Memory capsules, `epistemic_facts` — **product memory ≠ BuilderOS proof memory** |
| Council / models | `services/council-service.js`, `config/task-model-routing.js` — department routing per `FACTORY-REBOOT-0031` when live |
| Overlay / dashboard | `public/overlay/*`, LifeOS today/lumin surfaces |
| Household / Sherry | `shared_commitments`, `services/data-sovereignty.js` tables, household consent patterns |

**Output artifact (required):** `SALVAGE_REVIEW.json` in this mission folder with one row per candidate file/module.

See: `SALVAGE_REVIEW_CHECKLIST.md`

---

## Model and TSOS policy

Higher-level APIs are **available**; **TSOS decides when they are worth using.**

| Department use | Model tier (intent) |
|----------------|---------------------|
| AIC, BPB hard decisions, SENTRY review | Stronger models (OpenAI, Anthropic) when income-linked |
| Extraction, classification, deterministic coding steps | Cheaper models (Gemini Flash, DeepSeek for Coder lane) |

**Rules:**

- Do **not** run a model because its API key exists
- Every call: **mission id**, **department**, **expected output**, **cost/usage receipt**
- TSOS records: model used, why, cost, whether output was worth it
- Strategy lock: `prompts/00-PROVIDER-STRATEGY-LOCK.md`
- Routing audit: `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`

Scheduled/background AI → `createUsefulWorkGuard()` only.

---

## Provider setup (env names — values in Railway only)

| Provider | Railway env | Key management (operator) |
|----------|-------------|---------------------------|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Gemini | `GEMINI_API_KEY` | Google AI Studio → API Keys |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek platform API keys page |
| Cerebras | `CEREBRAS_API_KEY` | Cerebras Cloud Console |
| xAI / Grok | `GROK_API_KEY` or `XAI_API_KEY` (match `ENV_REGISTRY`) | https://console.x.ai |
| Anthropic | `ANTHROPIC_API_KEY` | Claude Platform (add when billing ready) |
| OpenRouter | **Do not add** unless TSOS proves value > confusion | Not core provider now |

**Do not add `OPENROUTER_API_KEY` unless a future TSOS receipt justifies it.**

Production vault only (`ENV_REGISTRY` — Lumin sandbox abandoned for operator maintenance).

---

## Phase boundaries

### In scope v1

- Conversation intake (approved transcript / paste / linked capture)
- Commitment extraction with confidence + evidence links
- Owner assignment
- Task staging / MIT integration
- Calendar **suggestion** staging (not silent calendar writes)
- C2 status buckets and controls (approve, edit, delete, private)
- Salvage review artifact
- Sherry shared/private boundary hooks (minimum viable)

### Out of scope v1

- Full therapy / mediation / relationship analysis
- Always-on listening / passive surveillance
- Autonomous email send (phase 2+)
- Graduated autonomy / cancel-window send tiers (phase B per AMENDMENT_21)
- Mobile device runner / cross-device declutter

---

## Success = useful immediately, sellable later

This is the **first product proof mission**. It forces the factory to build something real and creates foundation for: coaching, Programs Map, therapist support, relationship reflection, sales coaching, household coordination, hard-truth mode.

---

## Governance and build path

1. Product Development PASS (`PRODUCT_DEVELOPMENT_RESULT.json`) — **COMPLETE**
2. Salvage review PASS (`SALVAGE_REVIEW.json`) — **COMPLETE**
3. Founder intent lock (`FOUNDER_INTENT_LOCK.md`) — **COMPLETE**
4. BPB → **`BLUEPRINT.json` for 7-day MVP slice only**
5. Production builder (`POST /api/v1/lifeos/builder/build`) — not IDE hand-authoring by default
6. SENTRY / acceptance against **7-day MVP** success table (below)

### 7-day MVP acceptance (blueprint target)

| # | Proof |
|---|--------|
| 1 | Adam pastes a real conversation |
| 2 | LifeOS extracts ≥ 3 commitments with Evidence First fields |
| 3 | Adam approves a subset |
| 4 | Approved rows appear in Today / Overdue (existing overlay or C2 embed) |
| 5 | Every approved row answers “Why does LifeOS think this exists?” |
| 6 | No calendar write, no Sherry share, no autonomous send |

Full v1 success table (§What v1 must prove) remains the **product mission north star**; blueprint executes the **7-day row** first.

**Separate from:** `FACTORY-REBOOT-0031` (role-based council routing). Product may consume 0031 when live; not blocked on it for salvage + BPB planning.

---

## References

- `docs/products/lifeos/PRODUCT_HOME.md` — Commitment → execution desk
- `docs/C2_CANONICAL_DEFINITION.md`
- `prompts/00-PROVIDER-STRATEGY-LOCK.md`
- `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`
- `docs/architecture/factory-v1-blueprint-pack/GOLDMINE_PASS_V2.md` (salvage mindset)
