<!-- SYNOPSIS: Canonical product home — Capability Map -->

# Capability Map Product Home

**Formerly called:** Amendment 20 — CAPABILITY MAP

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `capability-map` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/capability-map/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-06-29 |

---
| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `stable` |
| **Last Updated** | 2026-06-30 — capability grounding switched from amendment-index scanning to canonical product registry + product homes |

---

## Mission
Prevent ad-hoc feature absorption. Every inbound capability idea (from competitors, Codex, users, or scanning) is analyzed against the full architecture and mapped to: (a) an existing module, (b) an extension point, or (c) a new project_segment spec — before any code is written.

## North Star Anchor
Truth over convenience. The architecture shouldn't drift because someone dumped a good idea in the wrong place. Every new capability gets a governed entry point.

---

## Scope / Non-Scope

**In scope:**
- Capability analysis endpoint + service
- Canonical product-registry and product-home analysis using Gemini 2.5 Pro
- capability_map DB table (pending/accepted/rejected/inserted)
- Auto-insert of approved capabilities into project_segments

**Out of scope:**
- Capability execution (that's the builder's job)
- Trend scanning (that's Trend Scout in builder-council-review)
- General idea backlog / brainstorming

---

## Owned Files
```
services/capability-map.js
routes/capability-map-routes.js
db/migrations/20260327_capability_map.sql
docs/products/capability-map/PRODUCT_HOME.md
```

---

## Design Spec

### Analysis flow
1. Caller submits idea + source via `POST /api/v1/capability-map/analyze`
2. Service reads `docs/products/PRODUCT_REGISTRY.json` plus canonical `docs/products/*/PRODUCT_HOME.md` entries
3. Returns `mapping_type` + `target` + `rationale` + `suggested_segment` (if new)
4. Result persisted to `capability_map` table with status=pending

### mapping_type decisions
| Type | Meaning |
|---|---|
| `existing_module` | Already handled — describes where |
| `extension_point` | Partially handled — specific hook to extend |
| `new_segment` | Genuinely new — generates full segment spec |

### Act on a capability
- `accept` — marks accepted, returns suggested_segment for review
- `reject` — marks rejected
- `insert` — inserts suggested_segment into project_segments for a given project

### DB Table
| Column | Purpose |
|---|---|
| `idea` | Free-text description |
| `source` | Origin: 'codex', 'user', 'competitor_scan', etc. |
| `mapping_type` | existing_module / extension_point / new_segment |
| `target` | Product-home path, file path, or segment name |
| `rationale` | 2-3 sentence explanation |
| `suggested_segment` | JSONB segment spec if mapping_type=new_segment |
| `status` | pending / accepted / rejected / inserted |
| `segment_id` | FK to project_segments when inserted |

---

## Endpoints
- `POST /api/v1/capability-map/analyze` — analyze an idea
- `GET  /api/v1/capability-map` — list (filter by status)
- `GET  /api/v1/capability-map/:id` — single analysis
- `POST /api/v1/capability-map/:id/act` — accept | reject | insert

---

## CURRENT STATE
- **KNOW:** Service reads the canonical product registry and product homes via Gemini 2.5 Pro
- **KNOW:** `buildProductContext()` reads `docs/products/PRODUCT_REGISTRY.json` plus `docs/products/*/PRODUCT_HOME.md` entries up to 600k chars
- **KNOW:** Returns structured JSON: `mapping_type`, `target`, `rationale`, `confidence`, `overlap_warning`, `suggested_segment`
- **KNOW:** `actOnCapability` with `insert` action auto-inserts into `project_segments` with full spec fields
- **KNOW:** Routes mounted at `/api/v1/capability-map` with requireKey auth
- **KNOW:** `capability_map` DB table created in `20260327_capability_map.sql`

---

## Build Plan
- [x] **DB migration** *(est: 0.5h | actual: 0.5h)* `[safe]`
- [x] **Capability analysis service** *(est: 2h | actual: 2h)* `[safe]`
- [x] **API routes** *(est: 1h | actual: 1h)* `[safe]`
- [x] **Mount in runtime** *(est: 0.5h | actual: 0.5h)* `[safe]`
- [ ] **Command Center panel** *(est: 2h)* `[needs-review]` — surface pending capabilities alongside builder queue

**Progress:** 4/5 steps complete | Est. remaining: ~2h

---

## Pre-Build Readiness

**Status:** BUILD_READY
**Adaptability Score:** 85/100
**Council Persona:** jobs (simplicity — does the intake flow disappear, or does it get in the way?)

### Gate 5 — How We Beat Them
Competitors absorb ideas ad-hoc. We map every idea to a specific amendment + file scope + success criterion before a line is written. The intake form IS the architecture review.

---

## Change Receipts

| Date | What Changed | Why | Amendment | Verified |
|---|---|---|---|---|
| 2026-03-27 | Created Capability Map service, routes, DB migration, mounted in runtime | Govern inbound capability absorption against architecture | ✅ | pending |
| 2026-07-16 | BuilderOS shipped `public/overlay/capabilityPanel.html`; conductor added `@ssot docs/products/capability-map/PRODUCT_HOME.md` and a receipt row. | Autonomous factory output must carry SSOT tags so the pre-commit coupling check stays green. | ✅ | `node --check` |
| 2026-06-30 | Grounding source updated from amendment-era files to canonical product registry + product homes | Capability mapping must follow the active authority surface, not legacy amendment-first docs | ✅ | pending |
