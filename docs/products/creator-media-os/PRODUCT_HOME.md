<!-- SYNOPSIS: Canonical product home — Creator Media OS -->

# Creator Media OS Product Home

**Formerly called:** Amendment 23 — CREATOR MEDIA OS

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `creator-media-os` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/creator-media-os/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-18 |

---
> **Y-STATEMENT:** In the context of creators, businesses, and personal brands needing steady video output without filming and editing every asset manually, facing fragmented tools for scripting, scene generation, editing, likeness, and SEO, we decided to define Creator Media OS as a record-once, generate-many content system to achieve channel-scale video production, accepting that consent, likeness rights, and publishing controls must be explicit from day one.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-07-18 |
| **Verification Command** | `node scripts/verify-project.mjs --project creator_media_os` |
| **Manifest** | `docs/products/creator-media-os/FILE_MANIFEST.json` |

---

## Mission
Let a creator or business record once, then generate channel-ready videos, shorts, scenes, thumbnails, bumpers, captions, and SEO packages with consistent likeness, brand, and publishing workflow.

## North Star Anchor
Automate the work people should not have to do by hand, while preserving their consent, identity, and economic ownership.

---

## Scope / Non-Scope

**In scope — this project owns:**
- Script/title/hook generation
- Performance capture and likeness-consent workflow
- Scene placement and background generation
- Mistake cleanup and missing-line patching
- Long-form + short-form repackaging
- Thumbnail, bumper, captions, metadata, and SEO outputs
- Channel memory / brand memory / performance memory
- **Creator Digital Twin** — consented voice clone + avatar/likeness clone + persona (writes/talks like the creator)
- **Smart jump-cuts** — silence/filler/false-start/retake removal ("make it look like the mess-up never happened")
- **Text-based / overdub editor** — edit the transcript to delete or replace words; replaced spans regenerated in the creator's cloned voice (on-camera via lip-sync)
- **True text-to-video** — real motion b-roll from a prompt (Wan/Kling via Replicate)
- **Multi-language dubbing + lip-sync**
- **Media vault** — searchable, tagged, versioned durable asset store
- **Reusable video templates + catalog remix** — template once and swap only the detail segment per render (e.g. realtor new-listing videos); search the indexed back-catalog to remix old clips into new videos/shorts
- **Creator Partner Program** — eXp-style multi-level creator revenue-share (paid from margin, consent + FTC compliant)

**Out of scope — explicitly NOT this project's job:**
- General story/franchise publishing (belongs to Story Studio)
- Sacred/religious interpretation modes (belongs to Faith Studio)
- Undisclosed cloning or likeness usage without clear consent
- Ad-revenue payout engine before anti-fraud and rights logic exist

---

## Owned Files
```
docs/products/creator-media-os/PRODUCT_HOME.md
docs/products/creator-media-os/FILE_MANIFEST.json
routes/creator-media-routes.js
services/creator-media-service.js
services/channel-memory.js
services/likeness-consent-service.js
services/seo-package-service.js
public/overlay/creator-media/
```

## Protected Files (read-only for this project)
```
server.js                          — composition root only
services/video-pipeline.js         — shared render stack
services/council-service.js        — shared model routing
config/council-members.js          — shared config
```

---

## Design Spec

### Product Thesis
This is not "AI video." It is a content operating system: script, scene, edit, repurpose, publish, and optimize from a persistent channel memory.

### Data Model
```sql
-- creator_channels
-- id, owner_id, name, niche, brand_profile_json, seo_profile_json

-- creator_likeness_profiles
-- id, channel_id, face_profile_json, voice_profile_json, consent_mode, revocable_at

-- creator_scripts
-- id, channel_id, content_goal, format, script_text, hook_variants_json, cta_json

-- creator_videos
-- id, channel_id, script_id, format, edit_status, publish_status, storage_url

-- creator_assets
-- id, channel_id, asset_type, storage_url, metadata_json

-- creator_performance_memory
-- id, channel_id, metric_type, metric_value, source, observed_at
```

