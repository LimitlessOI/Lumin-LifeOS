# AMENDMENT 22 — Story Studio

> **Y-STATEMENT:** In the context of families, creators, and future licensed-IP partners wanting to turn one story into many media formats, facing fragmented tools that handle storybooks, comics, animation, and rights separately, we decided to define Story Studio as a unified story-to-franchise product to achieve reusable story universes and multi-format publishing, accepting that full cinematic output must come after cheaper format layers prove demand and consistency.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-29 |
| **Verification Command** | `node scripts/verify-project.mjs --project story_studio` |
| **Manifest** | `docs/projects/AMENDMENT_22_STORY_STUDIO.manifest.json` |

---

## Mission
Let a person create one story universe, place themselves in it if desired, and publish it as a storybook, comic, motion comic, cartoon, anime-style short, musical, or future cinematic project from a shared canon.

## North Star Anchor
Create meaning, not just output. This project serves human creativity and purpose without trapping people in complex production workflows they should not have to master alone.

---

## Scope / Non-Scope

**In scope — this project owns:**
- Story creation and world-building
- Self-insertion / avatar-in-story tools
- Multi-format adaptation ladder (storybook -> comic -> motion comic -> cartoon -> cinematic)
- Canon engine / story bible / character consistency
- Private, shared, public, and remix permissions
- Creator-owned vs studio-development rights modes for original story projects
- Rights-approved licensed adaptation lanes for third-party books/IP once contracts exist
- Community scoring, collaboration, and franchise signal detection
- Asset vault for scenes, songs, scripts, voices, and exports

**Out of scope — explicitly NOT this project's job:**
- Business/YouTube marketing video generation (belongs to Creator Media OS)
- Sacred/religious interpretation modes (belongs to Faith Studio)
- Blank platform-wide creator payout logic without rights ledger governance
- Full film studio production agreements before the rights engine exists

---

## Owned Files
```
docs/projects/AMENDMENT_22_STORY_STUDIO.md
docs/projects/AMENDMENT_22_STORY_STUDIO.manifest.json
routes/story-studio-routes.js
services/story-studio-service.js
services/story-canon-engine.js
services/story-format-engine.js
services/story-rights-ledger.js
public/overlay/story-studio/
```

## Protected Files (read-only for this project)
```
server.js                          — composition root only
config/council-members.js          — shared AI config
services/video-pipeline.js         — shared rendering infrastructure
services/capability-map.js         — idea-to-segment governance layer
```

---

## Design Spec

### Product Thesis
The core asset is not the exported video or comic. The core asset is the structured story universe: characters, rules, arcs, scenes, style, soundtrack motifs, and rights state. Every output format derives from that asset.

### Rights Modes
- `creator_owned_private` — creator owns the IP; platform only gets service/hosting rights
- `platform_published` — creator owns the IP; platform gets on-platform distribution rights and revenue participation
- `studio_consideration` — creator owns the IP; platform gets a first-look / exclusive packaging window
- `studio_development` — creator and platform enter a stronger adaptation/production agreement with explicit revenue splits
- `platform_original` — platform-owned original created under platform-controlled terms
- `licensed_adaptation` — third-party IP with explicit adaptation/broadcast/commercial rights before any public build lane

Raw views or ratings do not directly trigger creator payouts. Any royalty or creator-economy logic depends on explicit rights, contributor splits, and anti-fraud controls first.

### Data Model
```sql
-- story_projects
-- id, owner_id, title, logline, rights_mode, privacy_mode, canon_mode, status, created_at

-- story_characters
-- id, project_id, name, role, appearance_profile, voice_profile, personality_profile

-- story_worlds
-- id, project_id, lore_json, rules_json, style_bible_json

-- story_scenes
-- id, project_id, sequence_no, beat_type, summary, dialogue_json, soundtrack_notes

-- story_assets
-- id, project_id, asset_type, format, storage_url, metadata_json, version_no

-- story_scores
-- id, project_id, scoring_mode, score_type, score_value, source

-- story_rights
-- id, project_id, underlying_owner, derivative_rights_json, royalty_split_json
```

### API Surface
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/story-studio/projects` | requireKey | Create project |
| POST | `/api/v1/story-studio/projects/:id/characters` | requireKey | Add/update characters |
| POST | `/api/v1/story-studio/projects/:id/scenes` | requireKey | Generate scene breakdown |
| POST | `/api/v1/story-studio/projects/:id/format` | requireKey | Generate storybook/comic/cartoon variant |
| POST | `/api/v1/story-studio/projects/:id/self-insert` | requireKey | Add the user as a story character |
| POST | `/api/v1/story-studio/projects/:id/score` | requireKey | Submit/private/community scoring |
| GET | `/api/v1/story-studio/projects/:id/export` | requireKey | Export current format |

### UI Surface
- Story project workspace
- Character/world/story bible editor
- Format ladder selector
- Private/public/remix controls
- Franchise score dashboard
- Asset vault

### External Dependencies
| Dependency | Env Var | Required? | Fallback |
|---|---|---|---|
| Shared AI council | `ANTHROPIC_API_KEY` + council vars | Yes | None |
| Shared video/image/audio generation stack | multiple | Later | Lower formats only |
| Object storage | TBD | Yes | Local/dev storage during prototyping |

---

## Build Plan
- [ ] **Step 1** — Story project + canon data model *(est: 6h)* `[needs-review]`
- [ ] **→ NEXT: Step 2** — Character/world/story bible editor + self-insert profile *(est: 10h)* `[needs-review]`
- [ ] **Step 3** — Multi-format ladder: storybook, comic, motion comic *(est: 16h)* `[needs-review]`
- [ ] **Step 4** — Rights/privacy/collaboration controls *(est: 12h)* `[high-risk]`
- [ ] **Step 5** — Franchise scoring + community feedback loop *(est: 10h)* `[needs-review]`
- [ ] **Step 6** — Cartoon/anime-style short generation *(est: 18h)* `[high-risk]`
- [ ] **Step 7** — Cinematic upgrade path and studio-development pipeline *(est: 24h)* `[high-risk]`

**Progress:** 0/7 steps complete | Est. remaining: ~96h

---

## Anti-Drift Assertions
```bash
# Amendment exists
 test -f docs/projects/AMENDMENT_22_STORY_STUDIO.md

