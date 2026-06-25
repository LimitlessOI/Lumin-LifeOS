<!-- SYNOPSIS: AMENDMENT 11 — BoldTrail Real Estate CRM Integration -->

# AMENDMENT 11 — BoldTrail Real Estate CRM Integration
**Status:** LIVE (in use)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-06-22

---

## WHAT THIS IS
Deep integration with BoldTrail (real estate CRM platform). Automates lead follow-up, property showing reminders, post-showing emails, agent onboarding, and performance coaching for real estate agents. The autonomy scheduler runs background jobs for auto-responses and follow-ups.

**Mission:** Give real estate agents a fully automated assistant that handles follow-up, reminders, and outreach on their behalf.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| Per-agent subscription | $97–$197/mo | Automated CRM assistant |
| Brokerage deal | $500–$2,000/mo | White-labeled for brokerages |
| Agent recruitment automation | $500/mo | Recruiting + onboarding new agents |
| Lead nurture sequences | Included | Part of agent subscription |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `integrations/boldtrail.js` | BoldTrail API client |
| `services/autonomy-scheduler.js` | Background: auto-responses, showing reminders, follow-ups |
| `server.js` (lines 6155–6572) | BoldTrail endpoints — NEEDS EXTRACTION |

### BoldTrail Capabilities Used
- Lead sync from BoldTrail → local DB
- Auto-response emails for new leads (AI-generated, personalized)
- Property showing reminders (email to client day before showing)
- Post-showing follow-up emails (AI-generated)
- Agent onboarding sequences
- Email drafts stored in `boldtrail_email_drafts` table

### DB Tables
| Table | Purpose |
|-------|---------|
| `boldtrail_email_drafts` | AI-generated emails pending review/send |
| `boldtrail_agents` | Agent profiles and settings |
| `boldtrail_leads` | Synced leads with status |
| `boldtrail_showings` | Scheduled property showings |

### Required Env Vars
- `BOLDTRAIL_API_KEY` — BoldTrail API access
- `BOLDTRAIL_WEBHOOK_SECRET` — Webhook verification

---

## CURRENT STATE
- **KNOW:** `src/integrations/boldtrail.js` — kvCORE v2 contacts, notes, tags, filtered list, normalize
- **KNOW:** `services/lifere-boldtrail-bridge.js` — LifeRE reads BoldTrail pipeline; approval-gated note write-back
- **KNOW:** LifeRE routes: `/api/v1/lifere/boldtrail/status`, `/boldtrail/pipeline`, `/follow-up/approve`
- **KNOW:** `public/overlay/lifeos-lifere.html` — BoldTrail sync strip + follow-up queue with approve gate
- **THINK:** Railway `BOLDTRAIL_API_KEY` scope (agent vs admin) determines how many contacts load
- **DON'T KNOW:** Live probe result on Adam's EXP token until `/api/v1/lifere/boldtrail/status` run in production

---

## Change Receipts

| Date | Change | Why | State | Next |
|------|--------|-----|-------|------|
| 2026-06-25 | **`addContactNote`** — kvCORE `/contact/:id/action/note` requires `details` field (422 without it) | CRM alpha note write-back via follow-up/approve | ✅ node --check | deploy + crm-alpha-test |
| 2026-06-25 | **`src/integrations/boldtrail.js`** — `createOrUpdateContact` tries `POST /contact` (kvCORE v2 singular) with fallbacks; `addContactNote` tries `/contact/:id/action/note` PUT/POST; `findContactByEmail`, `extractCreatedContactId`, `buildKvCoreContactPayload` | Adam CRM alpha: create returned 405 on `POST /contacts`; notes 404 on `/contacts/:id/notes` | ✅ node --check | deploy + `npm run lifeos:crm:alpha:test` |
| 2026-06-22 | **LifeRE ↔ BoldTrail bridge** — `lifere-boldtrail-bridge.js`, enhanced `boldtrail.js` (filtered contacts + normalize), LifeRE routes + overlay sync UI. BoldTrail = CRM SoR; LifeRE = command layer with approval before write-back. | Adam: optimize EXP BoldTrail connection; don't rebuild CRM/campaigns/IDX — pull pipeline into LifeRE top-3 + follow-up queue. | ✅ `node --check` | Deploy + probe token; register BoldTrail webhooks (Phase 2) |

---

## REFACTOR PLAN
1. Extract all BoldTrail server.js routes → `routes/boldtrail-routes.js`
2. Move scheduler logic from `autonomy-scheduler.js` to BullMQ recurring jobs
3. Add agent dashboard — agent sees all pending email drafts, approves/edits before send
4. Add lead scoring — AI scores each lead 1–100 based on conversation history
5. Add showing feedback collection — post-showing AI survey to client

---

## NON-NEGOTIABLES (this project)
- Email drafts must require agent approval before sending — never auto-send without review gate
- Agent tone/brand must be preserved — never override agent's voice with generic AI copy
- Lead data is private to each agent — never expose one agent's leads to another
- Comply with real estate commission rules — no AI can solicit clients without agent oversight

---

## Pre-Build Readiness

**Status:** BUILD_READY (core CRM + email automation — gates 1-5 complete)
**Adaptability Score:** 78/100
**Council Persona:** jobs (is this beautiful and inevitable? would an agent love it or just use it?)
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] Lead scoring, email drafts, showing follow-ups have specific segment descriptions
- [x] DB schema complete (boldtrail_agents, boldtrail_showings, boldtrail_email_drafts)
- [x] Agent approval gate defined — no auto-send without review
- [ ] Lead scoring algorithm needs explicit scoring rubric in segment description before builder touches it

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| BoldTrail (kvCORE) | Industry standard, huge RE market share | Generic AI, no agent voice preservation, expensive | AI learns each agent's tone — drafts sound like them, not like a chatbot |
| Follow Up Boss | Clean UI, good pipeline management | No AI drafting, no showing automation | We draft the email, agent approves in one tap — FUB requires writing every email |
| Sierra Interactive | SEO-focused, lead gen built in | Automation is rule-based, not AI | Our AI reads conversation history and crafts contextually relevant follow-ups |
| Lofty (Chime) | All-in-one, affordable | AI is surface-level, no voice matching | We tune to agent personality and RE niche (luxury vs first-time buyers vs investors) |
| LionDesk | Affordable, good drip campaigns | No AI, no voice, 2000s UX | We generate drip content dynamically from actual conversation — not canned sequences |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| BoldTrail/kvCORE ships GPT-4o email drafting | High (12 months) | Medium | Our edge is voice preservation + tone learning, not just GPT — they'll have generic |
| Zillow Flex eats agent lead supply | Medium | High | We make agents dramatically more responsive — increases conversion on whatever leads exist |
| AI email spam regulations tighten | Medium | Medium | All drafts require human approval — we're already compliant by design |
| Agent churns, their data locked in our system | Low | Medium | Data export built into agent portal from day one |

### Gate 4 — Adaptability Strategy
New CRM platforms plug into the same agent abstraction layer — add an API adapter per platform without touching email drafting or lead scoring. Score: 78/100.
- New CRM API: add `services/[platform]-sync.js` adapter, no other changes
- New AI email providers: council failover handles this automatically
- If competitor ships voice matching: we add a "calibration session" feature where agent rates 10 drafts to refine their profile

### Gate 5 — How We Beat Them
Every competing CRM sends the same sequence to every lead; we read the actual conversation history, identify the specific objection or interest signal, and draft a reply in the agent's exact voice that addresses it directly — turning cold leads warm without the agent lifting a finger.
