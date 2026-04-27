# Domain: Platform Core (Cross-Cutting Infrastructure)

## What this domain does
Platform Core owns the wiring, composition, and enforcement infrastructure that all other domains depend on. This includes the Express app setup, route registration, middleware, boot sequences, scheduler registration, and the build/governance system itself.

This is NOT a feature domain. It is the operating system that features run on.

## Owned files
| File | Purpose |
|---|---|
| `server.js` | Composition root ONLY — no feature logic |
| `startup/register-runtime-routes.js` | Mounts all route files |
| `startup/boot-domains.js` | Domain initialization on boot |
| `startup/register-schedulers.js` | Cron/interval registration |
| `middleware/apply-middleware.js` | Auth, rate limiting, request tracing |
| `middleware/request-tracer.js` | UUID per request |
| `middleware/error-boundary.js` | Global error handler |
| `config/council-members.js` | AI provider configuration |
| `config/runtime-env.js` | Runtime environment normalization |
| `config/task-model-routing.js` | Task-to-model routing table |
| `scripts/council-builder-preflight.mjs` | Builder readiness check |
| `scripts/seed-epistemic-facts.mjs` | Memory system seeder |
| `scripts/record-ci-evidence.mjs` | CI → evidence bridge |
| `scripts/generate-agent-rules.mjs` | Compact rules generator |
| `scripts/generate-cold-start.mjs` | Cold-start packet generator |
| `scripts/handoff-self-test.mjs` | Handoff protocol self-test |

## Routing table — where new things go
| What you're adding | Where it goes |
|---|---|
| New API feature | `routes/<feature>-routes.js` + `services/<feature>.js` |
| Boot/startup logic | `startup/boot-domains.js` |
| Scheduler / cron | `startup/register-schedulers.js` |
| Config values | `config/<topic>.js` |
| DB migration | `db/migrations/<date>_<name>.sql` |
| Railway/env routes | `routes/railway-managed-env-routes.js` |

**server.js is a protected boundary.** Never add feature routes, service logic, inline config, or async IIFEs to server.js.

## Build system surface
- `GET /api/v1/lifeos/builder/ready` — builder readiness (commitToGitHub, council, pool)
- `GET /api/v1/lifeos/builder/domains` — list domain prompt files
- `POST /api/v1/lifeos/builder/build` — generate + syntax-check + commit
- `POST /api/v1/lifeos/builder/task` — generate only (no commit)
- `POST /api/v1/lifeos/builder/execute` — commit pre-generated output
- `POST /api/v1/lifeos/builder/review` — council code review
- `GET /api/v1/lifeos/builder/next-task` — cold-start context packet
- `GET /api/v1/lifeos/builder/history` — build audit trail
- `GET /api/v1/builder/status` — supervisor status
- `POST /api/v1/builder/run` — async supervisor run

## Builder enforcement chain (as of 2026-04-26)
1. `builder:preflight` — confirms base URL, auth, commitToGitHub, domains
2. `POST /build` → routing check (authority: allowed/watch/blocked per agent_task_authority)
3. `validateGeneratedOutputForTarget` — structure validation
4. `node --check` gate — syntax check before any JS/MJS commit (fails 422 if broken)
5. `commitToGitHub` — commit to GitHub
6. `recordAgentPerformance` — correct/partial/incorrect logged to agent_performance
7. `recordProtocolViolation` — if violation detected, logged to agent_protocol_violations

## Key rules for building in this domain
1. server.js is READ-ONLY — add a route there and you are breaking the architecture
2. Every new route file must be imported + mounted in `startup/register-runtime-routes.js`
3. Every new scheduled task must use `createUsefulWorkGuard()` — Zero-Waste rule
4. Config files are static constants only — no async operations, no DB calls
5. Middleware is composition only — no feature logic
6. Platform GAP-FILL is allowed only when builder is provably blocked (log the reason)

## Model guidance
- For middleware: pure functions that take `(req, res, next)` — no side effects beyond logging
- For startup: async init functions that take `app` and `deps` — no global state mutation
- For config: `Object.freeze()` on exports — constants only
- For scripts: standalone executables with their own pg.Pool — no shared state with server
- Prefer the smallest change that is correct — this is infrastructure, not a feature

## What NOT to touch
- Do not add feature logic to server.js, apply-middleware.js, or boot-domains.js
- Do not add routes to register-runtime-routes.js without the corresponding import
- Do not add AI calls to middleware (they must go through the council via services)
- Do not add cron jobs without `createUsefulWorkGuard()`
- Do not modify the pre-commit hook behavior without council approval

## Current known gaps
1. Builder syntax gate currently only covers .js/.mjs — HTML/SQL validation not yet wired
2. `GET /api/v1/lifeos/builder/history` endpoint exists but returns limited audit data
3. `npm run memory:seed` must be run manually after first deploy — no auto-seed on boot
4. Stale HYPOTHESIS sweep is not yet scheduled — run manually via `GET /api/v1/memory/stale-hypotheses`

## Next approved tasks
1. Add auto-seed on boot (check if epistemic_facts is empty, run seed)
2. Add SQL validation gate for `.sql` files before builder commits them
3. Add HTML validation (basic structure check) for `.html` files
4. Wire `npm run memory:ci-evidence` into `.github/workflows/smoke-test.yml`
