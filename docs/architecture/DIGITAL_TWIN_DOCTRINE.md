<!-- SYNOPSIS: Digital Twin — universal per-person understanding (capsules = evidence layer) -->

# Digital Twin Doctrine

**Adam directive — 2026-06-25. Product language over internal jargon.**

---

## What we call it

| Term | Meaning |
|------|---------|
| **Digital Twin** | The product concept: a living model of **who this person is** — goals, patterns, voice, fears, strengths, how they want help — so Lumin can serve them better than generic AI |
| **Capsule** | Implementation primitive: domain-scoped, receipt-backed **memory evidence** that **feeds** the twin (same idea as the capsule system — we prefer *digital twin* when talking to humans) |
| **Translation** | Personality layer that turns twin + API facts into natural language (`chair-personality-translate.js`) — not a separate fake person |

**One sentence:** We are building an understanding of each person that should become **deeper than any human would know — including themselves** — through continuous memory, context, and honest prediction.

---

## Universal rule: every account gets a twin

**Adam's twin is not the only twin.** Every user gets **their own** digital twin, scoped to **their account**.

| Person | Twin purpose |
|--------|----------------|
| **Adam (founder)** | Personal LifeOS + BuilderOS context + platform decisions; fullest instrumentation |
| **Sherry / household** | Her lane (walled); relationship twins with consent |
| **Every member / client** | How **this system can best help them** — same machinery, their data, their UX |

Their twin **simulates how to help them** — layout prefs, tone, timing, what to automate, what to ask first — exactly like Adam's twin simulates founder context, but **without platform build authority**.

**Privacy:** Twins do not leak across accounts. Cross-user signals only via explicit relationship edges + consent (see `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`).

---

## What the twin contains (framework)

Storage: `data/twins/{tenant_id}/{user_id}/` (+ Postgres mirror). Spec: `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`.

| Twin file | Models |
|-----------|--------|
| `personal.json` | Whole person — motivations, demotivators, energy, blind spots, constraints |
| `personality.json` | Character — warmth, directness, humor |
| `communication.json` | Voice — phrases, tone, banned patterns |
| `goal.json` | Horizons and weights |
| `memory.json` | Capsule refs + episodic summaries (pointers, not raw dump) |
| `permission.json` | What the system may do autonomously (levels 0–5) |
| `modules/*.json` | Domain twins (LifeRE, finance, parenting, etc.) when enabled |

**Capsules** (memory intelligence / evidence API) supply **verified chunks** that update twin facets over time — conversations, receipts, clips, CRM events, preferences.

---

## How Lumin uses the twin (not theater)

```
Every turn:
  1. Load this user's twin facets + communication profile + recent capsules
  2. Gather real API facts (SYSTEM_FACTS)
  3. Twin informs: tone, what to offer, what to avoid, predictions
  4. Translation model formats human prose (cheapest cost first)
  5. Communication Law gate: anti-formula scrub + variety log (mandatory)
  6. After turn: learn → update twin / queue capsule (receipt-backed)
```

**Communication law (DNA — enforced):** `builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json` · verify `npm run lifeos:lumin:communication:verify`. Translation is **human language for API truth** — not a fixed ChatGPT formula. Match **their** patterns; vary openings; forbidden phrases scrubbed at runtime.

**Predictions** are labeled `Prediction:` — twin simulates *how they would react* or *what would help*; **action** still requires permission tier + confirmation when load-bearing.

---

## Understanding > any human

**Goal (aspirational, honest):**

- Accumulate **every consented signal** — what they say, what they do, what they reject, what they repeat, what drains them
- Resolve contradictions over time (Wisdom layer — `docs/LUMIN_DOCTRINE.md`)
- Surface blind spots gently — *"You said X matters but your calendar shows Y"* — with consent and calibration
- Never claim omniscience; say **DON'T KNOW** when evidence is thin

Smaller model + **rich twin** beats frontier model + amnesia.

---

## Founder vs member (same twin engine, different authority)

| | Twin depth | Platform command |
|--|------------|------------------|
| Founder | Full + governance extensions | Yes — builds, missions, Point B |
| Member | Full for **their** life | No — prefs, feedback, fluid UI only |

---

## Code touchpoints

| Component | Role |
|-----------|------|
| `services/lifere-twin-store.js` | Read/write twin JSON |
| `services/lumin-context-loader.js` | Load twin into Lumin prompt context |
| `services/chair-personality-translate.js` | Translate SYSTEM_FACTS → human prose + Communication Law gate |
| `services/lumin-communication-guard.js` | Anti-formula enforcement + wiring audit |
| `services/response-variety.js` | Per-user style rotation (not same formula every turn) |
| `services/lumin-conversation-learner.js` | Post-turn learning (where wired) |
| Memory capsules API | Evidence → twin updates |

**⚠️ INCOMPLETE:** Fluid UI from twin prefs; expose `communication_law_receipt` on API responses; Adaptive Panel UI copy gate; full Wisdom prediction loop.

---

## Related docs

- `docs/LUMIN_DOCTRINE.md` — Chair, honesty, Wisdom
- `docs/architecture/LUMIN_TRANSLATION_AND_ACCOUNT_MODEL.md` — translation + cost routing
- `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md` — full twin taxonomy
- `docs/LIFEOS_SERVICE_AND_EPISTEMOLOGY_DOCTRINE.md` — serve don't decide

@ssot docs/products/lifeos/PRODUCT_HOME.md
