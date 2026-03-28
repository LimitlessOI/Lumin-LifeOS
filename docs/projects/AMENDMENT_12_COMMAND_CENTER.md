# AMENDMENT 12 — Command & Control Center

> **Y-STATEMENT:** In the context of a multi-feature AI platform that is growing rapidly,
> facing the need for one unified control surface for operations, monitoring, and decisions,
> we decided to build a browser-based Command & Control portal to achieve full operational
> visibility without context-switching, accepting that the portal is a dependency — if it
> breaks, operational visibility breaks too.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` |
| **Stability** | `needs-review` |
| **Last Updated** | 2026-03-28 |
| **Verification Command** | `node scripts/verify-project.mjs --project command_center` |
| **Manifest** | `docs/projects/AMENDMENT_12_COMMAND_CENTER.manifest.json` |

---

## Mission
Give Adam one browser tab to see everything, control everything, and act on anything — without leaving current context. The Command Center is the conductor's podium.

## North Star Anchor
Autonomy Amplifier — every feature in the system is only useful if Adam can see and control it. The C&C is the bridge between system capability and human direction.

---

## Scope / Non-Scope

**In scope:**
- The command center web portal and all its panels
- API routes that serve C&C data (`/api/v1/admin/*`, `/api/v1/reality/*`, `/api/v1/projects`, `/api/v1/pending-adam`)
- Auth middleware for the portal key
- The browser overlay (HUD that floats over any site)

**Out of scope:**
- AI model routing logic (→ AMENDMENT_01)
- TC transaction logic (→ AMENDMENT_17)
- Revenue tracking (→ AMENDMENT_03)
- The actual AI council workers (→ AMENDMENT_01)

---

## Owned Files
```
routes/command-center-routes.js
public/overlay/command-center.html
public/overlay/command-center.js
public/overlay/index.html
public/shared/lifeos-voice-chat.js
```

## Protected Files (read-only for this project)
```
server.js                        — composition root, import + mount only
src/server/auth/requireKey.js    — security boundary, do not modify logic
services/ai-guard.js             — AI safety layer, treat with care
```

---

## Design Spec

### Data Model
This project reads from many tables but owns none directly.
The new governance tables (projects, project_segments, pending_adam, estimation_log)
are owned by AMENDMENT_18 and read by this project's dashboard panels.

### API Surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Health check for uptime monitors |
| GET | `/api/v1/admin/ai/status` | requireKey | AI on/off + reason |
| POST | `/api/v1/admin/ai/enable` | requireKey | Enable AI |
| POST | `/api/v1/admin/ai/disable` | requireKey | Disable AI |
| GET | `/api/v1/reality/snapshot` | requireKey | Route hash snapshot |
| POST | `/api/v1/chat` | requireKey | Main AI chat endpoint |
| GET | `/api/v1/projects` | requireKey | Projects dashboard data |
| GET | `/api/v1/projects/:id` | requireKey | Full project detail |
| GET | `/api/v1/pending-adam` | requireKey | Items waiting on Adam |
| POST | `/api/v1/pending-adam/:id/resolve` | requireKey | Resolve pending item |

### UI Surface
- **Chat panel** — multi-mode AI chat with council member selection, browser voice input, and optional spoken replies
- **System Health panel** — live status, uptime, AI enabled state
- **Ideas Queue panel** — pending/approved/building ideas
- **AI Safety Controls panel** — kill switch, HAB status
- **Conversation History panel** — searchable past sessions
- **Improvement Proposals panel** — AI-generated suggestions
- **Tools Status panel** — which providers are live
- **Projects Dashboard panel** — active projects with hover + click
- **Pending Adam panel** — items blocked on Adam
- **Free Cloud Providers panel** — free tier usage status
- **Builder Control Panel** ← NEW — running/paused state badge; Run Now / Dry Run / Pause / Resume buttons; 4 stat cards (Safe & Ready, In Progress, Needs Review, Blocked); last run results; queue detail table; Adam Decision Accuracy section

### External Dependencies
| Dependency | Env Var | Required? |
|---|---|---|
| Neon DB | `DATABASE_URL` | Yes |
| Auth key | `COMMAND_CENTER_KEY` | Yes |
| Any AI provider | Various | Yes (for chat) |

---

## Build Plan

- [x] **Extract routes to command-center-routes.js** *(est: 2h \| actual: 2h)* `[safe]`
- [x] **Fix REALITY_MISMATCH 409 on chat** *(est: 1h \| actual: 0.5h)* `[needs-review]`
- [x] **Fix System Health red X (auth on health check)** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Fix Ideas Queue showing 0 (COALESCE fix)** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Add AI Safety Controls endpoints** *(est: 1h \| actual: 1h)* `[safe]`
- [x] **Add Reality snapshot endpoint** *(est: 0.5h \| actual: 0.5h)* `[safe]`
- [x] **Fix key mismatch (Key2026LifeOSLimitlessOS! with !)** *(est: 0.5h \| actual: 1h)* `[safe]`
- [x] **Builder Control Panel** — running/paused badge, Run Now/Dry Run/Pause/Resume, 4 stat cards, last run results, queue detail, Adam accuracy section *(est: 4h | actual: 3h)* `[needs-review]`
- [x] **Operator Chat voice input and spoken replies** *(est: 2h | actual: 2h)* `[safe]`
- [ ] **→ NEXT: Projects Dashboard panel drill-down** — hover tooltip + click drawer with build plan, estimates, verification status *(est: 4h)* `[needs-review]`
- [ ] **Pending Adam panel** — priority-sorted, type badges, one-click resolve *(est: 2h)* `[safe]`
- [ ] **Mobile-responsive layout** *(est: 3h)* `[safe]`
- [ ] **Role-based access (admin vs client vs agent views)** *(est: 6h)* `[high-risk]`
- [ ] **Site Builder UI panel** *(est: 4h)* `[needs-review]`

**Progress:** 8/13 steps complete | Est. remaining: ~19h

---

## Anti-Drift Assertions
```bash
# Auth works
curl -s https://$RAILWAY_URL/api/health | grep -q '"status":"OK"'

# Chat responds
curl -s -X POST https://$RAILWAY_URL/api/v1/chat \
  -H "x-command-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping","sessionId":"test"}' | grep -q '"ok":true'

# AI status endpoint exists
curl -s https://$RAILWAY_URL/api/v1/admin/ai/status \
  -H "x-command-key: $COMMAND_CENTER_KEY" | grep -q '"aiEnabled"'

# Syntax clean
node --check routes/command-center-routes.js
node --check public/overlay/command-center.js
```

*Automated: `node scripts/verify-project.mjs --project command_center`*

---

## Decision Log

### Decision: Lazy reality hash capture — 2026-03-27
> **Y-Statement:** In the context of server startup order, facing the fact that
> configureAiGuard() is called at line 443 before routes are registered at line 1071+,
> we decided to capture the route hash lazily (on first guarded request) to achieve
> a consistent hash that includes all routes, accepting a tiny overhead on the first request.

**Alternatives rejected:**
- *Capture at startup* — rejected: caused every chat to return 409 REALITY_MISMATCH
- *Remove the reality check entirely* — rejected: it's a legitimate safety feature

**Reversibility:** `two-way-door`

### Decision: Single key for all C&C auth — 2026-03-13
> **Y-Statement:** In the context of a single-user system, facing the need for
> simple-but-real security, we decided to use a single static key (COMMAND_CENTER_KEY)
> to achieve low-friction auth, accepting that key rotation requires a Railway redeploy.

**Alternatives rejected:**
- *JWT tokens* — over-engineered for single-user
- *No auth* — rejected: production system with real data

---

## Why Not Other Approaches
| Approach | Why We Didn't Use It |
|---|---|
| Separate frontend app (React/Next) | Over-engineered for current scale; vanilla JS + Railway is faster to iterate |
| WebSocket-only architecture | HTTP + WS hybrid gives better caching and simpler debugging |
| Per-feature auth tokens | Key sprawl for a single-user system; one key is sufficient |

---

## Test Criteria
- [ ] Chat returns `{ ok: true, response: "..." }` with valid key
- [ ] Chat returns 401 without key
- [ ] `/api/health` returns 200 with no auth (uptime monitors)
- [ ] `/api/v1/admin/ai/status` shows current AI enabled state
- [ ] Projects panel renders with real data on page load
- [ ] Hover on project card shows tooltip with focus + last worked
- [ ] Click on project card opens drawer with full details
- [ ] Pending Adam panel shows count badge and items sorted by priority
- [ ] Resolving a pending item removes it from the list

---

## Handoff (Fresh AI Context)
**Current blocker:** None

**Last decision:** Lazy reality hash capture — fixes REALITY_MISMATCH 409 on all chat requests

**Do NOT change:**
- `ai-guard.js`: do NOT call `ensureExpectedRealityHash()` inside `configureAiGuard()` — it captures the hash before routes are registered, causing every chat to fail with 409
- `requireKey.js`: do not change the header alias list — `x-command-key` must remain supported
- `/api/health`: must remain unauthenticated — uptime monitors depend on it

**Read first:** `routes/command-center-routes.js`, `public/overlay/command-center.js`, `services/ai-guard.js`

**Known traps:**
- The key is `Key2026LifeOSLimitlessOS!` — the `!` is part of the key and must be included
- `saveKey()` in command-center.js writes to 3 localStorage keys — this is intentional for compatibility

---

## Runbook (Operations)

| Symptom | Likely Cause | Fix |
|---|---|---|
| 401 on all requests | Key mismatch | Check COMMAND_CENTER_KEY in Railway; key must include `!` |
| 409 REALITY_MISMATCH on chat | ensureExpectedRealityHash called at wrong time | Check ai-guard.js — lazy init must be preserved |
| System Health red X | /api/health using unauthenticated fetch | Ensure fetchCommandJson (not fetchJson) is used for /api/health |
| Ideas Queue shows 0 | build_priority column null, ORDER BY fails | COALESCE(build_priority, 0) must be in ORDER BY |
| Railway redeploy loop | SIGTERM in logs | Normal — Railway restarts containers on redeploy, not a crash |

---

## Decision Debt
- [x] ~~LIFEOS_OPEN_ACCESS was set for testing — removed from Railway~~ ✅
- [ ] **Goal tracking UI is partial** — deferred until C&C is stable enough for feature work
- [ ] **Site Builder UI not built** — waiting on C&C stability

---

## Change Receipts

| Date | What Changed | Why | Amendment | Manifest | Verified |
|---|---|---|---|---|---|
| 2026-03-27 | Lazy reality hash, health auth fix, ideas COALESCE | Fix chat 409, health red X, empty ideas list | ✅ | ✅ | pending |
| 2026-03-27 | Projects Dashboard + Pending Adam panels added | SSOT governance build | ✅ | ✅ | pending |
| 2026-03-27 | Builder Control Panel added to command-center.html | Surface builder supervisor state, controls, Adam accuracy | ✅ | ✅ | pending |
| 2026-03-28 | Added shared browser voice controls to Operator Chat | Give C&C hands-free dictation and optional spoken replies without changing chat routing | ✅ | ✅ | pending |
| 2026-03-28 | Added env-registry health panel to Secrets Vault | Make build-time env awareness visible in Command Center so builders/operators can see what exists, what is missing, and what blocks revenue without exposing secret values | ✅ | pending | pending |
| 2026-03-13 | Initial extraction from server.js | server.js refactor | ✅ | n/a | n/a |

---

## Pre-Build Readiness

**Status:** BUILD_READY
**Adaptability Score:** 80/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] All panels documented with specific UI descriptions
- [x] API surface fully defined — 10 endpoints with methods, paths, auth requirements
- [x] Owned files explicitly listed; protected files explicitly called out
- [x] Decision log documents key architectural choices with Y-statements
- [x] Anti-drift assertions are runnable bash commands, not prose
- [ ] Role-based access (admin vs client vs agent) not yet specified to implementation level — marked `[high-risk]` in build plan
- [ ] Mobile-responsive layout not yet designed — screen breakpoints not defined

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Retool | Powerful internal tool builder, wide integrations | Requires building every panel from scratch, no AI council integration, $10/user/mo | Our C&C is purpose-built for a multi-AI-model OS — it reads AI routing decisions, kill switches, and savings data in one view |
| Linear | Beautiful project management, developer-focused | No AI cost monitoring, no real-time system health, no council kill switch | We surface AI operational health (spend, model status, kill switch) alongside project tracking |
| Notion as Ops Dashboard | Flexible, familiar, widely used | No live data, no AI integration, no system control — read-only reporting at best | Our Command Center executes actions (enable AI, resolve pending items, deploy) — it is a control surface, not a document |
| Railway Dashboard (native) | Native deployment control | No business metrics, no AI council visibility, no custom panels | We extend Railway visibility with business context — revenue, ideas queue, and AI safety — in one browser tab |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Single static key (`COMMAND_CENTER_KEY`) becomes a security liability at multi-user scale | HIGH (if white-label is enabled) | High — one leaked key = full admin access | Mitigate: role-based access build is already in the build plan; must complete before white-label clients use C&C |
| Command Center becomes a bottleneck — every new feature needs a panel | Medium | Medium — slower feature delivery | Mitigate: panel system must be component-based so new panels are added without touching existing HTML |
| WebSocket connection drops and panels show stale data | Medium | Medium — operator makes decisions on stale state | Mitigate: add reconnect logic + stale data indicator to all live panels |
| Browser overlay breaks on certain Chrome versions | Low | Low — fallback to full-page URL | Accept: overlay is enhancement, not requirement; full command-center.html always accessible |

### Gate 4 — Adaptability Strategy
New panels attach without modifying existing panels — each panel is a self-contained JS block that reads from its own API endpoint. If a competitor ships a better system health visualization, we add a new panel file and a `<script>` import. The API surface uses standard JSON over HTTP — any frontend (React, Vue, or a future mobile app) can consume the same endpoints without backend changes. Score: 80/100 — the panel architecture is well-isolated; the missing component system for panels (currently each panel is inline HTML) is the gap.

### Gate 5 — How We Beat Them
While Retool and Notion require hours of configuration to surface operational data, the LifeOS Command Center is the only control surface that shows AI model routing decisions, free-tier spend headroom, council kill switch state, and project governance — all specific to this system — because it was built with that data in mind from day one.
