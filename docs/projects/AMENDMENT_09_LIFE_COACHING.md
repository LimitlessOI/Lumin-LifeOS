# AMENDMENT 09 — Life Coaching / Personal OS
**Status:** LIVE (local use)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

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

### API Endpoint Groups
- `GET/POST /api/v1/goals/*` — goal CRUD + progress
- `GET/POST /api/v1/activities/*` — activity logging
- `GET/POST /api/v1/calendar/*` — calendar management
- `POST /api/v1/coach/chat` — coaching conversation
- `POST /api/v1/call-simulation/*` — sales practice
- `POST /api/v1/perfect-day/*` — daily planning
- `GET/POST /api/v1/progress/*` — progress tracking

---

## CURRENT STATE
- **KNOW:** All endpoints exist in server.js (lines 8471–9380) — large, needs extraction
- **KNOW:** Sales coaching uses Twilio for call recording
- **THINK:** Most features are wired but may not have been tested in production
- **DON'T KNOW:** Whether any users are actively using these features
- **DON'T KNOW:** Whether goal/activity data is being retained correctly across sessions

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
