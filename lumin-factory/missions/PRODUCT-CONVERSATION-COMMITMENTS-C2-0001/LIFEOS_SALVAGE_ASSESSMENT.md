# LifeOS Salvage Assessment

**Mission:** PRODUCT-CONVERSATION-COMMITMENTS-C2-0001  
**Agent role:** AIC/BPB Product Development  
**Date:** 2026-06-09  
**Method:** Repository inspection — routes, services, migrations, overlay, SSOT. No runtime verification on Railway in this pass.

**Classification key:** `IMPORT_AS_IS` | `ADAPT_AND_IMPORT` | `REFERENCE_ONLY` | `ARCHIVE_ONLY` | `REJECT`

---

## Executive summary

LifeOS already contains **substantial salvageable infrastructure** for conversation → commitment → calendar staging, but it is **fragmented across three commitment schemas**, **two extraction paths** (Word Keeper vs event stream), and **UI surfaces that do not match Founder Packet C2 buckets**.

**Highest-value salvage:** `lifeos-event-stream.js` + `lifeos-core-routes.js` ingest path, `lifeos-commitment-tracker.js` API, `lifeos-mirror.html` / `lifeos-today.html`, household tables, calendar staging service.

**Highest-risk debt:** duplicate tables, C2 command center not commitment-focused, auto-apply calendar in event stream, factory vs production spine confusion.

---

## Commitment & extraction layer

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `services/lifeos-event-stream.js` | Paste/capture → AI extract → stage commitment + calendar | Live code | **B** | **C+** | Medium | **ADAPT_AND_IMPORT** | Primary v1 ingest | Add evidence schema; disable auto calendar apply for v1 | AI cost; wrong table target | **High** | Medium | **High** |
| `routes/lifeos-core-routes.js` | `/event-stream/*` API | Mounted | **B** | **B-** | Low | **ADAPT_AND_IMPORT** | Wire to canonical table | Align with chosen schema | Route drift | High | Medium | High |
| `services/lifeos-commitment-tracker.js` | CRUD on `lifeos_commitments` | Live | **B+** | **B** | Low | **ADAPT_AND_IMPORT** | Simple API layer | Merge or bridge to `commitments` | Second schema | High | Medium | High |
| `routes/lifeos-commitment-routes.js` | REST for tracker | Mounted | **B** | **B** | Low | **ADAPT_AND_IMPORT** | Keep if table chosen | Same | Duplicate of core routes | High | Medium | High |
| `services/commitment-detector.js` | Word Keeper regex + Claude/Grok on audio chunks | Live | **C+** | **C** | High | **REFERENCE_ONLY** | Borrow extraction prompts | Do not wire audio v1 | WK coupling | Medium | Low | Medium |
| `db/migrations/20260328_lifeos_core.sql` (`commitments`, rich) | Mirror-integrated commitments | Applied (assumed) | **B-** | **B** | Medium | **ADAPT_AND_IMPORT** | Candidate canonical if Mirror is daily surface | Unify with tracker | Unused columns | High | Medium | High |
| `db/migrations/*lifeos_commitments*` | Simpler commitment table | Applied (assumed) | **B** | **B** | Medium | **ADAPT_AND_IMPORT** | Alternative canonical | Pick one | Split brain | High | Medium | High |
| `db/migrations/*mission*commitments*` | Mission runtime commitments | Applied | **C** | **C** | Medium | **REFERENCE_ONLY** | Pattern only | Do not merge v1 | Mission scope creep | Low | Low | Medium |
| `services/lifeos-mirror.js` | Mirror sync for commitments | Live | **C+** | **C** | Medium | **REFERENCE_ONLY** | If Mirror canonical | Heavy coupling | Complexity | Medium | Low | Medium |

---

## C2 & command surfaces

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `docs/C2_CANONICAL_DEFINITION.md` | C2 = bridge/cockpit not brain | SSOT | **A** | **A** | Low | **IMPORT_AS_IS** | Authority for v1 | None | Misread as "build brain in C2" | High | Medium | High |
| `services/command-center-communication-service.js` | C2 comms density / routing | Live | **B-** | **C+** | Medium | **REFERENCE_ONLY** | Density policy later | v1 buckets elsewhere | Over-scope | Medium | Medium | High |
| `public/overlay/lifeos-command-center.html` | Builder/repair cockpit | Live UI | **B** | **D** for this mission | Medium | **REFERENCE_ONLY** | Not v1 commitment home | Add panel later | Wrong UX focus | Low for commitments | Low | Medium |
| `public/overlay/lifeos-mirror.html` | Commitments UI | Live UI | **B** | **B-** | Medium | **ADAPT_AND_IMPORT** | Strong candidate daily surface | Add buckets + evidence | Stale vs tracker API | **High** | Low | High |
| `public/overlay/lifeos-today.html` | Today / MIT view | Live UI | **B-** | **B-** | Medium | **ADAPT_AND_IMPORT** | Today bucket home | Wire commitments | MIT vs commitment confusion | **High** | Low | High |
| `routes/command-center*.js` | CC APIs | Mounted | **B** | **C** for commitments | Medium | **REFERENCE_ONLY** | Later C2 panel | Phase 2 | Scope | Medium | Low | High |

---

