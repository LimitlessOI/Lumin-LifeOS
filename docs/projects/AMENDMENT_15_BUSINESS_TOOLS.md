# AMENDMENT 15 — Business Tools Suite
**Status:** LIVE (various stages)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
A collection of AI-powered business tools that don't belong to other projects: business center dashboard, Make.com/Zapier automation generator, virtual real estate training class, agent recruitment & onboarding, trial system, billing/entitlements, and the controversial approval system. These are the "everything else" tools that support clients running their businesses.

**Mission:** Give small business owners AI superpowers for operations they can't afford to hire for.

---

## REVENUE MODEL
| Feature | Revenue Model |
|---------|--------------|
| Business Center | Dashboard for all services → drives upsells |
| Make.com Generator | $97–$297/automation | Sell automations to clients |
| Virtual Real Estate Class | $297–$997/enrollment | Training for new agents |
| Agent Recruitment | $500/mo per brokerage | Automate their recruiting |
| Trial System | Free → paid conversion | 7-day trials for all services |
| Billing/Entitlements | Core infrastructure | Gates all paid features |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `server.js` (lines 5426–5565) | Business center endpoints |
| `server.js` (lines 5734–5802) | Make.com generator endpoints |
| `server.js` (lines 5802–5879) | Controversial approval system |
| `server.js` (lines 5880–5907) | Self-funding system endpoints |
| `server.js` (lines 8150–8470) | Virtual real estate class |
| `server.js` (lines 6832–7152) | Agent recruitment & onboarding |
| `server.js` (lines 10149–10170) | Billing / entitlements |
| `server.js` (lines 10268–10308) | Trial system |

### Sub-Features Detail

**Business Center**
- Main dashboard aggregating all business metrics
- Revenue, leads, tasks, team performance

**Make.com/Zapier Generator**
- AI generates complete Make.com scenarios from description
- Output: JSON workflow definition ready to import
- Supports: webhook triggers, email, SMS, CRM, scheduling

**Controversial Approval System**
- Multi-party approval gate for sensitive actions
- Used by: auto-builder before risky changes, financial transactions, outreach to sensitive targets
- Votes required: configurable (2-of-3, unanimous, etc.)

**Virtual Real Estate Class**
- AI-powered training curriculum for new agents
- Modules: lead gen, objection handling, contracts, market analysis
- Progress tracking per student

**Agent Recruitment & Onboarding**
- Automated pipeline for recruiting real estate agents
- Application → screening → onboarding sequence
- Tracks recruiter performance

**Trial System**
- 7-day free trial for all services
- `user_trials` table tracks active trials
- Auto-expires + sends upgrade email

---

## CURRENT STATE
- **KNOW:** Business center endpoints exist in server.js lines 5426–5565
- **KNOW:** Virtual real estate class is ~320 lines in server.js
- **KNOW:** Agent recruitment is ~320 lines in server.js
- **THINK:** Most of these features are working but not actively used yet
- **DON'T KNOW:** Whether Make.com generator has been used to create real automations

---

## REFACTOR PLAN (Priority Order)
1. Extract Make.com generator → `routes/automation-routes.js` (sells directly)
2. Extract trial system → `routes/trial-routes.js` (gates all revenue features)
3. Extract billing/entitlements → `routes/billing-routes.js` (already has `stripe-routes.js`)
4. Extract virtual real estate → `routes/real-estate-training-routes.js`
5. Extract agent recruitment → `routes/agent-recruitment-routes.js`
6. Consolidate business center + controversial approval → `routes/business-center-routes.js`

---

## NON-NEGOTIABLES (this project)
- Trial system must never grant paid features beyond the trial period — check entitlements on every request
- Controversial approval system must have a timeout — unvoted items auto-reject after 48h
- Agent recruitment must comply with employment/contractor laws — no discriminatory screening
- Make.com generators must never create scenarios that send messages without user consent
- Virtual real estate class content must be reviewed for accuracy — AI can hallucinate regulations

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 60/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [ ] All sub-features are in server.js — none extracted to individual route files yet
- [ ] Make.com generator output format (JSON schema for Make.com scenario import) not fully documented
- [ ] Virtual real estate class curriculum structure not specified — what are the modules, what is the DB schema per student?
- [ ] Trial system has `user_trials` table noted but schema not documented in this amendment
- [ ] Billing/entitlements `project_entitlements` table exists (from Amendment 03) but how entitlements gate features per-request is not specified
- [ ] Controversial approval system timeout (48h auto-reject) not yet implemented — non-negotiable but no code exists
- [x] All sub-features are identified and located in server.js with line numbers
- [x] Revenue model defined per sub-feature

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Make.com (itself) | Leading no-code automation platform, 1,500+ integrations | Requires user to build scenarios manually; steep learning curve; $9–$29/mo | We generate a complete importable Make.com scenario from a plain-English description — zero scenario-building required |
| Zapier | Simpler than Make.com, 6,000+ integrations, huge user base | AI generation is limited to Zap suggestions, not full multi-step workflows | We generate complex multi-step scenarios with webhooks, conditionals, and CRM steps in one AI call |
| CE Shop / Real Estate Express | Accredited real estate pre-licensing courses | Static curriculum, no AI coaching, no objection handling simulation | Our virtual class includes AI role-play for objection handling — interactive, not passive video-watching |
| Greenhouse / Workable (recruiting) | Enterprise ATS, broad HR integrations | No real estate specialization, no AI screening for agent skills | Our agent recruitment is purpose-built for brokerages — screens for real estate aptitude, not generic job skills |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Make.com changes import schema format | Medium | Medium — generated scenarios fail to import | Mitigate: store the Make.com schema version in the generator config; test import monthly |
| Virtual real estate class gives legally incorrect information (e.g., wrong contract law) | HIGH (AI hallucination) | HIGH — user acts on bad legal/licensing advice | Mitigate: add "consult your state's real estate commission" disclaimer to every regulatory claim; flag content for periodic human review |
| Trial system is bypassed by API clients who omit auth headers | Medium | Medium — revenue leakage | Mitigate: entitlement check must be middleware, not inline in route handlers; apply globally |
| Real estate training market consolidates around one platform (e.g., Keller Williams buys a competitor) | Low | Medium — reduces our addressable market for virtual class | Monitor: pivot to selling the training platform to brokerages as white-label |

### Gate 4 — Adaptability Strategy
The Make.com generator is a prompt string — if Make.com ships new module types, we update the prompt to include them. The curriculum for the virtual real estate class is AI-generated per session, so updating curriculum content requires a prompt update, not a content management system. The controversial approval system is generic by design — new approval use cases attach as new `action_type` values. Score: 60/100 — the conceptual flexibility is good but the score is held back by the near-total lack of extracted code; everything is still in server.js, making it hard to assess true adaptability of the implementation.

### Gate 5 — How We Beat Them
While Make.com requires hours of manual scenario building, LifeOS generates a complete, importable multi-step automation from a single English sentence — "when a new prospect fills out my site form, add them to my CRM, send a welcome text, and schedule a follow-up email in 3 days" becomes a working Make.com scenario in 30 seconds, with consent gates built in.
