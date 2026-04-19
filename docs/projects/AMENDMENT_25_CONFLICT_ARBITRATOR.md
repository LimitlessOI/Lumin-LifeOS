# AMENDMENT 25 — Conflict Arbitrator

| Field | Value |
|---|---|
| **Lifecycle** | `planning` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Last Updated** | 2026-04-03 (initial draft — sourced from data/ideas/conflict-arbitrator-idea.json + LifeOS mediation engine extension) |
| **Verification Command** | `node scripts/verify-project.mjs --project conflict_arbitrator` |
| **Manifest** | `docs/projects/AMENDMENT_25_CONFLICT_ARBITRATOR.manifest.json` |
| **Build Ready** | `NOT_READY` — Gate 1: Architecture design needed; legal/liability review required before launch |
| **Original Idea Score** | 9.2 / 10 (from conflict-arbitrator-idea.json — multi-model consensus, $2B+ market) |

---

## Mission

Conflict destroys more value than almost any other human experience — in marriages, business partnerships, families, and workplaces. The mediation industry exists to address this but is expensive, slow, and inaccessible.

The Conflict Arbitrator is **AI-powered mediation as a platform overlay** — available anywhere two people are having a hard conversation, without switching apps, without booking an appointment, without a $300/hour mediator.

This is not a therapy replacement. It is a conflict navigation tool built for the moment of heat.

---

## Core Differentiators

### 1. Overlay Architecture
The Conflict Arbitrator works **on top of any communication platform**. Zoom, FaceTime, WhatsApp, a phone call, an in-person conversation with phones present — it doesn't matter. The user does not need to be in the LifeOS app during the conflict. The overlay floats, activates when needed, and disappears when done.

This is the architectural moat. Every other mediation tool requires participants to be inside its platform. This one goes where the conflict is.

### 2. Multi-Model Consensus for Fairness
No single AI model arbitrates. Multiple models vote on fair resolution framing:
- **Model A** (Groq/Gemini): identifies the stated positions and underlying needs
- **Model B** (Claude Sonnet): stress-tests whether the proposed resolution serves both parties
- **Model C** (Gemini Flash): checks for power imbalance in the framing
- **Consensus output**: only framings that pass all three are surfaced; divergent framings are flagged as "complex — needs more information"

This prevents any single AI bias from tilting the outcome. The multi-model approach is the integrity guarantee.

### 3. Local-First Privacy for Conflict Data
Conflict data is the most sensitive possible category. What was said in a fight, what each person actually needed, who said what — none of this should live on a server unless the user explicitly chooses.

- **Default: local-only processing** — conversation analysis happens on-device; nothing transmitted server-side
- **Opt-in sync**: if the user wants to track patterns over time, they can opt into server sync with full encryption
- **No third-party sharing ever** — no insurance companies, employers, legal systems; conflict data is constitutionally protected in this platform

---

## Feature Set

### Core Mediation Flow

- **Activation** — user taps the floating overlay button during a hard conversation; system activates in silent observation mode
- **Consent capture** — before any recording or analysis, both parties must explicitly consent on their own device; single-party recording is architecturally prevented
- **Emotional state read** — system assesses each party's state (calm / stirred / heated / flooded) using voice analysis and self-report; calibrates approach accordingly
- **Flooding detection** — when either party reaches physiological flooding (Gottman threshold), system recommends a timed pause before continuing; the break is not optional if both parties agreed to the protocol
- **Turn-by-turn reflection** — after each statement, system can offer a reflection: "What I heard you say was [X] — is that close?" without editorializing
- **Underlying need surfacing** — system identifies what each person actually needed beneath their stated position; surfaces this back to each party individually before the joint session continues
- **Neutral resolution proposals** — system generates 3 possible resolution framings that acknowledge both parties' needs; none of them "win" for one side
- **Agreement capture** — if resolution is reached, system generates a plain-language agreement record with both parties' stated commitments; optionally signed (timestamp hash)
- **Follow-up scheduling** — system schedules a check-in 3 days and 7 days post-resolution to verify the agreement is holding

### Pre-Court Mediation Workflow

For disputes that are approaching legal intervention — business partnerships, property disputes, neighbor conflicts, family estate conflicts.

- **Legal-lite documentation** — structured record of: the dispute history, both positions, evidence each party submitted, agreements reached, and what remains unresolved
- **Agreement generation** — plain-language agreement document, suitable for review by attorneys but not a legal contract itself
- **Escalation path** — if mediation fails, system provides a clear path to formal mediation services with documentation already organized
- **Cost comparison** — shows user what formal litigation or mediation would cost vs resolving here; not to pressure, just context

### Multi-Party Sessions

Beyond two-party — for families, business teams, roommates.

