<!-- SYNOPSIS: THREE-ROOT CONSOLIDATION DEEP AUDIT V1 -->

# THREE-ROOT CONSOLIDATION DEEP AUDIT V1

**Agent:** Claude Sonnet 4.6
**Environment:** VSCode extension / Claude Code CLI, `/Users/adamhopkins/Projects/Lumin-LifeOS`
**Mission role:** Deep architecture audit — three-root composition consolidation
**Mode:** Auditing only — no runtime code modified
**Runtime code modification:** NO

**Status:** `AUTHORITATIVE AUDIT` — read-only; no runtime code modified
**Produced:** 2026-06-13
**Parent document:** `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`

**Files read for this audit:**
- `server.js` (1907 lines — L1–1907 searched for inline route definitions)
- `startup/register-runtime-routes.js` (full import list)
- `startup/routes/server-routes.js` (full)
- `core/two-tier-system-init.js` (full)
- `routes/command-center-routes.js` (route prefix scan)
- `routes/lifeos-command-center-routes.js` (route prefix scan)
- `package.json` (scripts)
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`

---

## 1. CURRENT THREE-ROOT ARCHITECTURE

Production Railway runs three composition roots simultaneously on the same Express `app` instance. All three execute sequentially in `server.js`'s `start()` function. All three mutate the same app object. **Express uses first-match for duplicate paths.**

```
server.js :: start() [async]
    │
    ├── applyMiddleware(app, ...) [CORS, body-parser, rate-limit, request-tracer]
    │
    ├── registerPublicRoutes(app, ...) [static + HTML overlays]
    │
    ├── registerApiV1CoreRoutes(app, ...) [health sentinel, env-check]
    │
    ├── ROOT A: registerRuntimeRoutes(app, ...) ← startup/register-runtime-routes.js
    │   78 route files. The canonical modern surface.
    │   Called at server.js ~L1003.
    │
    ├── ROOT B: registerServerRoutes(app, ...) ← startup/routes/server-routes.js
    │   14 additional routes (legacy memory, Stripe, health, ops, dev tools).
    │   Called within server.js startup block (after ROOT A).
    │
    ├── ROOT C: initializeTwoTierSystem(app, ...) ← core/two-tier-system-init.js
    │   20 additional route registrations (financial, site-builder, old C2, etc.)
    │   Also mounts 2 routes that are ALREADY in ROOT A (duplicates).
    │   Called within server.js startup block (after ROOT B).
    │
    └── INLINE: server.js direct app.* calls (6 routes)
        4 are 410 GONE tombstones.
        1 is a duplicate of ROOT B.
        1 is a diagnostic (disabled in production).
