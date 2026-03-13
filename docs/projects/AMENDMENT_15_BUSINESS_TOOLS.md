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