# Manifest exists
 test -f docs/projects/AMENDMENT_22_STORY_STUDIO.manifest.json

# Shared env-awareness source remains canonical
 test -f docs/ENV_REGISTRY.md
```

---

## Decision Log

### Decision: Cinematic is not the starting format — 2026-03-29
> **Y-Statement:** In the context of story adaptation, facing the temptation to start with full cinematic generation, we decided to build a format ladder first to achieve lower-cost validation and reusable assets, accepting that cinematic output arrives later.

**Alternatives rejected:**
- *Cinematic-first* — rejected because cost, inconsistency, and revision loops are too high for v1
- *Single-format storybook only* — rejected because the strategic edge is multi-format reuse

**Reversibility:** `two-way-door`

---

## Why Not Other Approaches

| Approach | Why We Didn't Use It |
|---|---|
| One-off storybook generator only | Too shallow; weak franchise value and weak asset reuse |
| Pure AI video app | Misses the story bible/canon/rights system that makes the IP durable |
| YouTube-style content engine only | Different buyer, different workflow, different moderation and rights model |

---

## Test Criteria
- [ ] A story project can be created and re-opened with persistent canon data
- [ ] A user can add themselves as a character with opt-in likeness controls
- [ ] One project can export at least storybook + comic from the same story bible
- [ ] Privacy modes (private/shared/public/remix) are enforced
- [ ] Rights mode is visible and explicit per project
- [ ] Licensed adaptation projects cannot move forward without an explicit rights record

---

## Handoff (Fresh AI Context)
**Current blocker:** No implementation yet — concept has now been promoted from chat to SSOT.

**Last decision made:** Story Studio is its own product and should not be merged into Creator Media OS or Faith Studio.

**Do NOT change without explicit instruction:**
- Creator-owned-by-default thesis — it is load-bearing for trust and adoption
- Cinematic-later build order — this is the cost-control strategy
- No blanket platform ownership of user IP by default

**Read these files first:**
1. `docs/projects/AMENDMENT_22_STORY_STUDIO.md`
2. `docs/projects/AMENDMENT_07_VIDEO_PIPELINE.md`
3. `docs/projects/AMENDMENT_20_CAPABILITY_MAP.md`

---

## Runbook (Operations)
No production runbook yet. This project is concept-stage only.

---

## Decision Debt
- [ ] **Rights model not yet formalized** — creator-owned vs studio-development vs platform-original needs legal-grade definition before build
- [ ] **Community scoring abuse model not yet designed** — views/ratings cannot directly drive payouts without anti-fraud logic
- [ ] **Format-specific writing engine not yet specified** — comic, musical, anime, and cinematic need different narrative transforms

---

## Change Receipts

| Date | What Changed | Why | Amendment Updated | Manifest Updated | Verified |
|---|---|---|---|---|---|
| 2026-03-29 | Created Story Studio amendment and manifest from conversation history | Promote the story/comic/cartoon/musical/cinematic/IP-franchise concept into proper SSOT ownership | ✅ | ✅ | pending |

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 86/100
**Last Updated:** 2026-03-29

### Gate 1 — Implementation Detail
- [x] Core product split is clear: Story Studio vs Creator Media OS vs Faith Studio
- [x] Multi-format ladder is defined conceptually
- [x] Rights/privacy/collaboration needs are identified
- [ ] DB schema not yet finalized to implementation level
- [ ] API surface not yet detailed enough for headless build
- [ ] Asset-generation vendor stack not yet chosen per format

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Authoria / Youstory / TinyHero Books | Fast personalized storybook creation | Shallow world-building and weak franchise continuity | One story universe becomes many formats with canon memory |
| Book Creator / Canva | Strong layout and publishing polish | Manual-first, weak AI canon engine | Structured story bible drives publishing instead of manual assembly |
| LTX Studio / Runway / Hedra | Strong motion/video generation | Weak family story memory, rights layer, and creator-universe management | Story-to-franchise system with collaboration, privacy, and rights modes |
| Inworld | Strong character memory/personality | Not a full publishing and adaptation engine | Persistent characters plus actual publishable outputs |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Character/style consistency is expensive across long projects | High | High | Asset reuse and canon engine must be core, not optional |
| Rights disputes emerge once projects become commercially valuable | High | High | Rights ledger must exist before any studio-development lane |
| Cinematic generation costs stay too high for mass-market creation | High | Medium | Build the lower-cost ladder first |
| Community remix/payout model attracts spam or theft | High | High | Private/public/remix and scoring governance must precede payouts |

### Gate 4 — Adaptability Strategy
The product is format-agnostic at the story bible layer. New outputs plug into the same project model rather than forcing a rewrite. A future style, render engine, or commercial pathway should attach as a new format or rights mode, not a new product core. Score: 86/100.

### Gate 5 — How We Beat Them
Every competitor makes one artifact at a time; Story Studio turns one persistent story universe into a reusable franchise engine that can publish the same project as a storybook, comic, motion comic, cartoon, musical, and later cinematic property from one canon source.
