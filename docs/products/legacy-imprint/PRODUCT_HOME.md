<!-- SYNOPSIS: Canonical product home — Legacy Imprint (legacy-imprint) — formerly LegacyOS / MediaOS / Human Legacy Initiative -->

# Legacy Imprint Product Home

**Also known as:** LegacyOS (working folder alias), MediaOS, Human Legacy Initiative

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `legacy-imprint` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/legacy-imprint/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-08-06 — Renamed/clarified from LegacyOS to Legacy Imprint. The product is the post-death Digital Twin preservation system; `legacyos` remains a folder alias only. |

---

> **Y-STATEMENT:** In the context of people whose lives, relationships, and perspectives are mostly lost within a generation, and who want future family members and historians to understand—not merely know about—them, we decided to define **Legacy Imprint** as a human legacy preservation system that uses a consented Digital Imprint to preserve lived experience, perspective, and relationship context, accepting that the system must always distinguish evidence from inference, preserve multiple viewpoints, and keep the dignity of the living and the deceased intact.

| Field | Value |
|---|---|
| **Lifecycle** | `founder-vision` |
| **Status** | Future research — not queued, no runtime, no code |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Owner** | adam |
| **Parent System** | [LimitlessOS](../limitlessos/PRODUCT_HOME.md) · [LifeOS](../lifeos/PRODUCT_HOME.md) |
| **Verification Command** | `test -f docs/products/legacy-imprint/PRODUCT_HOME.md && test -f docs/products/legacy-imprint/FILE_MANIFEST.json` |
| **Manifest** | `docs/products/legacy-imprint/FILE_MANIFEST.json` |

---

## What Legacy Imprint is

Legacy Imprint preserves, organizes, and makes explorable the lived experience of a person, family, or community across time. It is a future product, not a near-term build. Its purpose is to ensure that ordinary lives—not only famous ones—can be understood by future generations with honesty, context, and dignity.

The system is organized around the **Imprint** model:

- **Digital Imprint** — the living, evolving record of a person's life (memories, conversations, preferences, values, decisions, relationships, growth). It is the accumulated knowledge.
- **Digital Twin** — the active reasoning model built from the imprint to help the living person decide, remember, learn, and create.
- **Legacy Imprint** — the preserved imprint after death. The active twin stops evolving; the imprint remains as the enduring artifact.
- **Historical Imprint** — an imprint voluntarily contributed to humanity's long-term historical record for research or public understanding.

The library is the imprint. The twin is the librarian while the person lives.

---

## What LegacyOS is not

- It is **not an immortality product**. The imprint is a reconstruction, not the person.
- It is **not a surveillance product**. Capture must be explicit, revocable, and bounded by domain.
- It is **not a medical or grief-treatment device**. Any therapeutic possibilities are future research areas requiring scientific validation.
- It is **not a near-term revenue project**. It should not distract from BuilderOS, SalesOS, the therapist platform, MarketingOS, or LifeOS runtime priorities.

---

## Core concepts

### 1. Memory reconstruction
Reconstruct important places, people, and moments using photographs, videos, audio, family stories, journals, public records, and historical context. The goal is preserving understanding, not perfect simulation.

### 2. Family collaboration
The imprint improves as families contribute: "I think Grandma's chair was here." "The wallpaper wasn't blue." "Remember the dog?" Multiple perspectives are preserved, not flattened into a single consensus.

### 3. Perspective preservation
Different family members may remember the same event differently. The system preserves multiple viewpoints so future generations can understand that multiple truths can coexist.

### 4. Ordinary life preservation
The greatest losses are not birthdays and weddings. They are ordinary Tuesdays: cooking dinner, driving kids to school, talking on the porch, doing laundry together.

### 5. Archival levels
- **Personal Archive** — only the individual and those they authorize.
- **Family Legacy** — passed through generations with family-level permissions.
- **Research Archive** — anonymized and opt-in.
- **Historical Archive** — explicitly donated to humanity's long-term historical record.

### 6. Historical Confidence Framework
Every reconstructed element discloses its source and confidence:
- **Verified Evidence** — video, audio, documents.
- **Corroborated** — multiple independent sources agree.
- **Inferred** — model prediction based on evidence.
- **Creative Reconstruction** — artistic or plausible interpretation, clearly labeled.

Truth must always be distinguishable from imagination.

### 7. Emergent-effects tracking
The system deliberately searches for unintended consequences:
- Positive emergent effects.
- Negative emergent effects.
- Neutral emergent effects requiring observation.

Reality determines classification.

### 8. Intergenerational understanding
The deepest mission is reducing distance between generations: helping children understand how parents thought, what shaped them, why they made decisions, and what life actually felt like.

---

## Relationship to other products

| Product | How LegacyOS uses it / depends on it |
|---|---|
| **LifeOS** | Living imprint capture, consent, user sovereignty, and the `lifeos-app.html` interface. |
| **Memory Intelligence / Memory System** | Evidence ladder, confidence calibration, source labeling, and retrieval infrastructure. |
| **Digital Twin / Imprint layer** | Cross-product concept: the Imprint is the record; the Twin is the active model. LegacyOS owns the long-term archival and intergenerational form. |
| **Creative Engine** | Media reconstruction, avatar/likeness workflows, and content generation when the user consents. |
| **BuilderOS** | Governed factory for building prototypes and experiments without manual bottlenecks. |
| **SalesOS / TherapyOS / MarketingOS** | Domain adapters that feed the same shared human model; they do not own LegacyOS data. |

---

## Non-negotiables

- **Consent and revocation by default.** No capture, retention, or archival level change without explicit, documented consent.
- **Domain boundaries are architecture.** A therapist's session notes, a sales call, and a family dinner conversation must not share a context window without explicit, scoped authorization.
- **Dignity over accuracy.** The system must not humiliate, expose, or misrepresent the living or the dead.
- **Truth labels.** Every reconstructed element must show its confidence level and source type.
- **Death changes purpose.** The active Digital Twin stops evolving. The Imprint becomes the Legacy Imprint.
- **No immortality claims.** The imprint is a rich historical reconstruction, not the person.

---

## Missing / open decisions

1. **Product identity.** Is this `LegacyOS`, `MediaOS`, or `Human Legacy Initiative`? One product or three?
2. **Relation to Digital Twin / Imprint architecture.** Does this concept live in a cross-product architecture doc, in LifeOS, or in LegacyOS?
3. **Data model.** What is the canonical schema for an Imprint, a Perspective, a Commitment, and an Archive level?
4. **Consent model.** How are multi-generational, post-death, and research-archive permissions managed and revoked?
5. **Technology assumptions.** What capture hardware, storage, encryption, and longevity guarantees are required?
6. **Scientific validation.** Which therapeutic, historical, and social-science claims require external validation before marketing?
7. **Priority and funding.** Is this a 10-year research bet, a product line, or a vision document to be revisited later?
8. **Competitive position.** Is the moat the ecosystem, the longevity trust, the consent architecture, or the AI reconstruction quality?

---

## Change Receipts

| 2026-07-23 | Initial product home, FILE_MANIFEST, and founder vision conversation captured from attachment `pasted-1785887606900.md`. Status set to `founder-vision` / future research. No runtime code. | Preserve the long-term LegacyOS / MediaOS / Human Legacy Initiative vision in canonical form and surface open decisions before any blueprinting. | `npm run builder:preflight` PASS after doc-only changes. | Resolve product identity and priority before creating a founder packet or blueprint. |
