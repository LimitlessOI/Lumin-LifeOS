# AMENDMENT 23 — Creator Media OS

> **Y-STATEMENT:** In the context of creators, businesses, and personal brands needing steady video output without filming and editing every asset manually, facing fragmented tools for scripting, scene generation, editing, likeness, and SEO, we decided to define Creator Media OS as a record-once, generate-many content system to achieve channel-scale video production, accepting that consent, likeness rights, and publishing controls must be explicit from day one.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-29 |
| **Verification Command** | `node scripts/verify-project.mjs --project creator_media_os` |
| **Manifest** | `docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.manifest.json` |

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

**Out of scope — explicitly NOT this project's job:**
- General story/franchise publishing (belongs to Story Studio)
- Sacred/religious interpretation modes (belongs to Faith Studio)
- Undisclosed cloning or likeness usage without clear consent
- Ad-revenue payout engine before anti-fraud and rights logic exist

---

## Owned Files
```
docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.md
docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.manifest.json
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
| Storage/CDN | TBD | Yes | Local/dev storage during prototyping |

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

## Anti-Drift Assertions
```bash
 test -f docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.md
 test -f docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.manifest.json
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

---

## Handoff (Fresh AI Context)
**Current blocker:** Concept has just been promoted into SSOT; no implementation exists yet.

**Last decision made:** Creator Media OS is a separate product from Story Studio, even though both may share generation infrastructure.

**Do NOT change without explicit instruction:**
- Consent-first likeness policy
- Product separation from Story Studio and Faith Studio

**Read these files first:**
1. `docs/projects/AMENDMENT_23_CREATOR_MEDIA_OS.md`
2. `docs/projects/AMENDMENT_07_VIDEO_PIPELINE.md`
3. `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`

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