- **Up to 6 participants** — each with their own device, their own consent, their own private reflection space
- **Coalition detection** — system identifies when sub-groups are forming within the conflict and surfaces this explicitly ("It looks like two different perspectives have emerged — let's name them")
- **Facilitator mode** — one participant can take the facilitator role; system gives them a real-time coaching sidebar while they run the session
- **Group agreement** — structured consensus capture when all parties reach agreement; majority-rule and consensus options

### Conflict Pattern Intelligence (Individual)

Over time, for users who sync data, the system learns their conflict patterns:

- **Trigger signature** — what situations reliably precede conflict for this person?
- **Escalation pattern** — how does this person's conflict style escalate? What's the first signal?
- **Recovery time** — how long does repair typically take? Is it getting shorter over time?
- **Communication blind spots** — what does this person consistently miss about the other person's experience?
- **Growth tracking** — is conflict resolution actually improving? Not by subjective feeling — by data

---

## Revenue Model

| Tier | Price | Target |
|---|---|---|
| **Free** | $0 | 3 sessions/month; basic mediation flow; no history sync |
| **Premium** | $29/mo | Unlimited sessions; pattern tracking; pre-court workflow |
| **Pro** | $99/mo | Multi-party; legal documentation; facilitator mode; API access |
| **Business** | $499/mo | Team conflict resolution; HR integration; analytics dashboard |
| **Enterprise / Court-Ordered** | Custom | Court system integrations; certified mediator oversight |

---

## Market

- **$2B+ global mediation market** (growing 8% annually)
- **Adjacent markets**: couples therapy ($4.7B), workplace conflict ($359B in lost productivity annually), family law ($11B)
- **Price point advantages**: $29/mo vs $300/hour mediator, accessible to everyone, not just those who can afford professional mediation
- **Network effects**: as more sessions are completed, the multi-model fairness calibration improves; the product gets measurably better over time

---

## Architecture

### Relationship to LifeOS Mediation Engine (AMENDMENT_21 Phase 9)

The existing mediation engine (mediation-engine.js, lifeos-mediation-routes.js, lifeos-mediation.html) is the **in-app MVP**. The Conflict Arbitrator is the **platform extension** that takes that engine and makes it work across any communication context.

The mediation engine code is reused — the Conflict Arbitrator adds:
1. **Overlay browser extension / PWA** — the floating UI that works over any platform
2. **Multi-model consensus layer** — upgrades single-model mediation to council voting
3. **Voice analysis integration** — emotional state read from audio, not just text
4. **Legal-lite documentation generator** — structured agreement output
5. **Consent architecture hardening** — cryptographic mutual consent before any session begins

### Tech Stack
- **Frontend**: Browser extension (Chrome/Safari) + PWA for mobile
- **Voice analysis**: Whisper-based transcription + tone analysis (ElevenLabs voice input / native Web Speech API)
- **Multi-model consensus**: existing council routing infrastructure
- **Local-first storage**: IndexedDB for on-device session data; opt-in sync to Neon
- **Agreement signing**: SHA-256 timestamp hash; optionally DocuSign API for legal-grade signing

---

## Pre-Build Readiness Gates

### Gate 1: Feature Detail — COMPLETE (this document)

### Gate 2: Competitive Analysis
- **Modria** (now Tyler Technologies): enterprise court systems; not consumer; $$$
- **Wevorce**: divorce mediation only; narrow
- **Resolve**: workplace only; enterprise sales cycle
- **Gap**: no consumer-grade, cross-platform, AI-powered overlay mediator exists

### Gate 3: Risk Analysis
- **Legal liability**: "mediation" carries professional definitions in many jurisdictions; must clearly label this as "AI-assisted conflict resolution" not "legal mediation"; terms of service must disclaim legal effect
- **Misuse potential**: abusive relationship dynamics could use this tool to pressure victims; must build in safety protocols (unilateral exit at any time, no pressure to continue, abuse detection signals)
- **Voice recording laws**: two-party consent laws in California and other states; consent architecture must be foolproof

### Gate 4: Adaptability
- Works without full LifeOS subscription (standalone product)
- Works on any device, any platform
- Monetizes independently of LifeOS Core

### Gate 5: Differentiation — CLEAR
Multi-model consensus + overlay architecture + local-first privacy = no existing product has all three

---

## Build Priority

1. **Overlay PWA** — floating UI that works over any communication context
2. **Multi-model consensus upgrade** to existing mediation engine
3. **Pre-court documentation** module
4. **Voice analysis** integration (Whisper)
5. **Mobile-first design** and browser extension
6. **Legal documentation** review before public launch

---

## Change Receipts

| Date | Change | Author |
|---|---|---|
| 2026-04-03 | Initial draft — full feature set, revenue model, architecture, competitive analysis, readiness gates | Claude |
