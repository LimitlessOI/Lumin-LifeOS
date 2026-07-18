<!-- SYNOPSIS: Canonical product home — Creative Engine -->

# Creative Engine Product Home

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `creative-engine` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/creative-engine/FILE_MANIFEST.json` |
| **Primary runtime surface** | `/api/v1/creative/*` + `/creative` studio UI |
| **Last Updated** | 2026-07-15 — R2 upload on creative outputs + job download; SMOS money path wired. |

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
| `graphic_design` | **LIVE** | `REPLICATE_API` / `REPLICATE_API_TOKEN` — Ideogram / Recraft / Flux. Site Builder hero fallback + SMOS thumbs consume it. |

### Owns
- `services/creative-engine/**`
- `routes/creative-engine-routes.js`
- `routes/creative-engine-ui-routes.js`
- `routes/creative-engine-graphic-design-routes.js` — standalone route pair for `graphic_design` (see note below on why it's not in the shared dispatcher)
- `db/migrations/20260710_creative_engine_v1.sql`

### Known architectural gap — graphic_design is NOT in the shared dispatcher
`services/creative-engine/index.js` is 227 lines (Zone 3, >150-line governed-builder threshold). The platform's pre-commit governance (`services/builderos-build-pipeline.js:77`) hard-blocks Zone-3 targets unless `additivePatch === true` — it does **not** exempt `editPatch` even though edit-patch (`applyTargetedEdits`) already validates each `old_string` matches the live file exactly once before this gate runs, so it carries none of the "blind full-file rewrite stubs the file" risk the Zone-3 block exists to prevent. Net effect: `graphic_design` could not be safely wired into `index.js`'s `estimate()`/`processJob()` dispatch chain through the governed `/build` endpoint today. Worked around by shipping `routes/creative-engine-graphic-design-routes.js` as an independent, stateless route pair (no `creative_jobs` DB persistence, no `/api/v1/creative/jobs/:id` history) instead. **Proposed platform fix** (not yet applied — changes builder safety-gate logic, wants a deliberate look rather than a same-session patch): pass `editPatch: editPatchActive` alongside `additivePatch: additivePatchActive` into `runPrecommitGovernance` at `routes/lifeos-council-builder-routes.js:3139`, and widen the guard at `services/builderos-build-pipeline.js:77` to `zoneResult.zone === 3 && !intakeRewrite && opts.additivePatch !== true && opts.editPatch !== true`. Once fixed, `graphic_design` can be folded into the shared dispatcher for job history/consistency with the other 4 modes.

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
| POST | `/api/v1/creative/graphic-design/estimate` — `{assetType: 'thumbnail'\|'vector'\|'photo', count?}` → `{cents, model, gated}` |
| POST | `/api/v1/creative/graphic-design/render` — `{prompt, assetType?, brandColors?, aspectRatio?}` → `{ok, publicUrl, model, assetType}` or 503 `REPLICATE_API_TOKEN_REQUIRED` |

Studio: `/creative`, `/creative/studio`

---

## Change Receipts

| Date | What | Why | State |
|------|------|-----|-------|
| 2026-07-15 | **R2-durable creative outputs + download route** — `media-storage.saveUpload` uploads outputs via `uploadBufferToR2` when `R2_*` present; health reports `r2Configured`; `GET /api/v1/creative/jobs/:id/download` streams local or redirects to durable URL. | Tip multi-instance 404 on `/previews/creative/...mp4` after promo generate. | ✅ code; tip prove health + download |
| 2026-07-15 | **script_compose videoPath mapping** — Path B returns `{success, videoPath}` but mode only read `url`/`outputPath`, so tip jobs failed `script_compose_no_output` with a bare `vid_*` id. Now maps `videoPath`, fails loud on `success:false`, accepts `REPLICATE_API` alias, normalizes style keys. | Adam: finish SMOS end-to-end including promo video. Tip job `9feacb9b` failed in ~9s with no file. | ✅ code; tip re-prove after redeploy |
| 2026-07-14 | **Studio UI ↔ graphic_design** — `/creative/studio` default mode generates via Ideogram/Flux/Recraft; calm 2026 UI (no purple). Tip: token configured but **402 Insufficient credit** — live image polish blocked until Replicate billing. | Adam: polish products through Studio only if image gen connected. | ✅ UI wired; ⛔ tip 402 |
| 2026-07-14 | **script_compose honesty** — return `ok:false` / `script_compose_no_output` when pipeline has no file URL (was marking completed with empty outputs). | Founder walk: job completed in ~400ms with `vid_*` id and zero outputs. | ✅ code |
| 2026-07-14 | **Wire consumers** — Site Builder `maybeFillGeneratedHero` (Flux when no scraped hero); SMOS `tryIdeogramThumbnail` prefers Ideogram over Sharp compose; `getReplicateApiToken()` accepts `REPLICATE_API`. Tip proved `replicateConfigured:true` + real render. | Adam: token is in as `REPLICATE_API` — finish it. | ✅ tip health + render; wire push pending |
| 2026-07-14 | **Env alias** — accept Railway `REPLICATE_API` as `REPLICATE_API_TOKEN` via boot alias + registry/provider health. | Founder deployed as `REPLICATE_API`; tip still `replicateConfigured:false`. | ✅ code; tip verify post-redeploy |
| 2026-07-14 | **graphic_design mode shipped** — `services/creative-engine/modes/graphic-design.js` (Ideogram v3-turbo / Recraft v3-svg / Flux 1.1-pro via Replicate, gated on `REPLICATE_API_TOKEN`) + `routes/creative-engine-graphic-design-routes.js` (standalone, see architectural-gap note above) + auto-register entry in `config/auto-registered-product-modules.json`. Verified live in production: `POST /api/v1/creative/graphic-design/estimate` returns real per-asset-type pricing; `POST .../render` correctly returns 503 `REPLICATE_API_TOKEN_REQUIRED` (token not yet set on Railway). Both governed builds (`22da9c4870`, `94d55baaf7`) committed via `POST /api/v1/lifeos/builder/build` with `platform_gap_fill:true` per SO-001; a third governed build (edit `index.js` dispatcher) was correctly rejected by Zone-3 governance — see architectural-gap note. Site Builder / SocialMediaOS consumption not yet wired (SocialMediaOS actively being iterated by a concurrent agent same day — see `docs/CONTINUITY_LOG.md`; Site Builder wiring needs the same Zone-3 edit-patch platform fix). | Adam: "we don't have [good graphics] and I don't have the time or patience... if it's affordable... let's incorporate it into our system." Researched market (Ideogram/Recraft/Flux all $0.03-0.08/image, already reachable through the existing Replicate account used for Kling/Wan video). | ✅ routes live + verified; ⛔ render blocked on `REPLICATE_API_TOKEN` |
| 2026-07-10 | **Tip footage_edit PASS** — health `ffmpeg:true`; upload sample MP4; async render completed; output 1.3MB 9:16 at `/previews/creative/outputs/...`. Receipt `products/receipts/CREATIVE_ENGINE_V1_FOOTAGE_EDIT.json`. Default render for footage_edit is async (sync was Railway 502). | Plan proof criteria. | ✅ tip `069f8a4d25` |
| 2026-07-10 | **v1 Creative Engine shipped** — schema, FFmpeg in Docker, media-storage, footage_edit + photo_polish + script_compose gate + generative_broll scaffold, routes/UI auto-registered, studio SSR. | Adam: build Creative Engine; video editing in v1; do all modes; decide for him. | ✅ tip `069f8a4d25` + async fix on `main` |