### API Surface
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/creator-media/channels` | requireKey | Create channel |
| POST | `/api/v1/creator-media/channels/:id/likeness` | requireKey | Capture/update likeness consent profile |
| POST | `/api/v1/creator-media/scripts` | requireKey | Generate script pack |
| POST | `/api/v1/creator-media/videos` | requireKey | Generate/edit video |
| POST | `/api/v1/creator-media/videos/:id/repurpose` | requireKey | Produce shorts/variants |
| POST | `/api/v1/creator-media/videos/:id/seo` | requireKey | Generate SEO package |
| GET | `/api/v1/creator-media/channels/:id/memory` | requireKey | Channel performance/brand memory |

### UI Surface
- Creator workspace
- Script pack builder
- Likeness/consent panel
- Scene selector
- Video assembly queue
- SEO package panel
- Channel memory dashboard

### External Dependencies
| Dependency | Env Var | Required? | Fallback |
|---|---|---|---|
| Shared video pipeline | multiple | Yes | Lower-format export only |
| Shared SEO/web intelligence | existing stack | Later | Manual metadata entry |
| Storage/CDN | `STORAGE_R2_*` / `R2_*` | Yes | Local/dev storage during prototyping (outputs ephemeral) |
| Text-to-video + stills | `REPLICATE_API_TOKEN` | For generative modes | Footage-edit + image-slideshow only |
| Voice clone / TTS | `ELEVENLABS_API_KEY` | For voice clone + overdub + dubbing | Scripts/captions only (no synthetic voice) |
| Avatar / talking-head + lip-sync | `HEYGEN_API_KEY` (or `DID_API_KEY`) | For avatar clone + on-camera overdub | Footage-edit of supplied on-camera video only |
| Self-serve billing | `STRIPE_SECRET_KEY` | For subscriptions + partner payouts | Managed/manual invoicing |

> **Consent + rights gate (foundational):** No voice clone, avatar clone, overdub, or lip-sync output may be produced without an explicit, revocable likeness/voice consent record (`routes/likenessConsent.js` + `services/consentContract.js`). Synthetic outputs must be labeled. This is non-negotiable per the North Star Anchor.

---

## Build Plan
- [ ] **Step 1** — Channel memory + brand profile model *(est: 6h)* `[needs-review]`
- [ ] **→ NEXT: Step 2** — Likeness consent capture + revocation controls *(est: 8h)* `[high-risk]`
- [ ] **Step 3** — Script/title/hook engine *(est: 8h)* `[needs-review]`
- [ ] **Step 4** — Scene engine + edit assembly workflow *(est: 16h)* `[high-risk]`
- [ ] **Step 5** — Thumbnail/SEO/repurposing pipeline *(est: 10h)* `[needs-review]`
- [ ] **Step 6** — Publish + analytics memory loop *(est: 12h)* `[needs-review]`

**Progress:** 0/6 steps complete | Est. remaining: ~60h

---

## Roadmap — Prime-Time Creator Platform (Wave 2)

> Founder directive (2026-07-18): "add every one of those features … ready for prime time." Each bullet below carries a concrete `target_file` so the governed factory (`build-queue:from-home` → never-stop factory) authors it under SO-001 — the conductor specs, the factory builds, SENTRY proves. Credential-gated modules fail-closed (gated) at runtime until the founder provisions the key. **Nothing here is "done" until SO-002 SENTRY Layer A + Layer B both pass with receipts.**

### Digital Twin + video generation
- [ ] Back-catalog ingestion — ingest a creator's existing videos to auto-extract a clean voice sample, build the persona-twin training corpus (transcripts of their whole library), and index assets into the media vault. Target `services/creatorBackCatalogIngest.js` (export `ingestBackCatalog`). Requires likeness/voice consent + rights + storage.
- [ ] Persona twin — train a style/voice-of-writing model on the ingested back-catalog so drafts match the creator's phrasing, hooks, and opinions. Target `services/creatorPersonaTwin.js` (export `trainPersonaTwin`). Requires ingested corpus + consent.
- [ ] Smart jump-cut / mistake-removal engine — detect silences, filler words, false starts and retakes, then stitch clean jump-cuts (optional punch-in) via local FFmpeg. Target `services/creatorJumpCut.js` (export `buildJumpCutPlan`).
- [ ] Text-based / overdub editor — edit the transcript to delete or replace words; delete = cut, replace = regenerate the span in the creator's cloned voice. Target `services/creatorOverdubEditor.js` (export `applyTranscriptEdits`). Requires `ELEVENLABS_API_KEY` + consent for replacement.
- [ ] Voice clone service — train a revocable voice profile from consented samples and synthesize narration in the creator's voice. Target `services/creatorVoiceClone.js` (export `trainVoiceProfile`). Requires `ELEVENLABS_API_KEY` + likeness consent.
- [ ] Avatar / talking-head clone — generate on-camera video of the creator from a typed script. Target `services/creatorAvatarClone.js` (export `renderAvatarVideo`). Requires `HEYGEN_API_KEY` (or `DID_API_KEY`) + likeness consent.
- [ ] Lip-sync patcher — re-sync mouth to replaced words for on-camera overdub. Target `services/creatorLipSync.js` (export `resyncLips`). Requires lip-sync provider key + likeness consent.
- [ ] Text-to-video generation — enable real motion b-roll from a prompt (Wan/Kling via Replicate). Target `services/creatorTextToVideo.js` (export `generateMotionVideo`). Requires `REPLICATE_API_TOKEN`.
- [ ] Multi-language dubbing — translate and dub audio in the cloned voice with lip-sync. Target `services/creatorDubbing.js` (export `dubToLanguages`). Requires `ELEVENLABS_API_KEY`.
- [ ] Video templates with swappable segments — build a template once (intro/branding/outro/music/caption-style) and swap only the detail segment (e.g. a realtor's new listing/address/B-roll) per render; everything else stays fixed. Target `services/creatorVideoTemplates.js` (export `renderFromTemplate`).
- [ ] Catalog clip search + remix compiler — search the indexed back-catalog by topic/keyword/transcript, pull evergreen segments/clips from old videos, and recombine them with fresh footage into a new video or short. Target `services/creatorClipRemix.js` (export `remixFromCatalog`). Requires media vault index.
- [ ] Long-form to shorts auto-clipper — detect high-retention moments and cut vertical clips. Target `services/creatorShortsClipper.js` (export `extractShorts`).
- [ ] Keyword-matched b-roll inserter — insert b-roll matched to script keywords. Target `services/creatorBrollMatcher.js` (export `matchBroll`).
- [ ] Brand kit auto-apply — fonts, colors, logo, lower-thirds on every render. Target `services/creatorBrandKit.js` (export `applyBrandKit`).
- [ ] Media vault — searchable, tagged, versioned asset store on durable storage. Target `services/creatorMediaVault.js` (export `indexAsset`). Requires R2 (`STORAGE_R2_*`) config.
- [ ] Repurpose fan-out — turn one source video into N platform-native posts (fixes the single-yield defect F1). Target `services/creatorRepurposeFanout.js` (export `fanOutRepurpose`).

### Growth + monetization (Creator Partner Program)
- [ ] Creator Partner Program rev-share ledger — eXp-style 5-level, paid-from-margin, unlock-by-frontline, active-only, capped; percentages tunable via config. Target `services/creatorPartnerProgram.js` (export `computeRevShare`).
- [ ] Partner dashboard API — downline tree, active seats, earnings, payout status. Target `routes/creatorPartnerRoutes.js` (export `registerCreatorPartnerRoutes`, route `POST /api/v1/creator-partner/ledger`).
- [ ] Performance analytics + learning loop — ingest per-post metrics and surface winning hooks/CTAs by platform. Target `services/creatorAnalyticsDashboard.js` (export `ingestPerformance`).
- [ ] Team seats + roles — editor / manager / VA access on a channel. Target `services/creatorTeamSeats.js` (export `assignSeat`). Requires self-serve auth.

---

## Creator Partner Program (eXp-style rev-share)

**Model:** paid out of LimitlessOS subscription margin (never out of the downline creator's earnings), 5 levels deep, deeper levels unlocked by number of *directly sponsored active* creators (frontline). Percentages are **tunable config**, not hard-coded.

| Level | % of downline sub revenue | Unlock requirement |
|---|---|---|
| L1 (direct) | 20% | 1 active frontline |
| L2 | 7% | 5 active frontline |
| L3 | 5% | 10 active frontline |
| L4 | 4% | 15 active frontline |
| L5 | 4% | 20+ active frontline |

- "Active" = paying + used the product in the last 30 days.
- Annual cap per downline seat (tunable) protects unit economics.
- Pays monthly, only while both earner and downline stay subscribed.
- Stacks on top of the one-time 30–40% affiliate on first sale.

**⚠️ Compliance gate (KNOW — not legal advice; requires counsel review before launch):** compensation MUST be tied to real product subscriptions/usage, never to recruitment fees or a pay-to-join buy-in. Free to join the partner tree; earnings only on actual paid, active creators. This is the line between a lawful affiliate/rev-share program and an FTC pyramid scheme. Full GTM spec: `docs/products/productized-sprint/launch-kit/CREATOR_PARTNER_PROGRAM.md`.

---

## Anti-Drift Assertions
```bash
 test -f docs/products/creator-media-os/PRODUCT_HOME.md
 test -f docs/products/creator-media-os/FILE_MANIFEST.json
 test -f docs/ENV_REGISTRY.md