```

**Key facts:**
- Registration order: ROOT A → ROOT B → ROOT C → INLINE
- First-match wins in Express
- ROOT C contains 2 duplicate registrations against ROOT A (same route file called twice)
- INLINE contains 1 duplicate against ROOT B
- `factory-staging/server.js` is a **separate process on port 3099** — NOT in this app instance

---

## 2. EVERY ROUTE MOUNTED BY SERVER.JS INLINE

These are `app.*` calls that live directly in `server.js`, outside all startup helper files.

| Line | Method | Path | Behavior | Classification |
|------|--------|------|----------|---------------|
| L373 | `app.use` | `*` | requestTracer middleware | Infrastructure — keep |
| L375 | `app.use` | `*` | body-size/JSON parse guard | Infrastructure — keep |
| L382 | `app.use` | `*` | Cross-origin guard | Infrastructure — keep |
| L1248 | `GET` | `/api/v1/railway/env` | 410 GONE tombstone → `/api/v1/railway/managed-env` | **Tombstone** |
| L1252 | `POST` | `/api/v1/railway/env` | 410 GONE tombstone → `/api/v1/railway/managed-env` | **Tombstone** |
| L1256 | `POST` | `/api/v1/railway/env/bulk` | 410 GONE tombstone → `/api/v1/railway/managed-env/bulk` | **Tombstone** |
| L1260 | `POST` | `/api/v1/railway/deploy` | 410 GONE tombstone → `/api/v1/railway/managed-env/build-from-latest` | **Tombstone** |
| L1281 | `GET` | `/auth-check` | Auth diagnostic; hard-returns 410 in production | Diagnostic — harmless |
| L1306 | `app.use` | `*` | errorBoundary middleware (must be last) | Infrastructure — keep |
| L1907 | `GET` | `/api/v1/queue/stats` | Queue stats — **exact duplicate** of server-routes.js L232 | **Duplicate — dead code** |

**Assessment:**
- The 4 railway tombstones (L1248–L1260) exist to protect clients during the transition to `railway-managed-env-routes.js`. They return 410 status. No behavior beyond the 410.
- `/auth-check` returns 410 in production, is diagnostic-only in local.
- `/api/v1/queue/stats` at L1907 is a dead duplicate — the ROOT B copy at server-routes.js L232 is registered first and will always win.
- The middleware calls (L373, L375, L382, L1306) are infrastructure, not routes — they stay regardless.

---

## 3. EVERY ROUTE MOUNTED BY startup/register-runtime-routes.js (ROOT A)

The canonical modern product surface. 78 route files. All LifeOS phases, TC, BuilderOS, C2, memory, tokens, Voice Rail, OIL.

| Route file | Approx. prefix | Domain |
|-----------|----------------|--------|
| `website-audit-routes.js` | `/api/v1/` | Marketing/audit |
| `enhanced-council-routes.js` | `/api/v1/` | Council (**ALSO in ROOT C — duplicate**) |
| `api-cost-savings-routes.js` | `/api/v1/cost-savings`, `/api/v1/revenue/api-cost-savings`, `/api/v1/tsos/savings` | TSOS (**ALSO in ROOT C — duplicate**) |
| `idea-queue-routes.js` | `/api/v1/` | Ideas |
| `twin-routes.js` | `/api/v1/` | Digital Twin |
| `conversation-history-routes.js` | `/api/v1/` | Memory |
| `clientcare-billing-routes.js` | `/api/v1/` | ClientCare |
| `word-keeper-routes.js` | `/api/v1/` | Word Keeper |
| `autonomy-routes.js` | `/api/v1/` | Autonomy |
| `railway-managed-env-routes.js` | `/api/v1/railway/managed-env` | Railway / Deployment |
| `project-governance-routes.js` | `/api/v1/` | Governance |
| `builder-supervisor-routes.js` | `/api/v1/lifeos/builder` | BuilderOS |
| `builder-oil-audit-probe-routes.js` | `/api/v1/lifeos/builder/oil` | BuilderOS OIL |
| `capability-map-routes.js` | `/api/v1/lifeos/capability-map` | Capability Map |
| `model-performance-routes.js` | `/api/v1/` | TSOS |
| `account-manager-routes.js` | `/api/v1/` | Account Manager |
| `tc-routes.js` | `/api/v1/tc` | TC |
| `mls-routes.js` | `/api/v1/mls` | MLS |
| `lifeos-core-routes.js` | `/api/v1/lifeos` | LifeOS core |
| `lifeos-system-proof-routes.js` | `/api/v1/lifeos/system-proof` | LifeOS proof |
| `lifeos-direct-action-routes.js` | `/api/v1/lifeos/direct-action` | LifeOS direct action |
| `lifeos-engine-routes.js` | `/api/v1/lifeos/engine`, `/api/v1/lifeos/gateway` | LifeOS engine |
| `lifeos-health-routes.js` | `/api/v1/lifeos/health` | LifeOS health |
| `lifeos-family-routes.js` | `/api/v1/lifeos/family` | LifeOS family |
| `lifeos-purpose-routes.js` | `/api/v1/lifeos/purpose` | LifeOS purpose |
| `lifeos-children-routes.js` | `/api/v1/lifeos/children` | LifeOS children |
| `lifeos-vision-routes.js` | `/api/v1/lifeos/vision` | LifeOS vision |
| `lifeos-decisions-routes.js` | `/api/v1/lifeos/decisions` | LifeOS decisions |
| `lifeos-identity-routes.js` | `/api/v1/lifeos/identity` | LifeOS identity |
| `lifeos-assessment-battery-routes.js` | `/api/v1/lifeos/assessment` | LifeOS assessment |
| `lifeos-victory-vault-routes.js` | `/api/v1/lifeos/victory-vault` | LifeOS victory vault |
| `lifeos-growth-routes.js` | `/api/v1/lifeos/growth` | LifeOS growth |
| `lifeos-mediation-routes.js` | `/api/v1/lifeos/mediation` | LifeOS mediation |
| `lifeos-healing-routes.js` | `/api/v1/lifeos/healing` | LifeOS healing |
| `lifeos-legacy-routes.js` | `/api/v1/lifeos/legacy` | LifeOS legacy |
| `lifeos-emotional-routes.js` | `/api/v1/lifeos/emotional` | LifeOS emotional |
| `lifeos-ethics-routes.js` | `/api/v1/lifeos/ethics` | LifeOS ethics |
| `lifeos-conflict-routes.js` | `/api/v1/lifeos/conflict` | LifeOS conflict |
| `lifeos-finance-routes.js` | `/api/v1/lifeos/finance` | LifeOS finance |
| `lifeos-backtest-routes.js` | `/api/v1/lifeos/backtest` | LifeOS backtest |
| `lifeos-weekly-review-routes.js` | `/api/v1/lifeos/weekly-review` | LifeOS weekly review |
| `lifeos-scorecard-routes.js` | `/api/v1/lifeos/scorecard` | LifeOS scorecard |
| `lifeos-chat-routes.js` | `/api/v1/lifeos/chat` | LifeOS chat |
| `lifeos-voice-rail-routes.js` | `/api/v1/lifeos/voice-rail` | Voice Rail |
| `action-inbox-routes.js` | `/api/v1/lifeos/action-inbox` | Action Inbox |
| `lifeos-ambient-routes.js` | `/api/v1/lifeos/ambient` | LifeOS ambient |
| `lifeos-habits-routes.js` | `/api/v1/lifeos/habits` | LifeOS habits |
| `lifeos-briefing-routes.js` | `/api/v1/lifeos/briefing` | LifeOS briefing |
| `lifeos-commitment-routes.js` | `/api/v1/lifeos/commitment` | LifeOS commitments |
| `mission-routes.js` | `/api/v1/lifeos/mission` | Mission |
| `lifeos-ambient-intelligence-routes.js` | `/api/v1/lifeos/ambient-intelligence` | Ambient intelligence |
| `lifeos-cycle-routes.js` | `/api/v1/lifeos/cycle` | LifeOS cycle |
| `lifeos-auth-routes.js` | `/api/v1/lifeos/auth` | LifeOS auth |
| `lifeos-council-builder-routes.js` | `/api/v1/lifeos/builder/build`, `/api/v1/lifeos/builder/execute` | BuilderOS builder |
| `gemini-proof-routes.js` | `/api/v1/lifeos/gemini-proof` | Gemini proof |
| `oil-security-receipt-routes.js` | `/api/v1/lifeos/oil` | OIL receipts |
| `lifeos-command-center-routes.js` | `/api/v1/lifeos/command-center` | **Canonical C2 aggregate** |
| `lifeos-communication-routes.js` | `/api/v1/lifeos/communication` | LifeOS communication |
| `self-repair-executor-routes.js` | `/api/v1/lifeos/self-repair` | Self-repair |
| `autonomous-telemetry-routes.js` | `/api/v1/lifeos/autonomous-telemetry` | Autonomous telemetry |
| `canonical-admin-routes.js` | `/api/v1/lifeos/admin` | Canonical admin |
| `canonical-execution-routes.js` | `/api/v1/lifeos/execution` | Canonical execution |
| `canonical-backlog-routes.js` | `/api/v1/lifeos/backlog` | Canonical backlog |
| `canonical-system-routes.js` | `/api/v1/lifeos/system` | Canonical system |
| `tsos-efficiency-routes.js` | `/api/v1/tsos/efficiency` | TSOS efficiency |
| `lifeos-builderos-command-control-routes.js` | `/api/v1/lifeos/builderos/command-control` | BuilderOS CC |
| `lifeos-gate-change-routes.js` | `/api/v1/lifeos/gate-change` | Gate-change council |
| `deliberation-governance-routes.js` | `/api/v1/lifeos/deliberation` | Deliberation |
| `lane-intel-routes.js` | `/api/v1/lifeos/lane-intel` | Lane intel |
| `lifeos-extension-routes.js` | `/api/v1/lifeos/extension` | Extensions |
| `tokenos-routes.js` | `/api/v1/lifeos/tokens` | TokenOS |
| `token-accounting-routes.js` | `/api/v1/lifeos/token-accounting` | Token accounting |
| `operator-consumption-ledger-routes.js` | `/api/v1/lifeos/ocl` | Operator consumption |
| `builderos-control-plane-routes.js` | `/api/v1/lifeos/builder/control-plane` | BuilderOS control plane |
| `tsos-platform-kernel-routes.js` | `/api/v1/tsos/kernel` | TSOS kernel |

**Total: 78 route files** — all LifeOS, TC, MLS, BuilderOS, C2, Memory, Tokens, Voice Rail, OIL.

---

## 4. EVERY ROUTE MOUNTED BY startup/routes/server-routes.js (ROOT B)

| Method | Path | Behavior | Duplicate? |
|--------|------|----------|-----------|
| `app.use` | `/api` | Legacy memory routes (`routes/memory-routes.js`) | NO — unique legacy path |
| `app.use` | `/api/v1/memory/legacy` | Same legacy memory routes (second mount) | Duplicate of `/api` mount above |
| `POST` | `/api/stripe/webhook` | Stripe webhook handler (raw body) | NO |
| `app.use` | `/api/stripe` | Stripe routes (`routes/stripe-routes.js`) | NO |
| `GET` | `/api/v1/flags` | Feature flags | NO |
| `GET` | `/api/v1/ops/pods` | Pod manager status | NO |
| `GET` | `/api/v1/ops/telemetry` | Telemetry snapshot | NO |
| `GET` | `/api/health` | Health check (Ollama + DB + build) | **Duplicate — also in ROOT C `command-center-routes.js`** |
| `POST` | `/api/v1/stripe/sync-revenue` | Stripe revenue sync | NO |
| `GET` | `/overlay` | Overlay index.html | NO |
| `GET` | `/overlay/index.html` | Overlay index.html (same file, second path) | Duplicate of above |
| `POST` | `/api/v1/dev/commit` | Dev-only direct commit to GitHub | NO |
| `POST` | `/api/v1/system/replace-file` | Dev tool: full file replacement | NO |
| `GET` | `/healthz` | Kubernetes-style health check | NO |
| `GET` | `/api/v1/queue/stats` | Queue stats | **Duplicate — also in INLINE server.js L1907** |

**Notes:**
- `/api/v1/dev/commit` and `/api/v1/system/replace-file` are high-risk dev tools wired into the production server — they can commit to GitHub and replace arbitrary .js files. No env-gate is visible; auth gate is `requireKey` only.
- `/api` (memory routes) is a broad mount that prefixes ALL sub-paths — any future route under `/api/*` could collide with legacy memory sub-routes if they share path segments.

---

## 5. EVERY ROUTE MOUNTED BY core/two-tier-system-init.js (ROOT C)

ROOT C is the shadow bundle. 20 route registrations, 2 of which are duplicates of ROOT A.

| Registration call | Route file | Prefix | Duplicate of ROOT A? | Notes |
|---|---|---|---|---|
| `registerEnhancedCouncilRoutes(app, ...)` | `routes/enhanced-council-routes.js` | `/api/v1/` | **YES — ROOT A L132** | Double-mounted; ROOT A wins (first match) |
| `createSiteBuilderRoutes(app, ...)` | `routes/site-builder-routes.js` | `/api/v1/site-builder` | NO | Unique to ROOT C |
| `createPipelineReportRoutes(app, ...)` | `routes/site-builder-pipeline-report-routes.js` | `/api/v1/` | NO | Unique to ROOT C |
| `app.use('/api/v1/sites', createDiscoveryRoutes(...))` | `routes/site-builder-discovery-routes.js` | `/api/v1/sites` | NO | Unique to ROOT C |
| `createFinancialRoutes(app, ...)` | `routes/financial-routes.js` | `/api/v1/financial` | NO | Unique to ROOT C |
| `createBusinessRoutes(app, ...)` | `routes/business-routes.js` | `/api/v1/business` | NO | Unique to ROOT C |
| `createGameRoutes(app, ...)` | `routes/game-routes.js` | `/api/v1/games` | NO | Unique to ROOT C |
| `createVideoRoutes(app, ...)` | `routes/video-routes.js` | `/api/v1/video` | NO | Unique to ROOT C |
| `createAgentRecruitmentRoutes(app, ...)` | `routes/agent-recruitment-routes.js` | `/api/v1/agents` | NO | Unique to ROOT C |
| `createBoldTrailRoutes(app, ...)` | `routes/boldtrail-routes.js` | `/api/v1/boldtrail` | NO | Unique to ROOT C |
| `createApiCostSavingsRoutes(app, ...)` | `routes/api-cost-savings-routes.js` | `/api/v1/cost-savings`, `/api/v1/revenue/api-cost-savings`, `/api/v1/tsos/savings` | **YES — ROOT A L134** | Double-mounted; ROOT A wins (first match) |
| `createWebIntelligenceRoutes(app, ...)` | `routes/web-intelligence-routes.js` | `/api/v1/web-intelligence` | NO | Unique to ROOT C |
| `createAutoBuilderRoutes(app, ...)` | `routes/auto-builder-routes.js` | `/api/v1/system/build`, `/api/build/run` | NO | **SHADOW BUILDER PATH** |
| `createLifeCoachingRoutes(app, ...)` | `routes/life-coaching-routes.js` | `/api/v1/coaching` | NO | Unique to ROOT C |
| `createTwoTierCouncilRoutes(app, ...)` | `routes/two-tier-council-routes.js` | `/api/v1/council` | NO | Unique to ROOT C |
| `createOutreachCrmRoutes(app, ...)` | `routes/outreach-crm-routes.js` | `/api/v1/outreach` | NO | Unique to ROOT C |
| `createBillingRoutes(app, ...)` | `routes/billing-routes.js` | `/api/v1/billing` | NO | Unique to ROOT C |
| `createKnowledgeRoutes(app, ...)` | `routes/knowledge-routes.js` | `/api/v1/knowledge` | NO | Unique to ROOT C |
| `createConversationRoutes(app, ...)` | `routes/conversation-routes.js` | `/api/v1/conversations` | NO | Unique to ROOT C |
| `createCommandCenterRoutes(app, ...)` | `routes/command-center-routes.js` | `/api/v1/tasks/queue`, `/api/v1/ai/performance`, `/api/v1/admin/ai/*`, `/api/v1/reality/*`, `/api/health`, `/api/overlay/*`, `/api/v1/phone/*`, `/api/v1/projects/backlog`, `/internal/cron/*` | **NO** (paths differ from canonical C2) | **SHADOW C2 SURFACE** |

**TCO routes (registered earlier in two-tier body, before the modular block):**

| Call | Route file | Prefix | Duplicate? |
|------|-----------|--------|-----------|
| `initTCORoutes({...})` → `tcoRoutes` | `routes/tco-routes.js` | `/api/tco/*` | NO — unique to ROOT C |
| `initTCOAgentRoutes({...})` → `tcoAgentRoutes` | `routes/tco-agent-routes.js` | `/api/tco-agent/*` | NO — unique to ROOT C |

**Note on TCO:** Both `tcoRoutes` and `tcoAgentRoutes` are returned from `initTwoTierSystem()` but are not seen being `app.use`-mounted in the visible code. The `server.js` top-level imports `initTCORoutes` and `initTCOAgentRoutes` directly and also calls them from the two-tier init. **Actual mount path for TCO requires further verification** — may mount via returned objects in server.js.

---

## 6. DUPLICATE ROUTE MOUNTS

Routes registered more than once across the three roots. **In Express, first registration wins; subsequent registrations are silently ignored for matching requests but still consume memory and boot time.**

| # | Route file / path | Registered in | First wins | Second registration | Risk |
|---|---|---|---|---|---|
| D1 | `routes/enhanced-council-routes.js` | ROOT A (register-runtime-routes.js L132) | ROOT A | ROOT C (two-tier-system-init.js L254) | LOW — ROOT A wins; ROOT C mount is dead weight |
| D2 | `routes/api-cost-savings-routes.js` | ROOT A (register-runtime-routes.js L134) | ROOT A | ROOT C (two-tier-system-init.js L866) | LOW — ROOT A wins; ROOT C mount is dead weight |
| D3 | `GET /api/v1/queue/stats` | ROOT B (server-routes.js L232) | ROOT B | INLINE (server.js L1907) | LOW — ROOT B wins; INLINE is dead code |
| D4 | `GET /api/health` | ROOT B (server-routes.js L65) | ROOT B | ROOT C via `command-center-routes.js` L355 | LOW — ROOT B wins; ROOT C version is dead code |
| D5 | `app.use('/api', memoryRoutes)` + `app.use('/api/v1/memory/legacy', memoryRoutes)` | Both in ROOT B | first `/api` mount | `/api/v1/memory/legacy` mount | LOW — both reach same handler but second adds second path |

**Express first-match behavior means D1–D4 are runtime-safe today.** However:
- D1 and D2: the ROOT C mounts of these routes consume initialization time and can cause confusing log output ("routes registered") without any actual request handling
- D3: the INLINE server.js route is dead code — it will never handle a request
- D4: ROOT C's `command-center-routes.js` version of `/api/health` is dead — it never serves requests

---

## 7. SHADOW ROUTE SURFACES

Routes that exist and are mounted but operate outside SSOT governance, duplicate canonical paths functionally (not just at the file level), or expose dangerous capabilities without the governed path's protections.

| Shadow surface | File | Paths | Why shadow | Risk |
|---|---|---|---|---|
| **Old Command Center** | `routes/command-center-routes.js` (ROOT C) | `/api/v1/tasks/queue`, `/api/v1/ai/performance`, `/api/v1/admin/ai/*`, `/api/health`, `/api/overlay/*`, `/api/v1/phone/*`, `/internal/cron/*`, `/internal/autopilot/*`, `/api/v1/projects/backlog` | Parallel C2 surface; functional routes DO get served (paths don't collide with canonical C2 at `/api/v1/lifeos/command-center/`); routes like `/internal/cron/autopilot` and `/internal/autopilot/build-now` can trigger autonomous builds | **HIGH** — `/internal/autopilot/build-now` can trigger builds; no governed loop |
| **Auto-builder legacy** | `routes/auto-builder-routes.js` (ROOT C) | `POST /api/v1/system/build`, `POST /api/build/run` | Can commit + deploy without outcome verification; no DONE gate | **HIGH** |
| **Legacy memory routes** | `routes/memory-routes.js` (ROOT B via `/api` and `/api/v1/memory/legacy`) | `/api/memories/*` | Old monolithic memory; parallel to the modern `memory-intelligence-routes.js` family; broad `/api` mount can shadow other routes | **MEDIUM** |
| **Dev tools in production** | `startup/routes/server-routes.js` | `POST /api/v1/dev/commit`, `POST /api/v1/system/replace-file` | Can write arbitrary .js files and commit to GitHub; auth-gated but no env-gate; reachable in production | **MEDIUM** |
| **Legacy TCO routes** | `routes/tco-routes.js` (ROOT C via `initTCORoutes`) | `/api/tco/*` | Old TCO tracking system mounted alongside modern token-accounting-routes.js; parallel token surface | **LOW** |
| **Railway tombstones** | server.js L1248–L1260 | `/api/v1/railway/env`, `/api/v1/railway/env/bulk`, `/api/v1/railway/deploy` | 410 stubs in server.js body — compose-root boundary violation | **LOW** |

### Highest-risk shadow: `/internal/autopilot/build-now`

`routes/command-center-routes.js` contains:

```
POST /internal/autopilot/build-now  [L482]
GET  /internal/cron/autopilot       [L461]
GET  /internal/cron/factory-recovery [L414]
POST /internal/cron/factory-recovery-proof/inject [L438]
```

These routes are reachable in production (auth-gated via `requireKey` only). `POST /internal/autopilot/build-now` can trigger the legacy auto-builder cycle without any governed loop, outcome gate, or DONE gate. **This is the most dangerous active shadow surface** — it is the only HTTP-reachable path that can commit code without going through `builderos-governed-loop-executor.js`.

---

## 8. ROUTES SAFE TO MOVE

"Safe to move" means: consolidating into ROOT A (`register-runtime-routes.js`) carries zero behavioral risk. The route file is standalone, has no server-startup side effects, does not depend on two-tier-init class instances being created first, and is not a duplicate.

### From ROOT C (two-tier-system-init.js) → ROOT A

| Route file | Safe? | Rationale |
|-----------|-------|-----------|
| `routes/site-builder-routes.js` | **YES** | Pure HTTP route file; deps injected at call time; no two-tier-init class dependency that isn't available earlier |
| `routes/site-builder-pipeline-report-routes.js` | **YES** | Pool + requireKey only |
| `routes/site-builder-discovery-routes.js` | **YES** | Pool + requireKey only |
| `routes/financial-routes.js` | **YES** | Deps injectable from pool + services; no two-tier-init class required |
| `routes/business-routes.js` | **YES** | Similar to financial |
| `routes/game-routes.js` | **YES** | GamePublisher is importable independently |
| `routes/video-routes.js` | **YES** | VideoPipeline is importable independently |
| `routes/boldtrail-routes.js` | **YES** | BoldTrail service deps injectable |
| `routes/web-intelligence-routes.js` | **YES** | webScraper dep is importable independently |
| `routes/outreach-crm-routes.js` | **YES** | outreachAutomation deps injectable |
| `routes/billing-routes.js` | **YES** | Stripe deps already available at ROOT A time |
| `routes/knowledge-routes.js` | **YES** | knowledgeBase dep injectable |
| `routes/conversation-routes.js` | **YES** | conversationExtractor dep injectable |
| `routes/two-tier-council-routes.js` | **YES** | modelRouter dep injectable |
| `routes/life-coaching-routes.js` | **CONDITIONAL** | Depends on coaching service instances created in two-tier body — must verify service is available at ROOT A mount time |
| `routes/agent-recruitment-routes.js` | **CONDITIONAL** | Depends on makePhoneCall — check if Twilio is set up before two-tier |

### From ROOT B (server-routes.js) → ROOT A

| Route / registration | Safe? | Rationale |
|---|---|---|
| `POST /api/stripe/webhook` | **YES** | Express raw-body handler; no two-tier dep |
| `app.use('/api/stripe', stripeRoutes)` | **YES** | Stripe already imported at top of server.js |
| `GET /api/v1/flags` | **YES** | Feature flags; no special dep |
| `GET /api/v1/ops/pods` | **YES** | podManager dep injectable |
| `GET /api/v1/ops/telemetry` | **YES** | telemetry dep injectable |
| `GET /healthz` | **YES** | Standard health check; pool available |
| `POST /api/v1/stripe/sync-revenue` | **YES** | syncStripeRevenue injectable |
| `GET /overlay`, `GET /overlay/index.html` | **YES** — but redundant | Already served by `registerPublicRoutes()` in most configurations; verify before removing |
| `POST /api/v1/dev/commit` | **YES** (move) + **REVIEW** (retire in prod) | Dangerous dev tool; should be env-gated or retired |
| `POST /api/v1/system/replace-file` | **YES** (move) + **REVIEW** (retire in prod) | Same as above |

### From INLINE server.js → retire entirely

| Route | Action | Rationale |
|-------|--------|-----------|
| `GET /api/v1/railway/env` | Retire | 410 tombstone; canonical path is in ROOT A |
| `POST /api/v1/railway/env` | Retire | Same |
| `POST /api/v1/railway/env/bulk` | Retire | Same |
| `POST /api/v1/railway/deploy` | Retire | Same |
| `GET /auth-check` | Retire or move | 410 in production; if needed, belongs in a dev-tools route file |
| `GET /api/v1/queue/stats` (L1907) | Delete | Exact duplicate of ROOT B mount; dead code |

---

## 9. ROUTES NOT SAFE TO MOVE

Routes that cannot be safely moved without additional analysis or refactoring. Moving them now risks behavior change.

| Route / registration | Why not safe | Required before move |
|---|---|---|
| `app.use('/api', memoryRoutes)` (ROOT B) | Broad `/api` prefix; can shadow other routes; legacy consumers unknown | Audit all `/api/memories/*` callers (internal + UI); verify no `fetch('/api/*')` calls in overlay HTML files rely on legacy memory sub-paths |
| `app.use('/api/v1/memory/legacy', memoryRoutes)` (ROOT B) | Same as above; second mount | Same audit |
| `GET /api/health` (ROOT B) | Called by multiple health check scripts and monitoring; also duplicated in ROOT C — which version is actually served needs verification | Confirm ROOT B always wins (registered first); then move as part of ROOT B collapse |
| TCO routes via `initTCORoutes` + `initTCOAgentRoutes` (ROOT C) | These classes are instantiated mid-init in two-tier-system-init.js and may depend on modelRouter + pool sequences; exact mount mechanism unclear (return value vs direct app.use) | Trace exact mount call in server.js before moving |
| `routes/command-center-routes.js` (ROOT C) OLD C2 | Contains functional routes (not duplicates of canonical C2 prefix); especially `/internal/autopilot/*` and `/api/v1/projects/backlog` which may have active consumers in overlay HTML or scripts | Full consumer audit via grep across `public/overlay/`, `scripts/`, and any external clients before removing any route |
| `routes/auto-builder-routes.js` (ROOT C) | SHADOW builder path; removing it changes available build surfaces — which is GOOD, but this requires founder authorization as a product decision, not just a technical cleanup | Founder authorization (G1/shadow queue governance) |
| `routes/life-coaching-routes.js` (ROOT C) | Depends on coaching service instances (`callRecorder`, `salesTechniqueAnalyzer`, `goalTracker`, etc.) that are created inside the two-tier-init body as dynamic imports | Verify all deps are available at ROOT A mount time or extract them to a dedicated init step |

---

## 10. ROUTES THAT SHOULD BE RETIRED

Routes that should not survive consolidation — they are dead duplicates, legacy paths without active consumers, or shadow paths that should be governed-loop-only.

| Route | File | Reason | Retire method |
|-------|------|--------|---------------|
| `GET /api/v1/railway/env` (server.js L1248) | server.js inline | 410 tombstone; canonical at `/api/v1/railway/managed-env` | Delete from server.js |
| `POST /api/v1/railway/env` (server.js L1252) | server.js inline | Same | Delete from server.js |
| `POST /api/v1/railway/env/bulk` (server.js L1256) | server.js inline | Same | Delete from server.js |
| `POST /api/v1/railway/deploy` (server.js L1260) | server.js inline | Same | Delete from server.js |
| `GET /api/v1/queue/stats` (server.js L1907) | server.js inline | Exact duplicate; dead | Delete from server.js |
| `GET /api/health` (command-center-routes.js L355) | ROOT C old CC | Dead duplicate of ROOT B; never serves requests | Remove from command-center-routes.js |
| `enhanced-council-routes.js` mount in two-tier | ROOT C | Dead duplicate of ROOT A; never serves requests | Remove from two-tier-system-init.js |
| `api-cost-savings-routes.js` mount in two-tier | ROOT C | Dead duplicate of ROOT A; never serves requests | Remove from two-tier-system-init.js |
| `app.use('/api/v1/memory/legacy', memoryRoutes)` (server-routes.js L31) | ROOT B | Second mount of same routes; functionally redundant | Remove second mount after audit |
| `GET /overlay` + `GET /overlay/index.html` (server-routes.js L125–130) | ROOT B | Served by `registerPublicRoutes()` already | Verify then remove |
| `POST /api/v1/system/build` (auto-builder-routes.js) | ROOT C | Shadow builder path; can commit without outcome gate | Retire with founder authorization |
| `POST /api/build/run` (auto-builder-routes.js) | ROOT C | Same | Same |
| `/internal/autopilot/build-now` (command-center-routes.js L482) | ROOT C | Can trigger builds without governed loop; highest-risk shadow | Retire as part of old-CC cleanup |

---

## 11. EXACT NO-RUNTIME-CHANGE CONSOLIDATION SEQUENCE

Ordered by risk (lowest first). Each step is independently deployable. **No step modifies product behavior.**

### PHASE 0 — Pure dead-code removal in server.js (zero-risk)

These are dead code by definition (duplicates; 410 stubs). No behavior change possible.

**Step 0.1:** Delete `GET /api/v1/queue/stats` from server.js inline (L1907).
- Why safe: ROOT B already handles this path first; this line never serves a request.
- Verify: grep for `/api/v1/queue/stats` — confirm it's also in server-routes.js.

**Step 0.2:** Delete 4 railway tombstone routes from server.js (L1248–L1260).
- Why safe: All return 410; they have no implementation. The canonical Railway env routes are in ROOT A.
- Note: The `legacyRailwayControlDisabled` helper function at the top of that block can also be deleted.

**Step 0.3:** Delete `/auth-check` from server.js (L1281).
- Why safe: Returns 410 in production. In local dev it's a diagnostic. Can live in a dev-routes.js file if needed later.
- Or: Leave it and move to ROOT B in a later phase. Either is low-risk.

### PHASE 1 — Remove dead duplicates from ROOT C (zero-risk)

**Step 1.1:** Remove `registerEnhancedCouncilRoutes` call from two-tier-system-init.js (L254).
- Why safe: ROOT A already mounted this file first; ROOT C's call never handles a request. Removing it only eliminates dead initialization.
- Verify: `GET /api/v1/enhanced-council/*` still works after removing ROOT C call.

**Step 1.2:** Remove `createApiCostSavingsRoutes` call from two-tier-system-init.js (L866).
- Why safe: Same logic as Step 1.1; ROOT A mounted first.
- Verify: `GET /api/v1/cost-savings/*` still works.

**Step 1.3:** Remove `import` statements for the two removed routes from two-tier-system-init.js.
- `import { registerEnhancedCouncilRoutes } from '../routes/enhanced-council-routes.js';`
- `import { createApiCostSavingsRoutes } from '../routes/api-cost-savings-routes.js';`
- Why safe: These files are still imported in ROOT A; removing the import in two-tier has no runtime effect.

### PHASE 2 — Remove dead duplicate from ROOT B (zero-risk)

**Step 2.1:** Remove `app.use('/api/v1/memory/legacy', memoryRoutes(...))` from server-routes.js (L31).
- Why safe: The `/api` mount immediately above at L30 already covers these same routes.
- Verify: `GET /api/v1/memory/legacy/memories/context/prompt` still returns same response (via `/api` mount).

**Step 2.2:** Remove dead `/api/health` from command-center-routes.js (L354–360).
- Why safe: ROOT B registers `/api/health` first; this route never handles a request.
- Verify: `GET /api/health` still returns health JSON.

### PHASE 3 — Move safe ROOT C routes into ROOT A (low-risk)

**One route file at a time.** Each move: add import to register-runtime-routes.js, add call, remove from two-tier-system-init.js, deploy, smoke-test.

Recommended order (safest first):

1. `routes/site-builder-pipeline-report-routes.js` (pool + requireKey only)
2. `routes/site-builder-discovery-routes.js` (pool + requireKey only)
3. `routes/billing-routes.js` (Stripe injectable from ROOT A context)
4. `routes/financial-routes.js`
5. `routes/business-routes.js`
6. `routes/game-routes.js`
7. `routes/video-routes.js`
8. `routes/web-intelligence-routes.js`
9. `routes/boldtrail-routes.js`
10. `routes/outreach-crm-routes.js`
11. `routes/knowledge-routes.js`
12. `routes/conversation-routes.js`
13. `routes/two-tier-council-routes.js`
14. `routes/site-builder-routes.js` (outreachAutomation dep — verify available)

**Site builder special case:** `createSiteBuilderRoutes` takes `outreachAutomation` which is created inside two-tier-init. Moving requires either (a) creating `outreachAutomation` before the two-tier block, or (b) accepting `null` with a guard. Audit `routes/site-builder-routes.js` for how it uses `outreachAutomation` before moving.

### PHASE 4 — Handle old command-center-routes.js (medium-risk)

This cannot be moved to ROOT A — it needs to be **retired**, not moved. Its canonical replacements are already in ROOT A.

**Step 4.1:** Audit every path in `routes/command-center-routes.js` against ROOT A's canonical paths. Paths that have NO ROOT A equivalent must be migrated first.

Routes in old CC with **no ROOT A equivalent** (require migration before retirement):
- `GET /api/v1/tasks/queue` — no canonical task-queue endpoint in ROOT A
- `GET /api/v1/ai/performance` — model-performance-routes.js is in ROOT A but path may differ
- `POST /api/v1/ai/self-evaluate` — no clear ROOT A equivalent
- `GET /api/v1/user/simulation/accuracy` — no ROOT A equivalent
- `GET /internal/cron/factory-recovery` — may be dead; verify
- `POST /internal/cron/factory-recovery-proof/inject` — may be dead; verify
- `GET /internal/cron/autopilot` — may be dead; verify
- `POST /internal/autopilot/build-now` — **shadow builder; retire, do not migrate**
- `GET /api/v1/projects/backlog`, `POST /api/v1/projects/backlog`, etc. — canonical-backlog-routes.js is in ROOT A; verify paths match

**Step 4.2:** For each unique path in old CC, either (a) confirm the canonical ROOT A route handles it, or (b) add the path to a new canonical route file.

**Step 4.3:** After all paths are either covered in ROOT A or confirmed dead: remove `createCommandCenterRoutes` import and call from two-tier-system-init.js.

### PHASE 5 — Handle auto-builder-routes.js (founder authorization required)

`POST /api/v1/system/build` and `POST /api/build/run` are shadow builder paths that bypass the governed loop. Retiring them is a product governance decision per Gap G1, not a technical cleanup.

**Requires:** Founder authorization that the shadow builder paths should be permanently retired and that all build triggers must go through `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute` or `POST /api/v1/lifeos/builder/build`.

### PHASE 6 — Collapse ROOT B into ROOT A (low-risk, after Phase 3–4 complete)

Once two-tier-system-init.js is cleaned up and server-routes.js has been audited:
- Move Stripe webhook + routes, health routes, flags, ops/telemetry, queue/stats into register-runtime-routes.js
- Move or retire dev-tools routes (dev/commit, system/replace-file) — if kept, they need an env-gate (`if (process.env.NODE_ENV !== 'production')`)
- Delete server-routes.js file
- Remove `registerServerRoutes` call and import from server.js

### PHASE 7 — Clean up server.js itself (final)

After Phases 0–6, the only things remaining in server.js should be:
- Imports
- Pool + app + HTTP server creation
- `applyMiddleware()`
- `registerPublicRoutes()`
- `registerApiV1CoreRoutes()`
- `registerRuntimeRoutes()` ← the single canonical root
- `bootAllDomains()`
- `app.listen()`

Two-tier-system-init.js should be deleted or converted to a pure service-initialization file (no route mounting).

---

## 12. TEST PLAN

For each consolidation phase, the following checks apply.

### Smoke tests (run after every step)

```bash
# Route presence check
node --check server.js
node scripts/council-builder-preflight.mjs

# Health endpoints
curl -s http://localhost:PORT/healthz | jq .status
curl -s http://localhost:PORT/api/health | jq .ok
curl -s -H "x-command-key: $KEY" http://localhost:PORT/api/v1/lifeos/system/health | jq .ok

# ROOT A canonical routes
curl -s -H "x-command-key: $KEY" http://localhost:PORT/api/v1/lifeos/builder/ready | jq .ok
curl -s -H "x-command-key: $KEY" http://localhost:PORT/api/v1/lifeos/command-center/proof-freshness | jq .ok
curl -s -H "x-command-key: $KEY" http://localhost:PORT/api/v1/lifeos/action-inbox/ | jq .

# TSOS routes (moved from ROOT C)
curl -s -H "x-command-key: $KEY" http://localhost:PORT/api/v1/cost-savings/dashboard/test | jq .

# BuilderOS CI
node scripts/verify-bp-priority-guardrails.mjs
```

### Phase-specific tests

| Phase | Tests |
|-------|-------|
| Phase 0 | `GET /api/v1/queue/stats` still responds; `GET /api/v1/railway/env` returns 410 (via ROOT A managed-env redirect) |
| Phase 1 | `GET /api/v1/enhanced-council/*` still serves from ROOT A; `GET /api/v1/cost-savings/*` still serves from ROOT A |
| Phase 2 | `GET /api/memories/context/prompt` still returns memory context; `GET /api/health` returns health JSON |
| Phase 3 | For each moved route, hit 1 endpoint before and 1 after; confirm same response |
| Phase 4 | Grep `public/overlay/` for every old CC path; confirm no HTML file calls retired paths |
| Phase 5 | `POST /api/v1/system/build` should 404 after retirement; no regression in governed loop path |
| Phase 6 | Stripe webhook test; `POST /api/stripe/webhook` with test signature |
| Phase 7 | Full smoke suite + `node --check server.js` + `npm test` |

### Regression risk areas

| Area | Risk | Mitigation |
|------|------|-----------|
| Overlay HTML files | May hardcode old CC paths (`/api/v1/tasks/queue`, `/api/overlay/*`) | Grep `public/overlay/*.html` for every old CC path before Phase 4 |
| `scripts/` directory | Some scripts may call old paths directly | Grep `scripts/` for old CC paths |
| Memory legacy routes | `/api` broad mount may shadow future routes | Audit after Phase 2 |
| TCO routes | `initTCORoutes` mount mechanism unclear | Confirm exact mount before Phase 6 |

---

## 13. ROLLBACK PLAN

Since no steps modify behavior (only registration source changes), every phase rollback is:
1. Revert the specific file change (`git revert` or `git checkout <file>`)
2. Deploy
3. Smoke test

**For Phase 0 (server.js inline removals):**
- Git revert server.js changes; redeploy; confirm 410 stubs return
- Risk: zero — only removing dead code

**For Phases 1–2 (removing ROOT C/B dead duplicates):**
- Git revert two-tier-system-init.js or server-routes.js; redeploy
- Risk: zero — the removed mounts were dead (ROOT A handled all requests first)

**For Phase 3 (moving ROOT C routes to ROOT A):**
- Git revert register-runtime-routes.js and two-tier-system-init.js changes
- Redeploy
- All routes revert to ROOT C mount; behavior identical (same route files, same handlers)

**For Phase 4 (old CC retirement):**
- Git revert two-tier-system-init.js; redeploy
- Old CC paths re-appear; canonical ROOT A paths unaffected

**For Phase 5 (auto-builder retirement):**
- Git revert two-tier-system-init.js; redeploy
- Shadow builder paths re-appear

**General principle:** Every step in this sequence is reversible with a single git revert + redeploy. No database migrations, no external state changes, no contract changes.

---

## 14. FIRST SAFE IMPLEMENTATION SLICE

The smallest possible change that proves the consolidation approach works, is safe to merge and deploy, and unblocks the rest of the sequence.

### Slice 1-A: Two dead-code deletions in server.js

**Files changed:** `server.js` only (2 edits)

**Change 1:** Delete `GET /api/v1/queue/stats` at L1907 and the `legacyRailwayControlDisabled` helper + 4 railway tombstone stubs (L1240–L1270 approximate).

**Change 2:** Remove the dead `legacyRailwayControlDisabled` function definition that only serves the tombstones.

**Risk:** ZERO — removing dead code that never handles a request.

**Proof:** Before deletion: `curl /api/v1/queue/stats` — confirm responds. After deletion: same `curl` — same response (now served by ROOT B server-routes.js L232).

**Commit message template:**
```
GAP-FILL: remove server.js inline railway tombstones + dead queue-stats duplicate

Removes 5 inline route definitions from server.js that violate the composition-root-only boundary:
  - 4 railway env/deploy routes (L1248–1260) — return 410 GONE; canonical path is in ROOT A
  - /api/v1/queue/stats (L1907) — exact duplicate of server-routes.js L232 (dead code; ROOT B wins first match)

No behavior change. First step in THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1.md Phase 0.
```

### Slice 1-B: Remove two dead ROOT C duplicate mounts

**Files changed:** `core/two-tier-system-init.js` only (2 call deletions + 2 import deletions)

**Change:** Remove `registerEnhancedCouncilRoutes(app, ...)` call (L254) and `createApiCostSavingsRoutes(app, ...)` call (L866) plus their import statements (L10, L26).

**Risk:** ZERO — ROOT A already handles these; ROOT C never serves a request for these paths.

**Proof:** Before: `curl /api/v1/cost-savings/register` — works. After: same — works (ROOT A serving it now exclusively).

---

## SUMMARY FINDINGS

### Highest-risk duplicate root

**ROOT C (two-tier-system-init.js)** is the highest-risk composition root. It:
1. Mounts the old `command-center-routes.js` which contains `/internal/autopilot/build-now` — an HTTP-reachable path that can trigger code commits without going through the governed loop
2. Mounts the legacy `auto-builder-routes.js` (`POST /api/v1/system/build`) — another ungoverned commit path
3. Contains 2 dead duplicate mounts (enhanced-council, api-cost-savings)
4. Requires the full two-tier-init ceremony (dynamic imports of 10+ modules, class instantiation, etc.) before any of its routes are available — the longest boot path

### Safest first consolidation step

**Phase 0, Step 0.1:** Delete `GET /api/v1/queue/stats` from server.js L1907. Zero behavior change. One line of dead code removed. Proves the consolidation process.

Followed immediately by **Phase 0, Step 0.2:** Delete the 4 railway tombstone routes (L1248–L1260) from server.js. Same risk level. Removes compose-root boundary violation.

### Routes safe to move (summary)

From ROOT C to ROOT A (no dep issues):
`site-builder-pipeline-report-routes.js`, `site-builder-discovery-routes.js`, `financial-routes.js`, `business-routes.js`, `game-routes.js`, `video-routes.js`, `boldtrail-routes.js`, `web-intelligence-routes.js`, `outreach-crm-routes.js`, `billing-routes.js`, `knowledge-routes.js`, `conversation-routes.js`, `two-tier-council-routes.js`

From ROOT B to ROOT A:
Stripe webhook + routes, `/api/v1/flags`, `/api/v1/ops/pods`, `/api/v1/ops/telemetry`, `/healthz`, `/api/v1/stripe/sync-revenue`

### Routes not safe to move (summary)

- `app.use('/api', memoryRoutes)` — broad mount; consumer audit required
- `GET /api/health` — confirm ROOT B wins first before moving
- `routes/life-coaching-routes.js` — two-tier class deps; verify availability
- `routes/command-center-routes.js` (old CC) — has unique paths that need migration before retirement, especially `/api/v1/projects/backlog` and `/internal/cron/*`
- TCO routes — mount mechanism unclear; trace before moving
- `routes/auto-builder-routes.js` — requires founder authorization

---

*No runtime code was modified in the production of this document.*
*First safe implementation slice requires changes to `server.js` and `core/two-tier-system-init.js` only.*
*All changes are reversible with `git revert`.*
