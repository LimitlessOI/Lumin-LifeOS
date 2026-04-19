# AMENDMENT 24 — Faith Studio

> **Y-STATEMENT:** In the context of families, churches, faith educators, and creators wanting sacred scenes rendered respectfully across different traditions, facing doctrinal differences and the risk of irreverent or misleading outputs, we decided to define Faith Studio as a dedicated sacred-content product with tradition-aware interpretation layers to achieve devotional, educational, and private witness experiences, accepting that sacred-mode guardrails must be stricter than general story creation.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `high-risk` |
| **Last Updated** | 2026-03-29 |
| **Verification Command** | `node scripts/verify-project.mjs --project faith_studio` |
| **Manifest** | `docs/projects/AMENDMENT_24_FAITH_STUDIO.manifest.json` |

---

## Mission
Provide a reverent, tradition-aware studio for scripture scenes, devotional content, teaching visuals, and private witness experiences without collapsing doctrinal distinctions or treating sacred material like ordinary entertainment content.

## North Star Anchor
Serve declared values faithfully. This product must preserve sovereignty, honesty, and reverence: source text, tradition lens, and interpretation must always be distinguishable.

---

## Scope / Non-Scope

**In scope — this project owns:**
- Sacred/religious content mode and guardrails
- Tradition lenses (for example Protestant, Catholic, Orthodox, Latter-day Saint)
- Scripture scene builder and witness mode
- Family-safe, church-safe, classroom-safe devotional outputs
- Private personal customization with stricter public-publishing controls
- Source / tradition / interpretation labeling

**Out of scope — explicitly NOT this project's job:**
- Generic secular story creation (belongs to Story Studio)
- Business/YouTube content production (belongs to Creator Media OS)
- Unlabeled doctrinal blending
- Public sacred-content remix chaos without stronger moderation

---

## Owned Files
```
docs/projects/AMENDMENT_24_FAITH_STUDIO.md
docs/projects/AMENDMENT_24_FAITH_STUDIO.manifest.json
routes/faith-studio-routes.js
services/faith-studio-service.js
services/scripture-scene-engine.js
services/tradition-lens-service.js
services/reverence-guard.js
public/overlay/faith-studio/
```

## Protected Files (read-only for this project)
```
server.js                          — composition root only
services/council-service.js        — shared model routing
services/video-pipeline.js         — shared generation infrastructure
services/sovereignty-check.js      — shared ethical boundary
```

---

## Design Spec

### Product Thesis
Faith Studio is not a generic story mode with Bible prompts. It is a dedicated sacred-content product where source scripture, tradition lens, and interpretive adaptation are separate, visible layers.

### Data Model
```sql
-- faith_projects
-- id, owner_id, title, source_mode, tradition_profile, privacy_mode, reverence_mode, created_at

-- faith_sources
-- id, project_id, source_ref, source_text, canon_type

-- faith_tradition_lenses
-- id, project_id, tradition_name, interpretation_notes_json, visual_rules_json

-- faith_scenes
-- id, project_id, sequence_no, scene_summary, witness_mode_enabled, explanation_level

-- faith_outputs
-- id, project_id, output_type, storage_url, metadata_json
```

### API Surface
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/faith-studio/projects` | requireKey | Create faith project |
| POST | `/api/v1/faith-studio/projects/:id/source` | requireKey | Set scripture/source passage |
| POST | `/api/v1/faith-studio/projects/:id/tradition` | requireKey | Choose tradition lens |
| POST | `/api/v1/faith-studio/projects/:id/scene` | requireKey | Generate sacred scene |
| POST | `/api/v1/faith-studio/projects/:id/witness-mode` | requireKey | Add user as witness for private/devotional viewing |
| POST | `/api/v1/faith-studio/projects/:id/export` | requireKey | Export devotional/story/teaching output |

### UI Surface
- Tradition selector
- Scripture/source picker
- Scene builder
- Private/public controls
- Witness mode toggle
- Teaching/devotional export options

### External Dependencies
| Dependency | Env Var | Required? | Fallback |
|---|---|---|---|
| Shared AI council | existing council vars | Yes | None |
| Shared media generation stack | multiple | Later | Static/storybook outputs first |
| Moderation / policy engine | TBD | Yes | Manual review for public publishing |

---

## Build Plan
- [ ] **Step 1** — Tradition/profile model + source labeling engine *(est: 8h)* `[high-risk]`
- [ ] **→ NEXT: Step 2** — Reverence guard + source/tradition/interpretation labels *(est: 10h)* `[high-risk]`
- [ ] **Step 3** — Scripture scene builder + private witness mode *(est: 12h)* `[high-risk]`
- [ ] **Step 4** — Family/church/classroom-safe outputs *(est: 10h)* `[needs-review]`
- [ ] **Step 5** — Public publishing review workflow *(est: 12h)* `[high-risk]`

**Progress:** 0/5 steps complete | Est. remaining: ~52h

---

## Anti-Drift Assertions
```bash
 test -f docs/projects/AMENDMENT_24_FAITH_STUDIO.md
 test -f docs/projects/AMENDMENT_24_FAITH_STUDIO.manifest.json
 test -f docs/ENV_REGISTRY.md