```

---

## Decision Log

### Decision: Separate creator-media from story/franchise workflows — 2026-03-29
> **Y-Statement:** In the context of AI-assisted media creation, facing the temptation to merge story adaptation and YouTube/business content into one product, we decided to separate Creator Media OS to achieve clearer buyer targeting, compliance, and workflow design, accepting some shared backend duplication.

**Alternatives rejected:**
- *Single all-purpose media app* — rejected because the buyer, workflow, and rights model are too different
- *Manual-editing-only tool* — rejected because the value is end-to-end channel output, not just editing assistance

**Reversibility:** `two-way-door`

---

## Why Not Other Approaches

| Approach | Why We Didn't Use It |
|---|---|
| Generic avatar SaaS only | Too shallow; misses channel memory, SEO, and content operating workflow |
| SEO-only YouTube tool | Doesn't solve production bottlenecks |
| Agency services without product memory | Hard to scale and not defensible enough |

---

## Test Criteria
- [ ] Channel profile persists brand, SEO, and performance memory
- [ ] Likeness consent is explicit and revocable
- [ ] One script can produce long-form plus short-form outputs
- [ ] SEO package is generated from the same source asset set
- [ ] No video can be produced from a likeness profile without consent state recorded
- [ ] No voice clone / avatar / overdub / lip-sync output is produced without a recorded, revocable consent state
- [ ] Smart jump-cut removes silences/filler and produces a seamless cut
- [ ] Overdub editor replaces a transcript word and re-renders the span in the cloned voice
- [ ] Rev-share ledger pays from margin, respects unlock-by-frontline + active-only + annual cap, and never reduces the downline's earnings

---

## Handoff (Fresh AI Context)
**Current blocker:** Wave 2 (prime-time) features are specced into the Build Plan roadmap and the governed BUILD_QUEUE; most are credential-gated (voice clone, avatar/lip-sync, R2, Stripe) and will build-then-gate until the founder provisions keys. Next: founder provisions API keys → never-stop factory authors each module → SENTRY Layer A/B proves each before "done."

**Last decision made:** Founder approved (2026-07-18) building the full creator feature set + eXp-style 5-level Creator Partner Program, ready for prime time. Digital-twin/clone features are consent-gated and synthetic outputs must be labeled.

**Do NOT change without explicit instruction:**
- Consent-first likeness policy
- Product separation from Story Studio and Faith Studio

**Read these files first:**
1. `docs/products/creator-media-os/PRODUCT_HOME.md`
2. `docs/products/video-pipeline/PRODUCT_HOME.md`
3. `docs/products/command-center/PRODUCT_HOME.md`

---

## Runbook (Operations)
No production runbook yet. This project is concept-stage only.

---

## Decision Debt
- [ ] **Consent and likeness contract model not yet formalized**
- [ ] **Channel analytics ingestion source not yet chosen**
- [ ] **Publishing/payout logic intentionally deferred until rights + fraud controls exist**

---

## Change Receipts

| Date | What Changed | Why | Amendment Updated | Manifest Updated | Verified |
|---|---|---|---|---|---|
| 2026-03-29 | Created Creator Media OS amendment and manifest from conversation history | Promote the AI YouTube/business video system concept into proper SSOT ownership | ✅ | ✅ | pending |
| 2026-07-18 | Added Wave 2 prime-time roadmap (digital twin, jump-cuts, overdub, text-to-video, dubbing, media vault, fan-out) + Creator Partner Program rev-share; specced each as governed factory step with concrete target_file + credential gates | Founder approved full creator feature set ready for prime time; specs drive the governed factory per SO-001 (no hand-authored modules) | ✅ | pending | specs-only (SENTRY gates pending per feature) |
| 2026-07-18 | Added reusable video templates with swappable segments + catalog clip-search/remix compiler (realtor "same 10 videos, new details" + remix old→new use case) | Founder ask: repeatable template videos, swap only the changing segment, remix indexed back-catalog clips into new videos/shorts | ✅ | pending | specs-only |

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 84/100
**Last Updated:** 2026-03-29

### Gate 1 — Implementation Detail
- [x] Core product split is clear
- [x] Major modules are defined conceptually
- [x] Consent-first likeness requirement is explicit
- [ ] DB schema not yet finalized to implementation level
- [ ] Publishing analytics and video vendor stack not yet chosen
- [ ] Revocation and legal workflow not yet specified deeply enough

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Descript / Riverside / editing tools | Strong cleanup and editing | Weak full channel operating memory and generated scene pipeline | Channel system, not just editing |
| Runway / Hedra / avatar-video tools | Strong video generation and talking-character output | Weak SEO/publishing/brand-memory workflow | Record once, generate many, then package and optimize |
| vidIQ / TubeBuddy | Strong YouTube optimization | No actual production stack | Video creation plus SEO in one pipeline |
| Generic agencies | Human quality and strategy | Expensive and hard to scale | Software + memory + reusable likeness/brand assets |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Likeness misuse creates trust or legal failure | High | Critical | Consent and revocation are foundational |
| Platform policy violations on generated likeness content | Medium | High | Must build platform-safe publishing rules and audit receipts |
| Cheap-looking outputs reduce trust | High | Medium | Prioritize editing quality and brand consistency before automation scale |
| Ad-revenue incentives attract spam/fraud | High | High | Delay creator payout logic until fraud model exists |

### Gate 4 — Adaptability Strategy
The channel memory and asset model should be platform-agnostic: one source can feed YouTube, Shorts, TikTok, reels, or internal landing pages. New distribution or render tools should slot into the same content graph rather than redefine the product. Score: 84/100.

### Gate 5 — How We Beat Them
Competitors either help you edit, generate, or optimize; Creator Media OS aims to remember your brand, likeness, and channel performance so one captured performance can become the full publishing package, not just another isolated asset.
