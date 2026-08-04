<!-- SYNOPSIS: Canonical product home — SalesOS -->

# SalesOS Product Home

**Product id:** `salesos`
**Parent platform:** LimitlessOS
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`
**Machine manifest:** `docs/products/salesos/FILE_MANIFEST.json`
**Mission pack:** `builderos-reboot/MISSIONS/PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001/`

||| **Last Updated** | 2026-07-23 — Initial product home and mission pack drafted from founder's therapist-meeting-kit vision; not yet queued in BP_PRIORITY. |

---

|| Field | Value |
|---|---|---|
| **Lifecycle** | `founder-vision` |
| **Status** | Planning — product home and draft blueprint only; no runtime code |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Owner** | adam |
| **Parent System** | [LimitlessOS](../limitlessos/PRODUCT_HOME.md) |
| **Verification Command** | none yet |

> **Y-STATEMENT:** In the context of founders who need to book 1–2 real meetings today but hate generic cold outreach and do not have time to research every practice, we decided to build **SalesOS** as an AI meeting-kit generator and lightweight sales CRM that turns a practice URL into a one-screen dossier, so the founder can lead with value, ask for the meeting (not the sale), and walk into every call already prepared, accepting that live audio recording, transcription, and tonality analysis are Phase-2 capabilities gated by explicit jurisdiction-aware consent.

## What SalesOS is

SalesOS is the **founder-led outbound operating system** inside LimitlessOS. It owns the research, preparation, execution, and follow-up for getting meetings with professional-service practices — starting with therapists.

The first deliverable is the **Therapist Meeting Kit**: one screen that tells the founder everything before the call.

For every practice:
- Decision maker and gatekeeper names
- Owner/therapist background
- Number of clinicians and specialties
- Reviews — strengths and complaints
- Technology signals (booking, website quality, social presence)
- AI adoption signals
- Shared interests / why this practice is a fit
- Three opening conversation hooks
- Five likely objections
- Best value proposition for that practice
- Follow-up email already written
- Follow-up text already written
- CRM record already created
- Meeting status and next action

## What SalesOS is not

- Not a replacement for a CRM of record (Outreach CRM, BoldTrail, etc.). It is an intelligence and meeting-prep layer.
- Not a robocaller or spam tool. Outreach is consent-gated and human-initiated.
- Not a clinical tool. It does not diagnose or treat.
- Not an automatic call recorder. Audio capture is opt-in, jurisdiction-aware, and Phase 2.

## Relationship to sibling systems

```
LimitlessOS
└── SalesOS (you are here)
    ├── Outreach CRM — contact records, consent, sequences, suppression
    ├── Site Builder — website scoring (`site-builder-opportunity-scorer.js`), web research (`web-search-service.js`)
    ├── MarketingOS — voice, content, brand stories
    ├── LifeOS — chair interface, commitments, Founder Brief generation
    └── BuilderOS — factory execution
```

**Shared dependencies** (do not duplicate; point to owning product):
- `services/web-search-service.js` — Brave/Perplexity research
- `services/site-builder-opportunity-scorer.js` — website quality scoring
- `services/prospect-pipeline.js` — lead pipeline primitives
- `services/communication-gateway.js` — Twilio inbound/outbound call/SMS logging
- `services/consent-registry.js` — explicit consent for recording/analysis features
- `services/data-sovereignty.js` — deletion and data ownership
- `services/lifere-sales-simulator.js` — prior art for sales coaching simulator
- `migrations/004_sales_coaching_tables.sql` — prior art for call-recording schema (adapt, do not reuse directly)

## Priority order (founder lock)

1. Research packet generation
2. Founder Brief
3. Therapist CRM
4. Call script (bullet points only)
5. Presentation flipbook
6. Follow-up email
7. Follow-up text
8. Meeting preparation packet
9. Meeting recap generator
10. Referral engine
11. Evidence Layer (call recording, transcript, CRM, calendar, email, SMS)
12. Tonality engine / coaching replay

For Phase 1 we scope to items 1–4 plus the CRM record and a manual call-notes mode.

## Non-negotiables

- **Consent-first recording.** No call is recorded, transcribed, or analyzed without explicit, revocable consent captured in `consent_registry` with the exact language shown. Jurisdiction-aware policy: at minimum support `nevada_one_party`, `disclosure_required`, and `disable_recording` modes.
- **No dark patterns.** No fake scarcity, no spoofed calls, no hidden auto-dialers.
- **No training on user calls without explicit opt-in.**
- **User owns the data.** Full export and deletion available via `data-sovereignty.js`.
- **Truth labels.** Every generated claim (e.g., "review says X") is labeled KNOW / THINK / GUESS based on source.
- **Fail-closed on missing consent.** If the recording policy cannot be determined, the call is not recorded.
- **Do not fabricate practice facts.** If research cannot find a name, phone, or background, the system says "not found" and prompts the founder to fill it.
- **Crisis routing.** If any message indicates self-harm, the system returns crisis resources and does not continue the sales workflow.

## Pre-build readiness

**Status:** NOT_READY — open decisions below must be resolved before blueprinting moves to execution.

**Known (from existing code):**
- `services/site-builder-opportunity-scorer.js` can score a practice website for booking, mobile, SSL, social proof, CTA, etc.
- `services/web-search-service.js` can run Brave/Perplexity research.
- `outreach-crm` has `crm_contacts`, `outbound_consent`, `crm_messages` tables and a consent model.
- `consent-registry.js` supports append-only consent grants/revocations and `requireConsent`.
- `data-sovereignty.js` provides full user erasure.
- `migrations/004_sales_coaching_tables.sql` is prior art for call-recording tables.

**Assumed:**
- The first vertical is therapists; vertical-specific hooks/objections will be therapist-first.
- `crm_contacts` can be extended with a `salesos_practice_intelligence` JSONB column or side table rather than a new CRM.
- A founder-facing page can live in `public/overlay/lifeos-app.html` as a new stack view (per legacy-interfaces rule).

**Missing / open decisions:**
1. **Recording legal policy.** Founder must choose the default: (a) record automatically only for Nevada↔Nevada, (b) always disclose/consent, or (c) no recording in Phase 1. This is a Vision/Risk decision.
2. **CRM ownership.** Reuse `crm_contacts` + new `salesos_practice_profiles` table, or build a separate SalesOS CRM? Engineering decision with product impact.
3. **Outbound channel.** Use Twilio for calls/SMS (existing) or manual founder action only in Phase 1? Engineering + Business decision.
4. **First meeting offer.** Choose the lead magnet: AI Practice Intelligence Report, Patient Journey Review, or Therapist AI Readiness Assessment. Vision decision.
5. **Data retention.** How long are research packets and call artifacts retained? Risk/Compliance decision.
6. **Queue priority.** SalesOS is not yet in `builderos-reboot/BP_PRIORITY.json`. Business decision.

## Change Receipts

| 2026-07-23 | Initial product home, FILE_MANIFEST, and mission pack `PRODUCT-SALESOS-THERAPIST-MEETING-KIT-V1-0001` created from founder vision. No runtime code; not yet queued. | Capture the vision in canonical form and surface open decisions before execution. | `npm run builder:preflight` PASS after doc-only changes. | Resolve open decisions and queue Phase 1 in BP_PRIORITY. |