## Household / multi-user

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `db/migrations/20260331_lifeos_family.sql` | `household_links`, `shared_commitments`, checkins | Applied (assumed) | **B** | **C+** | Medium | **ADAPT_AND_IMPORT** | Sherry v1 share path | Consent UI missing | Privacy leak | Medium | **High** | **High** |
| `public/overlay/lifeos-household.html` | Household UI | Live UI | **C+** | **C** | Medium | **REFERENCE_ONLY** | Phase 2 | Needs consent flows | Unwired | Low | High | High |
| `routes/mission-routes.js` (household board) | Shared board | Mounted | **C** | **C** | High | **REFERENCE_ONLY** | Not v1 | Different product lane | Confusion | Low | Medium | Medium |
| `routes/lifeos-conflict-routes.js` | Mediation / consent | Mounted | **C+** | **C** | Medium | **REFERENCE_ONLY** | Future coaching | Out of v1 | Overlap with share | Low | Medium | Medium |

---

## Calendar

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `services/lifeos-calendar.js` | Native calendar + suggestions | Live | **B** | **B-** | Medium | **ADAPT_AND_IMPORT** | Stage-only v1 | No auto-write | Double-book | **High** | Medium | High |
| `db/migrations/20260417_lifeos_calendar.sql` | Calendar tables | Applied (assumed) | **B** | **B** | Low | **ADAPT_AND_IMPORT** | Staging store | Link to commitments | — | High | Medium | High |
| `services/google-calendar-service.js` | Google sync | Live | **B-** | **C+** | Medium | **REFERENCE_ONLY** | Phase 2 | OAuth complexity | Token rot | Medium | Medium | High |

---

## Memory, council, task systems

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `services/memory*.js` | Persistent memory | Live | **B** | **B** | Medium | **REFERENCE_ONLY** | Context for extract | Not v1 blocker | Token cost | Medium | Low | High |
| `services/council-*.js` (production) | Multi-model AI | Live | **B-** | **B-** | High | **ADAPT_AND_IMPORT** | Extraction calls | Routing mission 0031 | Flash-only collapse | High | Low | High |
| `config/task-model-routing.js` | Model routing | Live | **C+** | **C** | High | **REFERENCE_ONLY** | Until 0031 | — | Wrong model for extract | Medium | Low | High |
| `services/daily-mit*.js` / MIT tables | Task management | Live | **B-** | **B-** | Medium | **REFERENCE_ONLY** | Separate from commitments v1 | Link later | MIT≠commitment | Medium | Low | Medium |
| `factory-staging/factory-core/canon/services/council-adapter.js` | Factory council | Quarantined | **C** | **D** | Low | **ARCHIVE_ONLY** | Do not use for product v1 | — | Wrong runtime | None | None | Factory only |

---

## Programs map & coaching (future)

| Path | Purpose | Status | Quality | Complete | Debt | Classification | Reuse | Migration | Risks | Adam value | Sherry value | Roadmap |
|------|---------|--------|---------|----------|------|----------------|-------|-----------|-------|------------|--------------|---------|
| `docs/LIFEOS_PROGRAM_MAP_SSOT.md` | Nav / program IA | SSOT | **A-** | **B+** | Low | **IMPORT_AS_IS** | Register feature when shipped | — | Nav drift | Medium | Medium | **High** |
| Coaching routes/services (scattered) | Sales/relationship/therapist | Partial | **D+** | **D** | High | **REJECT** for v1 | Do not salvage into v1 | Archive lane | Scope explosion | Low | Low | Future |

---

## Factory vs production spine

| Path | Purpose | Classification | Notes |
|------|---------|----------------|-------|
| `factory-staging/`, `builderos-reboot/` | Factory missions, BPB | **REFERENCE_ONLY** for product runtime | Product v1 runs on production spine |
| `routes/`, `services/` (root) | Live Railway spine | **ADAPT_AND_IMPORT** | Where salvage lands |
| `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | Authority layers | **IMPORT_AS_IS** | Prevents wrong-path builds |

---

## Consolidation recommendation (salvage authority)

**Founder intent lock (2026-06-09):** Canonical v1 store is **`commitments`** via **`services/commitment-tracker.js`**. Selection is **evidence-based**, not manual founder architecture pick.

### Route split-brain (must fix in 7-day blueprint)

| Path | Behavior today |
|------|----------------|
| `GET /api/v1/lifeos/commitments` | `lifeos-commitment-routes.js` → **`lifeos_commitments`** table |
| `POST /api/v1/lifeos/commitments/:id/keep` | `lifeos-core-routes.js` → **`commitments`** table |
| Event stream apply | `commitment-tracker.js` → **`commitments`** table |

**Risk:** Today overlay list and Mirror keep operate on **different tables**. Blueprint must consolidate reads/writes on core tracker.

**Do not silently merge mission-runtime `commitments` rows** (with `mission_id`) into product v1 — separate lane.

---

## Assets explicitly rejected for v1

| Asset | Reason |
|-------|--------|
| Word Keeper audio pipeline | Out of founder v1 scope |
| Mission-runtime commitment table | Wrong domain |
| Coaching / therapist integrations | Deferred by founder packet |
| Factory council adapter for extraction | Wrong runtime; no live LLM on factory execute |
| Auto calendar apply from event stream | Violates stage-only v1 |

---

## Evidence gaps (this assessment)

| Claim | Evidence level |
|-------|----------------|
| Routes mounted on production | **THINK** — standard `registerRoutes`; not curl-verified this session |
| Migrations applied on Neon | **THINK** — migration files exist; no DB query |
| Overlay reachable on Railway | **DON'T KNOW** — not browser-tested this session |

Next agent should run: production health + one `POST /event-stream/capture` smoke (with key) before blueprint.
