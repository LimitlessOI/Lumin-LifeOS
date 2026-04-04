# AMENDMENT 29 — AI Receptionist (Zoom Phone Overlay)

| Field | Value |
|---|---|
| **Lifecycle** | `planning` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Last Updated** | 2026-04-04 (initial draft — sourced from GPT dump 01/02, LifeOS_LimitlessOS dump 002) |
| **Verification Command** | `node scripts/verify-project.mjs --project ai_receptionist` |
| **Manifest** | `docs/projects/AMENDMENT_29_AI_RECEPTIONIST.manifest.json` |
| **Build Ready** | `NEAR_READY` — Billing routes exist; need Stripe price ID, landing page, and Vapi/Zoom integration |

---

## Mission

The AI Receptionist answers, qualifies, and routes inbound calls for small businesses — starting with real estate agents — with personalized tone matching, call summaries, and scheduling integration. Delivered as a $99/mo SaaS subscription.

This is one of the fastest paths to first paying customers: no discovery calls, self-serve checkout, immediate utility.

---

## Product Description

An AI that picks up when the business owner can't. It:
- Answers and greets callers in the business owner's voice/tone
- Qualifies the caller (lead type, urgency, intent)
- Routes based on rules (urgent → SMS owner, standard → schedule callback)
- Logs and summarizes every call
- Delivers caller intent + transcript to Command Center dashboard

Initial vertical: real estate agents. Designed for white-label expansion.

---

## Feature Set

### Core (MVP)
- **AI phone answering** — Vapi-based voice agent answers calls on a shared or dedicated number
- **Caller qualification** — collects name, reason for call, urgency; applies hot/warm/cold scoring
- **Smart routing** — urgent calls → immediate SMS to owner; others → Calendly booking or voicemail
- **Call summary & transcript** — delivered to Command Center within 60 seconds of call end
- **Onboarding script builder** — user provides 5 inputs (business name, services, tone, FAQ, escalation rules); AI generates the receptionist script
- **Stripe subscription** — $99/mo; 7-day free trial; no discovery call required
- **One-click onboarding** — landing page → Stripe → Typeform brief → Vapi agent created automatically

### Phase 2
- **Personalized voice cloning** — owner records 3 minutes of audio; receptionist uses their voice
- **BoldTrail CRM sync** — every qualified caller becomes a CRM lead automatically
- **Multi-number support** — separate numbers per campaign or department
- **AI whisper coaching overlay** — real-time coaching shown to the owner during live calls they handle
- **Industry templates** — pre-built scripts for real estate, medical offices, law firms, contractors

### Phase 3
- **White-label** — agencies resell under their own brand
- **Outbound AI calling** — same agent dials cold leads, qualifies, books appointments
- **Social media DM responder** — extends receptionist capability to Instagram/Facebook comments

---

## Revenue Model

| Tier | Price | Target |
|---|---|---|
| **Starter** | $99/mo | Solo agents, small businesses — 1 number, basic routing |
| **Pro** | $199/mo | Teams — 3 numbers, BoldTrail sync, voice cloning |
| **Agency** | $499/mo | Agencies — unlimited numbers, white-label, sub-accounts |
| **Enterprise** | Custom | Large brokerages, multi-location SMBs |

**Unit economics (Starter):**
- Revenue: $99/mo
- AI cost per month (Vapi + LLM): ~$8–15 depending on call volume
- **Net margin: ~85%**
- 100 customers = ~$8,500 MRR

**Time to first revenue: 1 week (landing page + Stripe + Vapi integration)**

---

## Architecture

### Core Dependencies
- **Vapi** — voice AI layer (already in platform vision)
- **Stripe** — subscription billing (routes exist: `routes/billing-routes.js`, `routes/stripe-routes.js`)
- **BoldTrail** — CRM sync for real estate leads (`routes/boldtrail-routes.js` exists)
- **Twilio** — SMS escalation (`services/twilio-service.js` exists)
- **Typeform/Google Form** — onboarding brief intake

### New Files Required
- `routes/receptionist-routes.js` — subscription webhook, agent provisioning, call log endpoints
- `services/receptionist-service.js` — Vapi agent creation, script generation, call routing logic
- `public/ai-receptionist.html` — landing page with Stripe checkout CTA
- `public/checkout-success.html` — post-purchase confirmation
- `db/migrations/YYYYMMDD_ai_receptionist.sql` — customers, call_logs, receptionist_configs tables

### DB Schema (key tables)
```sql
CREATE TABLE IF NOT EXISTS receptionist_configs (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  business_name TEXT NOT NULL,
  vapi_agent_id TEXT,
  phone_number TEXT,
  routing_rules JSONB,
  script_text TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  config_id INTEGER REFERENCES receptionist_configs(id),
  caller_number TEXT,
  duration_seconds INTEGER,
  intent TEXT,
  lead_score TEXT CHECK (lead_score IN ('hot','warm','cold')),
  summary TEXT,
  transcript TEXT,
  routed_to TEXT,
  call_time TIMESTAMPTZ DEFAULT now()
);
```

---

## Pre-Build Readiness Gates

### Gate 1: Feature Detail — COMPLETE (this document)

### Gate 2: Infrastructure
- [ ] Vapi account created and API key set
- [ ] Stripe price IDs created for all three tiers
- [ ] VAPI_API_KEY env var set in Railway
- [ ] `public/ai-receptionist.html` landing page built
- [ ] DB migration written and tested

### Gate 3: Competitive Landscape
- **Ruby Receptionists** / **Smith.ai**: $300+/mo human + AI hybrid; no self-serve onboarding
- **Moneypenny**: UK-based, enterprise pricing, no real-time AI
- **Vapi templates**: raw API, no business-ready wrapper
- **Gap**: $99/mo, self-serve, 7-day trial, zero human labor on delivery = no competitor at this price

### Gate 4: Existing Platform Leverage
- Stripe billing already wired
- Twilio SMS escalation already exists
- BoldTrail CRM sync already exists
- Council AI already handles script generation
- Command Center already exists for call log display

### Gate 5: Risk Analysis
- **TCPA compliance** — outbound AI calling is regulated; inbound answering is safe; outbound Phase 3 requires careful compliance review
- **Voice cloning liability** — Phase 2 voice cloning must include consent verification from the voice owner
- **Vapi reliability** — if Vapi is unavailable, calls go unanswered; must have Twilio voicemail fallback

---

## Build Priority

1. **Landing page + Stripe checkout** — `public/ai-receptionist.html` + Stripe price IDs (1 day)
2. **DB migration** — customers + call_logs + receptionist_configs tables (hours)
3. **Receptionist routes** — subscription webhook, agent provisioning endpoint (2-3 days)
4. **Vapi integration** — create agent from script, handle call webhooks (2-3 days)
5. **Command Center panel** — call log, lead score feed, transcript viewer (1-2 days)
6. **BoldTrail sync** — auto-create CRM contact from qualified caller (1 day)
7. **Voice cloning** — Phase 2, after first 10 paying customers

---

## Change Receipts

| Date | Change | Author |
|---|---|---|
| 2026-04-04 | Initial draft — sourced from GPT dump 01/02 and LifeOS_LimitlessOS dump 002; full feature set, revenue model, architecture | Claude |