```

---

## Decision Log

### Decision: Faith Studio is its own product — 2026-03-29
> **Y-Statement:** In the context of sacred-content creation, facing doctrinal differences and reverence requirements, we decided to split Faith Studio into its own product to achieve appropriate guardrails and audience trust, accepting extra product surface area.

**Alternatives rejected:**
- *Keep this inside Story Studio* — rejected because sacred content needs stricter guardrails and clearer labeling
- *Single "Christian mode" only* — rejected because tradition-specific interpretation matters materially

**Reversibility:** `two-way-door`

---

## Why Not Other Approaches

| Approach | Why We Didn't Use It |
|---|---|
| Generic prompt-based Bible scene mode | Too easy to produce irreverent or unlabeled interpretive content |
| One-size-fits-all Christian rendering | Ignores real doctrinal/tradition differences |
| Fully open public remix | Too high-risk for sacred content without stronger controls |

---

## Test Criteria
- [ ] Every output clearly labels source, tradition lens, and interpretive adaptation
- [ ] Private witness mode is allowed but public publishing stays more controlled
- [ ] Tradition profiles materially change explanation/visual framing without hiding source text
- [ ] Family/church/classroom-safe modes enforce stricter defaults
- [ ] Reverence guard blocks obviously irreverent public outputs

---

## Handoff (Fresh AI Context)
**Current blocker:** Concept has just been promoted into SSOT; no implementation exists yet.

**Last decision made:** Faith Studio is a separate product from Story Studio and Creator Media OS.

**Do NOT change without explicit instruction:**
- Sacred-mode product separation
- Requirement to distinguish source, tradition lens, and interpretation
- Stronger controls for public sacred publishing than for private devotional viewing

**Read these files first:**
1. `docs/projects/AMENDMENT_24_FAITH_STUDIO.md`
2. `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
3. `docs/projects/AMENDMENT_20_CAPABILITY_MAP.md`

---

## Runbook (Operations)
No production runbook yet. This project is concept-stage only.

---

## Decision Debt
- [ ] **Tradition profiles are not yet detailed enough for implementation**
- [ ] **Public sacred-content review path is not yet specified deeply enough**
- [ ] **Theological/denominational advisory model is not yet designed**

---

## Change Receipts

| Date | What Changed | Why | Amendment Updated | Manifest Updated | Verified |
|---|---|---|---|---|---|
| 2026-03-29 | Created Faith Studio amendment and manifest from conversation history | Promote sacred-content/tradition-aware product into proper SSOT ownership | ✅ | ✅ | pending |

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 78/100
**Last Updated:** 2026-03-29

### Gate 1 — Implementation Detail
- [x] Product separation is clear
- [x] Tradition-lens concept is explicit
- [x] Source/tradition/interpretation labeling is identified as a requirement
- [ ] Doctrine-specific profiles are not yet implementation-ready
- [ ] Review/moderation flow is not yet detailed enough
- [ ] Advisory/council process for sacred accuracy is not yet defined

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Bible/faith content apps | Strong reading/listening and devotional engagement | Weak custom scene creation and private witness experiences | Tradition-aware sacred creation studio |
| General AI image/video tools | Strong raw generation | No reverence model, no doctrine labeling, no sacred-mode controls | Source + tradition + interpretation architecture |
| Church curriculum tools | Strong lesson packaging | Weak personalization and media generation | Teaching visuals plus personalized devotional outputs |
| Generic kids story tools | Strong simplicity | Not suitable for doctrinally sensitive content | Family-safe sacred content with tradition lenses |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Public backlash over irreverent sacred renderings | High | Critical | Public sacred publishing must be heavily guarded |
| Tradition profiles are seen as inaccurate or biased | High | High | Must label interpretation honestly and likely require advisory input |
| Private witness mode is misread as rewriting sacred history | Medium | High | Frame it as witnessing/devotional immersion, not canon revision |
| Expanding to multiple faiths too early creates policy chaos | Medium | High | Start with a narrower scope and explicit boundaries |

### Gate 4 — Adaptability Strategy
The core sacred-content engine should separate immutable source references from replaceable interpretation layers. New traditions should plug in as explicit profiles with their own explanation and visual rules, not as hidden prompt tweaks. Score: 78/100.

### Gate 5 — How We Beat Them
No generic AI tool can safely render sacred scenes at scale because they collapse source, doctrine, and interpretation into one opaque output; Faith Studio is built to keep those layers separate so devotional and teaching media can be personalized without pretending every tradition says the same thing.
