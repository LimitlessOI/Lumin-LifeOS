<!-- SYNOPSIS: Canonical product home — Creative Engine -->

# Creative Engine Product Home

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `creative-engine` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/creative-engine/FILE_MANIFEST.json` |
| **Primary runtime surface** | `/api/v1/creative/*` + `/creative` studio UI |
| **Last Updated** | 2026-07-10 — v1 ship: footage_edit, photo_polish, script_compose (gated), generative_broll scaffold |

---

> **Y-STATEMENT:** In the context of MarketingOS, SocialMediaOS, Site Builder, and LifeRE needing shared media rendering without each product owning FFmpeg/Replicate, facing duplicated video stacks and silent AI spend, we decided to build Creative Engine as shared infrastructure (estimate → consent → render → receipt) to achieve one adapter surface for footage edit, photo polish, script compose, and generative b-roll, accepting that generative modes stay gated until FFmpeg and tip proofs pass.

| Field | Value |
|---|---|
| **Lifecycle** | `building` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Owner** | adam |
| **Parent System** | LimitlessOS (shared infra) |
| **Verification** | `node --test tests/creative-engine.test.js` + tip `GET /api/v1/creative/health` |

---

## What this is

**Infrastructure, not a LifeOS nav product.** Consumers call it. Users open Studio at `/creative/studio` or SMOS links into it.

### Modes (v1)

| Mode | Status | Needs |
|------|--------|-------|
| `footage_edit` | **LIVE** | FFmpeg — trim, captions, 9:16/1:1/16:9 crop, brand overlay |
| `photo_polish` | **LIVE** | FFmpeg — scale + caption overlay |
| `script_compose` | **GATED** | `REPLICATE_API_TOKEN` — wraps `services/video-pipeline.js` Path B |
| `generative_broll` | **SCAFFOLD** | Returns gated until footage_edit tip-proven |

### Owns
- `services/creative-engine/**`
- `routes/creative-engine-routes.js`
- `routes/creative-engine-ui-routes.js`
- `db/migrations/20260710_creative_engine_v1.sql`

### Does NOT own
- MarketingOS coaching / consent UX (calls engine)
- Creator Media OS likeness
- Model weights (adapters only)

### API
| Method | Path |
|--------|------|
| GET | `/api/v1/creative/health` |
| POST | `/api/v1/creative/estimate` |
| POST | `/api/v1/creative/assets` |
| POST | `/api/v1/creative/render` |
| GET | `/api/v1/creative/jobs/:id` |
| GET | `/api/v1/creative/jobs/:id/outputs` |

Studio: `/creative`, `/creative/studio`

---

## Change Receipts

| Date | What | Why | State |
|------|------|-----|-------|
| 2026-07-10 | **v1 Creative Engine shipped** — schema, FFmpeg in Docker, media-storage, footage_edit + photo_polish + script_compose gate + generative_broll scaffold, routes/UI auto-registered, studio SSR. | Adam: build Creative Engine; video editing in v1; do all modes; decide for him. | ✅ local; tip-sync pending |
