# Personal Utility Analysis

**Mission:** PRODUCT-CONVERSATION-COMMITMENTS-C2-0001  
**Agent role:** AIC/BPB Product Development  
**Date:** 2026-06-09  
**Founder directive:** Adam utility first; product foundation second.

---

## Feature scoring matrix

Scale: **Personal usefulness** / **Revenue potential** / **Strategic importance** = Low | Medium | High  
**Effort** = person-days (rough) | **Maintenance** = Low | Medium | High

| Feature | Personal usefulness | Effort | Maintenance | Revenue | Strategic | Existing code enables |
|---------|---------------------|--------|-------------|---------|-----------|------------------------|
| Paste conversation → extract commitments | **High** | 3–5d (wire + evidence) | Medium | Medium | **High** | **Yes** — event stream + core routes |
| Approve/reject extracted items | **High** | 2–3d | Low | Medium | **High** | **Partial** — mirror UI; no full approve flow |
| Today / overdue buckets | **High** | 2–4d | Low | Medium | **High** | **Partial** — today.html; tracker statuses |
| Waiting-on / unconfirmed buckets | **High** | 2–3d | Low | Medium | High | **Partial** — schema fields exist; UI missing |
| Evidence link per commitment | **High** | 2–3d | Low | **High** (trust) | **High** | **No** — schema gap |
| Calendar staging (no write) | **High** | 1–2d | Low | Medium | High | **Yes** — calendar service + event stream |
| Sherry shared commitments | Medium | 5–8d | Medium | **High** | **High** | **Partial** — DB + household UI stub |
| C2 command center panel | Medium | 5–10d | Medium | Medium | High | **No** — CC is builder-focused |
| Audio / Word Keeper ingest | Medium | 10+d | High | Medium | Medium | **Yes** but out of v1 scope |
| Coaching debrief hooks | Low (v1) | 15+d | High | High | Medium | **Partial** — conflict routes |

---

## Smallest useful version — 7 days

**Definition:** Adam can paste a real conversation, see extracted commitments with source quotes, approve a subset, and view them on a single "today" surface with overdue highlighting. No Sherry share. No calendar write. No C2 rebuild.

### Scope (7-day)

1. **Intake:** Paste text → `lifeos-event-stream` capture endpoint (existing)  
2. **Extract:** Council call returns structured commitments + evidence spans (adapt prompt; add evidence JSON)  
3. **Review:** Minimal approve UI on Mirror or Today (extend existing overlay)  
4. **Store:** Write to **one** table (`lifeos_commitments` fastest path via existing tracker API)  
5. **View:** Today list + overdue filter from tracker  

### What already enables this (~60–70%)

| Component | Contribution |
|-----------|--------------|
| `services/lifeos-event-stream.js` | Ingest + AI staging |
| `routes/lifeos-core-routes.js` | HTTP entry |
| `services/lifeos-commitment-tracker.js` | Persistence + overdue |
| `routes/lifeos-commitment-routes.js` | CRUD API |
| `public/overlay/lifeos-mirror.html` or `lifeos-today.html` | UI shell |

### What must be built/adapted (~30–40%)

- Evidence schema + storage column  
- Approve/reject state machine (`unconfirmed` → `active`)  
- Disable or gate calendar auto-apply on this path  
- Single-table decision (avoid dual writes)  
- Production smoke test + one real conversation proof  

### 7-day effort estimate

**5–8 person-days** with focused wiring (not greenfield). Risk: table choice rework if wrong pick.

---

## Smallest useful version — 30 days

**Definition:** Everything in 7-day MVP, plus: C2-aligned buckets (today, overdue, waiting-on, unconfirmed, important), calendar **staging** with explicit apply button, Sherry opt-in share for selected commitments, and measurable proof (≥3 real conversations processed with evidence retained).

### Added scope (days 8–30)

| Addition | Effort | Enables |
|----------|--------|---------|
| Bucket queries + UI | 3–5d | Founder packet C2 semantics |
| Calendar stage + manual apply | 2–3d | Safe calendar integration |
| `shared_commitments` + consent UI | 5–7d | Sherry household value |
| Important flag + sort | 1–2d | Priority surfacing |
| C2 deep-link or lightweight panel | 3–5d | Morning cockpit entry (optional vs extend Today) |
| Proof harness / receipts | 2–3d | Fail-closed verification |

### 30-day effort estimate

**18–25 person-days** cumulative from cold start (includes 7-day MVP).

---

## Adam vs Sherry vs product

| Horizon | Adam | Sherry | Product roadmap |
|---------|------|--------|-----------------|
| 7-day | **Primary beneficiary** — daily commitment clarity | No change | Proof artifact for "conversation → action" |
| 30-day | Full bucket workflow + calendar staging | Opt-in shared commitments | Household + sellable privacy story |
| 90-day+ | C2 native panel, Google calendar | Shared today view | Coaching hooks, Programs Map slot |

---

## What NOT to build in 30 days

- New factory runtime for product features  
- Word Keeper audio pipeline merge  
- Therapist / sales / relationship coaching  
- Full Command Center rebuild  
- Table migration across all three commitment schemas (bridge only)  

---

## Recommended priority order (founder utility)

1. Paste → extract → approve → today/overdue (**proof loop**)  
2. Evidence on every row (**trust**)  
3. Unconfirmed + waiting-on buckets  
4. Calendar staging  
5. Sherry share with default-private  
6. C2 panel or deep-link (only after 1–3 proven)  
