# AMENDMENT 09 — Life Coaching / Personal OS + Digital Twin
**Status:** LIVE (local use) | Digital Twin: OPERATIONAL
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-04-18 (twin-auto-ingest.js tracked into repo alongside lifeos follow-up session)

---

## WHAT THIS IS
The personal operating system layer. Goal tracking, activity logging, calendar management, coaching conversations, relationship mediation, meaningful moments capture, perfect day planning, and progress tracking. This is the LifeOS side of the platform — the personal empowerment tools as opposed to the business tools.

**Mission:** Remove friction from living intentionally. Help users close the gap between who they are and who they want to be.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| LifeOS personal subscription | $29–$97/mo | Individual users |
| Corporate wellness packages | $500–$2,000/mo | Teams + coaching |
| Sales coaching (sub-feature) | $297/mo per rep | Real estate agent coaching |
| Call simulation training | $97/mo | Objection handling practice |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `server.js` (lines 8686–9380) | Goal tracking, activity, coaching progression, calendar, perfect day, goal commitment, call simulation, relationship mediation, meaningful moments, coach chat, progress — ALL NEEDS EXTRACTION |
| `server.js` (lines 8471–8685) | Sales coaching + recording endpoints |
| `services/twin-auto-ingest.js` | **NEW** Digital Twin — watermark-based ingest from conversation_messages → adam_decisions; profile rebuild every 25 new decisions via Claude Opus |
| `services/adam-logger.js` | Adam decision logger — creates entries in adam_decisions; builds profile via buildProfile() |
| `services/autonomy-scheduler.js` | **UPDATED** TWIN_INGEST loop — runs every 30min; first run 2min after boot |

### Sub-Features
| Feature | Description |
|---------|-------------|
| Goal Tracking | SMART goals with milestones, progress scoring |
| Activity Tracking | Daily actions that map to goals |
| Coaching Progression | AI coaching chat with progression tracking |
| Calendar | Schedule management + AI scheduling recommendations |
| Perfect Day | Daily planning template — ideal day builder |
| Goal Commitment | Public commitment contracts for accountability |
| Call Simulation | AI role-play for sales objection handling |
| Relationship Mediation | AI-assisted communication for conflict resolution |
| Meaningful Moments | Capture + reflect on high-value life moments |
| Coach Chat | Real-time AI coaching conversation |
| Progress Tracking | Rolling progress across all active goals |
| Sales Coaching | Recording + feedback for sales calls (real estate focus) |
| Income Diagnostic | Gap analysis: current income vs. target |

### API Endpoint Groups (Life Coaching)
- `GET/POST /api/v1/goals/*` — goal CRUD + progress
- `GET/POST /api/v1/activities/*` — activity logging
- `GET/POST /api/v1/calendar/*` — calendar management
- `POST /api/v1/coach/chat` — coaching conversation
- `POST /api/v1/call-simulation/*` — sales practice
- `POST /api/v1/perfect-day/*` — daily planning
- `GET/POST /api/v1/progress/*` — progress tracking

### Digital Twin DB Tables
| Table | Purpose |
|-------|---------|
| `conversation_messages` | Source of all user messages (role='user') — feeds the twin |
| `adam_decisions` | Permanent log of every ingested decision/statement — never deleted |
| `adam_profile` | Current synthesized profile of Adam; rebuilt every 25 decisions; `is_current=TRUE` marks live profile |
| `twin_ingest_control` | Watermark tracking — `last_message_id` prevents reprocessing |

**Migration:** `db/migrations/20260327_twin_ingest_control.sql`

---

## CURRENT STATE

### Life Coaching
- **KNOW:** All endpoints exist in server.js (lines 8471–9380) — large, needs extraction
- **KNOW:** Sales coaching uses Twilio for call recording
- **THINK:** Most features are wired but may not have been tested in production
- **DON'T KNOW:** Whether any users are actively using these features
- **DON'T KNOW:** Whether goal/activity data is being retained correctly across sessions

### Digital Twin (OPERATIONAL — 2026-03-27)
- **KNOW:** `services/twin-auto-ingest.js` is live — every user message across all programs is automatically ingested into `adam_decisions`; no manual logging required
- **KNOW:** Watermark tracking via `twin_ingest_control` table (`last_message_id` key) — zero reprocessing, zero data loss
- **KNOW:** Pipeline: conversation_messages (role='user') → classify → adam_decisions → rebuild adam_profile every 25 new decisions
- **KNOW:** Message classifier detects: FEEDBACK_GIVEN, IDEA_APPROVED, IDEA_REJECTED, PREFERENCE, CONVERSATION
- **KNOW:** Profile rebuild calls Claude Opus via `adamLogger.buildProfile(callAI)` — highest-quality synthesis
- **KNOW:** Twin runs on 30min schedule in `autonomy-scheduler.js`; first run 2min after boot
- **KNOW:** `getLiveProfile()` exposes current profile to builder council review (Adam filter lens)
- **KNOW:** `forceRebuild()` available for manual invocation or post-major-conversation trigger
- **KNOW:** `db/migrations/20260327_twin_ingest_control.sql` migration creates watermark table
- **DON'T KNOW:** Whether `adam_profile` and `adam_decisions` tables exist in Neon yet (depend on adam-logger migrations)

