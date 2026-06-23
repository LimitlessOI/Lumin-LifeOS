<!-- SYNOPSIS: LifeRE — Real Estate Business Operating System (full product doctrine) -->

# LifeRE — Real Estate Business Operating System
**Amendment:** `docs/projects/AMENDMENT_LIFERE.md` (founding law + receipts)
**Parent platform:** `docs/products/LIFEOS.md` + `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Law:** `docs/constitution/NORTH_STAR.md`
**Digital twin:** `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`
**Master blueprint:** `docs/LIFERE_MASTER_BLUEPRINT.md`
**Coder pack (zero product decisions):** `docs/LIFERE_BUILDER_DIGITAL_TWIN.md`
**Roadmap:** `docs/LIFERE_BLUEPRINT_ROADMAP.json`
**Feature map:** `docs/LIFERE_A_TO_Z_FEATURE_MAP.md`
**Gap audit:** `docs/LIFERE_GAP_AUDIT.md`
**Last Updated:** 2026-06-13 (Founder Handoff — full end-state, not v1)

---

## MISSION

LifeRE is the **real estate business operating system** — the command, intelligence, coaching, execution, marketing, transaction, recruiting, and accountability layer for a real estate agent or team.

**North Star test:** Does this help the agent make more money **and** protect life quality — on **their** terms, in **their** voice, with **their** strengths — without generic AI theater?

**Framework:** Be (agent identity + niche) → Do (daily activities that convert) → Have (GCI, runway, freedom). LifeRE works at the **activity math + identity + execution** layer first.

---

## CORE DEFINITION (non-negotiable)

| LifeRE **is** | LifeRE **is not** |
|---------------|-------------------|
| Intelligence + operating layer above CRM/TC/marketing tools | A CRM replacement |
| Chair-drawn end-state for agent business OS | Only the v1 Alpha slice |
| Agent personality–preserving drafts + approval-gated execution | Auto-send generic AI |
| Performance Twin + bottleneck math | Vanity dashboards |
| RE-specific MarketingOS module (shared later with Am 41) | All of MarketingOS |

**BoldTrail / kvCORE:** **System of record (SoR)** for contacts, pipeline, campaigns where broker stack requires it. LifeRE **reads, prioritizes, drafts, coaches, and writes back** with approval — it does not rebuild IDX, bulk campaigns, or broker compliance systems.

**MarketingOS (Am 41):** Standalone product. LifeRE owns **`LifeRE.MarketingModule`** — RE-specific content, hooks, channels, funnel ROI — designed to **share adapters** with Am 41 later, not duplicate platform law.

**TC (Am 17):** Transaction execution spine for Adam-as-TC and agent clients. LifeRE **surfaces** transaction status to agents/clients and **routes** TC work; full TC portal remains Am 17 unless explicitly merged by receipt.

---

## USER TYPES

| User | Role | Authority |
|------|------|-----------|
| **Founder (Adam)** | Admin, product owner, TC operator | Full system + all twins + permission grants |
| **Agent (solo)** | Primary LifeRE user | Own leads, clients, content, performance twin |
| **Team lead / broker** | Multi-agent rollup | Aggregates only with per-agent consent |
| **TC staff** | Transaction ops | Transaction twin + comms drafts; no cross-agent leads |
| **Recruiter** | Recruiting OS | Recruiting twin only |
| **Client (buyer/seller)** | Portal consumer | Client twin projection — no agent internals |

**Isolation rule:** No user accesses another agent's leads or private client data unless explicitly authorized (Permission / Consent Twin).

---

## FOUNDER INTENT (outcomes LifeRE must produce)

1. Make more money (GCI, pipeline velocity, source ROI)
2. Know exactly what to do **today** (Daily Command Center)
3. Get more leads (content, ads, funnels, receptionist, outreach)
4. Convert more leads (follow-up OS, coaching, personality twin)
5. Follow up better (speed-to-lead, queues, approval-gated send)
6. Create better content (RE MarketingModule)
7. Run transactions cleaner (TC OS integration)
8. Communicate better with buyers and sellers (Client Communication OS)
9. Recruit and train agents (Recruiting + onboarding)
10. Track numbers that create deals (Performance Twin)
11. Improve skill through practice (Skill Twin + coaching engine)
12. Automate busywork (internal automation; external = approval)
13. Protect family / time / life quality (LifeOS integration)
14. Build the business around agent strengths and personality (Agent Twin)

---

## DOMAIN ARCHITECTURE (40 domains → 8 super-domains)

| Super-domain | Domains included |
|--------------|------------------|
| **Command** | 1 Daily Command Center, 37 Lumin Chair, 38 Approvals, 39 Receipts |
| **Pipeline & CRM** | 2 BoldTrail/CRM, 3 Lead Follow-Up, 30 Opportunity OS |
| **Client & deal** | 4 Client Communication, 5 Buyer OS, 6 Seller/Listing OS |
| **Transaction** | 7 Transaction/TC OS |
| **Growth & marketing** | 8–20 MarketingModule (SocialMediaOS slice), 9–11 funnels/community/DM, 12–19 content/video/SEO/calendar/ads |
| **People** | 21 Agent personality twin, 22 Motivation/rewards, 25–26 Recruiting + onboarding, 27 AI Receptionist, 28 Outreach |
| **Math & intelligence** | 23 Performance/conversion, 24 Skill practice, 29 Finance/commission, 31 Market Intelligence Twin |
| **Twins & Life** | 32–36 + twin set (see blueprint), 40 LifeOS marriage/health/goals |

Full A-to-Z line items: `docs/LIFERE_A_TO_Z_FEATURE_MAP.md`.

---

## LUMIN ROLE (Chair + Orchestrator)

Lumin is the **default front door** inside LifeOS (`/lifeos`) — not Voice Rail (scrapped — `docs/VOICE_RAIL_HISTORY_ONLY.md`).

Lumin must:
- Load **Agent Twin + Business Twin + Performance Twin** context before counsel
- Route to module services (follow-up, content, TC status, recruiting) via **real API paths**
- Invoke CFO / Sentry / Wisdom / Oracle / Advocate lenses on load-bearing decisions
- Return **human language** + **COMMAND_RAN | NO_COMMAND_RAN** + receipt paths
- **Cheapest capable model first**; escalate on fail or complexity (Token Accounting Am 44)
- Track model success by task type, cost, pass/fail, satisfaction

Chair entry: `services/lumin-chair-orchestrator.js`, `routes/lifeos-builderos-command-control-routes.js`.

---

## LIFEOS INHERITANCE

LifeRE **extends** LifeOS — does not fork personal OS law.

| LifeOS layer | LifeRE use |
|--------------|------------|
| Mirror / commitments / integrity | Agent accountability + "word keeper" for client promises |
| Lumin + communication profile | Agent personality twin seed |
| Family OS | Marriage/time protection — calendar load vs income goals |
| Health / emotional | Burnout guardrails; don't optimize GCI at health cost |
| Personal Finance OS (Am 26) | Runway + commission forecast **mirror-first** |
| Memory / capsules (Am 02) | Twin memory substrate |

**Hard wall:** Employer/broker LifeRE data **never** reads personal LifeOS health/relationship tables without explicit consent (same rule as MarketingOS Am 41).

---

## BOLDTRAIL ROLE

| Function | Owner |
|----------|-------|
| Contact records, broker campaigns, IDX | BoldTrail SoR |
| Top-3 from pipeline, follow-up queue, note write-back | LifeRE (`lifere-boldtrail-bridge.js`) |
| Email draft generation in agent voice | LifeRE (approval before send) |
| Webhooks / sync | LifeRE adapter (Phase 2+) |

**KNOW:** Bridge shipped — status, pipeline, approve follow-up routes live.

---

## MARKETING MODULE ROLE (`LifeRE.MarketingModule`)

RE-specific superset of SocialMediaOS capabilities (see founder handoff § MarketingOS). Shares:
- Voice/personality twin with Client Communication OS
- Performance Twin for content → lead attribution
- Optional export to standalone MarketingOS (Am 41) via shared content pack schema

Does **not** replace Am 41 platform law for non-RE verticals.

---

## NON-NEGOTIABLES

1. **No outbound send** without approval unless bounded permission tier recorded
2. **Agent voice** on all drafts — no generic ChatGPT tone
3. **Commission / fair housing / brokerage compliance** — human oversight on sensitive comms
4. **Lead privacy** per agent; team rollups require consent
5. **No theater** — KNOW / THINK / GUESS / DON'T KNOW on claims; receipts on execution
6. **BoldTrail stays SoR** — LifeRE does not duplicate CRM of record
7. **Life quality** — Performance Twin must respect LifeOS calendar/health signals

---

## SUCCESS TESTS

### End-state (program PASS — not yet achieved)
Adam or any pilot agent runs LifeRE as primary business OS for 30 days and confirms:
- Daily command center drives ≥80% of intentional activity
- Performance Twin answers bottleneck + next-hour questions with real data
- ≥1 closed deal or measurable pipeline advance attributable to LifeRE-tracked activity
- No unapproved outbound sends
- LifeOS life-quality signals not degraded (self-report + calendar)

### Alpha slice (current — technical only)
**FOUNDER SUCCESS TEST:** Open `/overlay/lifeos-app.html` LifeRE path; complete one daily command center cycle; confirm top-3 + nightly debrief visible.

**Acceptance:** `npm run lifeos:lifere-os:v1-acceptance` → `products/receipts/LIFERE_OS_V1_ACCEPTANCE.json`

**Status (KNOW):** `verdict: PASS`, `founder_usability_pass: false` — Point B not honestly complete.

---

## OWNED FILES (current + planned)

### Current runtime (Alpha slice — @ssot migration target: AMENDMENT_LIFERE)
| Path | Purpose |
|------|---------|
| `services/lifere-os-v1.js` | Pillar service (12 lite modules) |
| `services/lifere-boldtrail-bridge.js` | CRM read + approval write-back |
| `routes/lifere-os-routes.js` | `/api/v1/lifere/*` |
| `public/overlay/lifeos-lifere.html` | Daily command center UI |
| `public/overlay/lifeos-app.html` | LifeRE nav + Point B strip |
| `scripts/run-lifere-os-v1-acceptance.mjs` | Alpha acceptance |

### Adjacent (owned by sibling amendments — LifeRE integrates)
| Amendment | Key paths |
|-----------|-----------|
| 11 | `src/integrations/boldtrail.js`, `routes/boldtrail-routes.js`, `public/overlay/boldtrail.html` |
| 17 | `services/tc-*.js`, `routes/tc-routes.js`, `public/tc/*` |
| 08 | `core/outreach-automation.js`, `core/crm-sequence-runner.js` |
| 29 | (planned) `routes/receptionist-routes.js` |
| 15 | RE training + recruiting (server.js legacy blocks) |
| 41 | MarketingOS platform (shared module adapters) |

### Planned LifeRE-native (not built)
`services/lifere-performance-twin.js`, `services/lifere-agent-twin.js`, `services/lifere-marketing-module.js`, `services/lifere-client-comms.js`, `routes/lifere-twin-routes.js`, `db/migrations/*lifere*`

---

## CURRENT STATUS

| Layer | State | Label |
|-------|-------|-------|
| Product doctrine | **This file + packet** | KNOW — created 2026-06-13 |
| Alpha UI + API | Shipped | KNOW — acceptance PASS |
| BoldTrail bridge | Shipped | KNOW |
| Founder usability | Not confirmed | KNOW — blocker |
| Digital twins | Blueprint only | THINK — not runtime |
| MarketingModule | Doctrine only | GUESS — design in feature map |
| Performance Twin math | Doctrine only | GUESS |
| Full TC/Buyer/Seller OS in LifeRE shell | Partial via Am 17 | KNOW |

---

## NEXT BUILD ORDER (recommended — ARC input)

1. **Repointer SSOT** — `@ssot` on lifere-* → `AMENDMENT_LIFERE.md`; trim LifeRE from Am 21 product body → pointer
2. **Founder usability** — Adam PASS on LifeRE path (unblocks honest Point B)
3. **Performance Twin v0** — activity counters + funnel stages manual entry → bottleneck + next-hour API
4. **Agent Twin v0** — extend `communication-profile.js` with RE voice calibration (10-draft rating)
5. **Client Communication OS v0** — status templates (text + email) + approval queue
6. **LifeRE.MarketingModule v0** — content calendar + 5 repeatable video types + hook research job
7. **Deep BoldTrail** — webhooks, lead scoring rubric, showing feedback
8. **Receptionist + Outreach** — wire Am 29 + 08 into LifeRE lead attribution
9. **TC surface in LifeRE** — agent-facing transaction card from Am 17 portal APIs
10. **Full twin runtime** — per blueprint phases

Mission folder (Alpha machine path): `builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/` — **historical Alpha corridor**; end-state tracks this doctrine file.

---

## Agent Handoff Notes

| Field | Value |
|-------|--------|
| **Canonical product file** | `docs/products/LIFERE.md` (this file) |
| **Do not** | Treat Am 11 alone as LifeRE; treat v1 Alpha as full product |
| **Do not** | Link Voice Rail as LifeRE front door — use `/lifeos` |
| **Next agent** | Read `LIFERE_GAP_AUDIT.md` before coding; no runtime until Phase 2 receipt |