---

## REFACTOR PLAN
1. Extract ALL life coaching endpoints → `routes/life-coaching-routes.js` (one file, ~600 lines)
2. Extract sales coaching → `routes/sales-coaching-routes.js`
3. Create `services/coaching-service.js` — AI coaching logic (currently inline in route handlers)
4. Add coaching session history — so AI coach remembers previous sessions
5. Add weekly progress email — summary of the week's goal progress sent every Sunday
6. Wire goal progress to the financial system — income goals linked to `financial_ledger`

---

## NON-NEGOTIABLES (this project)
- This is NOT a clinical therapy tool — never replace professional mental health services (North Star Article 6)
- Must route crisis indicators to professional resources immediately
- Relationship mediation must be clearly framed as communication coaching, not legal or therapeutic advice
- All coaching conversations are private — never used for training or shared without explicit consent
- No engagement optimization at the expense of user dignity (North Star Article 2.1)
- Goal data belongs to the user — full export available, full delete available

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 65/100
**Last Updated:** 2026-04-04

### Change Receipts (Digital Twin)
| Date | Change |
|---|---|
| 2026-04-04 | Applied twin_ingest_control migration. Built scripts/import-dumps-to-twin.js — imports all 448 memory dump chunks + 377 conversation messages into adam_decisions (544 total). Wired twin-auto-ingest into bootAllDomains (runs at boot + every 30 min). Adam filter now has full historical record as source material for profile build. |

### Gate 1 — Implementation Detail
- [ ] All sub-features are identified but none are extracted from server.js — 900 lines of endpoint code still inline
- [ ] No `routes/life-coaching-routes.js` file exists yet
- [ ] No `services/coaching-service.js` exists — all AI coaching logic is inline in route handlers
- [ ] Coaching session history persistence not yet designed (so AI coach forgets previous sessions)
- [ ] Weekly progress email schema and scheduling not specified
- [ ] Income Diagnostic feature has no DB schema or endpoint definition
- [x] Sub-feature list is fully documented — headless AI can extract each feature individually
- [x] API endpoint groups defined

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| BetterUp | Enterprise life/career coaching, branded, research-backed | Human coaches ($300+/session), no AI personalization, no goal-to-income connection | We run AI coaching 24/7 with persistent memory — the AI knows what was said last Tuesday |
| Headspace for Work | Mindfulness focus, enterprise contracts, polished UX | No goal tracking, no accountability, no sales coaching, no income diagnostic | We connect personal goals directly to income targets and track the gap daily |
| Replika | Emotional AI companion, highly personalized | No productivity layer, no goal tracking, no sales coaching, raises therapy-line concerns | We are explicitly a coaching tool, not a companion — clearer ethical boundary, stronger business use case |
| Coach.me | Habit tracking + human coach marketplace | $15–$100/mo, human coach required for depth, no multi-feature integration | Our AI coach spans goal tracking, call simulation, income diagnostic, and calendar in one system |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| User presents in crisis (suicidal ideation, domestic violence) during coaching session | Medium | HIGH — ethical and legal duty to respond correctly | Mitigate: crisis phrase detection already in Word Keeper; must wire same detection to coach chat with immediate 988/NAMI routing |
| Coaching AI gives advice that contradicts a real licensed professional's recommendation | Medium | High — medical/legal liability if user acts on it | Mitigate: always frame as coaching perspective, never diagnosis or legal advice; add disclaimer to every coaching response |
| Competitor ships GPT-4o-based personal coach as a native feature (Apple, Google, Microsoft) | HIGH (12–18 months) | High — reduces differentiation for basic coaching | Mitigate: our edge is integration depth — goals linked to financial ledger, coaching history linked to sales call recordings |
| CCPA/GDPR challenge on coaching conversation data | Medium | High — trust + legal | Mitigate: coaching conversations never shared or used for training without explicit opt-in; delete path must be end-to-end verified |

### Gate 4 — Adaptability Strategy
The coaching conversation engine is AI-model-agnostic — if Claude becomes better at goal coaching than the current model, the council routing config is the only change. Adding a new sub-feature (e.g., nutrition coaching) requires a new endpoint group in `routes/life-coaching-routes.js` and a new service function — no existing code changes. The goal/activity DB schema uses a flexible `category` field so new goal types require data changes only. Score: 65/100 — strong conceptual architecture but low today because everything is still inline in server.js; extraction is required before the adaptability of the service layer can be realized.

### Gate 5 — How We Beat Them
While coaching apps track habits in isolation, LifeOS wires personal goals directly to the financial ledger — when your income goal is $10,000/mo and your actual revenue is $3,200, the AI coach automatically builds a gap plan, schedules call simulation practice for the skills you're weakest on, and fires a Monday morning briefing with exactly what to do this week to close the gap.
