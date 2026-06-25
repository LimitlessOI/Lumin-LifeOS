<!-- SYNOPSIS: Governance / NSSOT / founder packet -->

# Governance / NSSOT / founder packet

**Session:** `48f2917e-ff58-4594-b72a-57a005b6ff33` · **Archived:** 2026-03-15  
**Source:** `docs/conversation_dumps/raw/cursor-48f2917e-ff58-4594-b72a-57a005b6ff33.jsonl`  
**Pairs in this bucket:** 1

---

## Exchange 5

**Adam / operator:**

what will it take to get it to a 10

**Assistant:**

Here’s what it would take to move the system from **6.5 toward a 10** — as a concrete roadmap, not a promise that 10 is easy or quick.

---

# Roadmap: 6.5 → 10

A **10** means: the system is **safe to change**, **easy to operate**, and **aligned with your constitution** in practice, not just on paper. Below is what’s missing and what to do.

---

## 1. Architecture & codebase health (must-have for 10)

**Current:** One 2,100+ line `server.js`, optional subsystems, legacy files.

**Target:**

- **Split `server.js` into a thin bootstrap + modules**
  - `server.js`: load config, create app, attach middleware, call `registerRoutes(app)`, start server (ideally &lt;200 lines).
  - `src/app.js` or `routes/index.js`: central route registration that imports and mounts all route modules.
  - Optional: one small “subsystems” module that wires council, TCO, queue, autonomy, etc., so `server.js` stays about wiring, not feature logic.
- **Remove or fix dead/dangerous code**
  - `core/database.js`: either delete it and use only `services/db.js` + `db/index.js` + Drizzle, or replace the placeholder SQL with real schema/bootstrap and a single, documented DB entrypoint.
- **Single source of truth for schema**
  - All tables created only via Drizzle migrations (or one documented migration runner). No ad‑hoc `CREATE TABLE` in app code. `db/schema.js` + `db/migrations/` are the only place schema is defined and applied.

**Outcome:** New contributors (and you in 6 months) can understand startup and data model in minutes; changes rarely break unrelated features.

---

## 2. Testing & CI (must-have for 10)

**Current:** `npm test` runs 2 files; many tests in `tests/` not clearly part of CI.

**Target:**

- **One test command that runs the real suite**
  - e.g. `npm test` → run all tests under `tests/` (or a clearly documented subset) with a single runner (e.g. `node --test 'tests/**/*.test.js'` or your current pattern). No “integration tests not yet implemented” in the main script.
- **CI runs that suite on every push/PR**
  - GitHub Actions (or equivalent): install deps, run migrations (or use a test DB URL), run `npm test`, optionally smoke against a started server. Fail the build on test failure.
- **Smoke test as a gate**
  - Smoke test runs in CI against a real (or test) server; required for merge. Optionally run after deploy as a sanity check.
- **Stability**
  - Fix or remove flaky tests; document any tests that are allowed to skip in CI and why.

**Outcome:** No merge or deploy without automated verification; regressions are caught before production.

---

## 3. Security & auth (must-have for 10)

**Current:** `requireKey` on some routes; env validation; rate limits. Gaps unclear.

**Target:**

- **Explicit auth model**
  - Document which routes are public, which require `requireKey` (or other auth), and how keys are passed (header name, etc.). One place (e.g. `docs/API.md` or `SSOT_COMPANION`) that lists protected routes.
- **No sensitive routes without protection**
  - Audit every route that touches money, secrets, or destructive actions; ensure they use `requireKey` (or stronger auth). Add tests that unauthenticated requests to those routes get 401/403.
- **Secrets hygiene**
  - No secrets in repo or in logs. Env validator and startup checks ensure required secrets exist; optional ones are clearly “feature X disabled”.
- **Rate limits and CORS**
  - All public API routes behind a reasonable global rate limit; AI/heavy routes behind stricter limits. CORS allowlist only; no wildcard in production.

**Outcome:** A security-minded reviewer can see exactly what’s protected and how; no “maybe we forgot a route.”

---

## 4. Operations & observability (must-have for 10)

**Current:** Health endpoint, logging; no single place describing how to run and what to check.

**Target:**

- **Runbook**
  - One doc (e.g. `docs/RUNBOOK.md`): how to start locally and in production, required env vars, how to run migrations, how to roll back a deploy, where logs live, how to confirm DB and external services (Stripe, etc.) are reachable.
- **Health that reflects reality**
  - `/healthz` (or equivalent) checks: process up, DB reachable, and optionally Redis/queue if they’re required for core features. Return 503 if a critical dependency is down so load balancers can stop sending traffic.
- **Structured logs**
  - You already use a logger; ensure critical actions (auth failures, payouts, file replacements, council decisions) are logged with enough context (e.g. request id, user/key) and no secrets.
- **Alerts (optional but moves toward 10)**
  - Alerts on repeated 5xx, health check failures, or spend thresholds (e.g. MAX_DAILY_SPEND). Even a simple “ping this URL on failure” is a start.

**Outcome:** Anyone on call can start the app, run migrations, and know “is it healthy?” and “what broke?” from logs/health.

---

## 5. Documentation & governance (already strong; polish for 10)

**Current:** North Star + Companion are excellent. Some annexes may be stale.

**Target:**

- **Annexes match reality**
  - Any doc that describes “current routes,” “current schema,” or “current env vars” is updated when those change (or explicitly marked “as of date X” and reviewed periodically). Script or checklist: “before release, verify SSOT annexes.”
- **Single entrypoint for “how we work”**
  - e.g. “Read North Star first, then Companion; runbook for ops; API.md for routes/auth.” Linked from README so new people and AIs know the order.

**Outcome:** Docs are trusted; no conflicting instructions.

---

## 6. Quality gates (must-have for 10)

**Current:** Truth guard, FSAR, drift sentinel, preflight scripts exist but may be optional.

**Target:**

- **CI runs the gates that matter**
  - e.g. `truth-guard-preflight`, `programming-artifacts-preflight`, and (if fast) a minimal FSAR or regression check run in CI. Fail the build if a gate fails.
- **Protected paths enforced**
  - Self-programming / replace-file logic respects `protected_files` (or equivalent); tests prove that modifying a protected file without proper authority fails.
- **Spend and safety limits**
  - MAX_DAILY_SPEND and any “fail closed” logic are tested (e.g. unit or integration test that simulates over-limit and asserts behavior). No silent bypass.

**Outcome:** The constitution’s “fail-closed” and “no unprotected changes to core” are enforced by automation.

---

## 7. Dependencies & maintenance (important for 10)

**Target:**

- **Dependency hygiene**
  - `npm audit` (and equivalent) clean or exceptions documented; no known-critical vulnerabilities in production deps. Dependencies up to date enough that you’re not stuck on an EOL stack.
- **Node version**
  - `engines` in `package.json` matches what you run in CI and production; CI uses that version.

**Outcome:** No “we can’t upgrade because we don’t know what will break.”

---

## Summary: what “10” actually means

| Area | Today | At 10 |
|------|--------|--------|
| **Architecture** | Monolithic server, legacy DB file | Thin server, single DB path, schema only in migrations |
| **Testing** | 2 tests in npm test, rest unclear | Full suite in one command, CI runs it, smoke as gate |
| **Security** | Good ideas, no full audit | Every sensitive route protected and documented |
| **Operations** | Ad hoc | Runbook, health that checks deps, logs, optional alerts |
| **Docs** | Strong SSOT | Annexes verified, one “start here” path |
| **Quality** | Scripts exist | Gates in CI, protected paths and spend limits tested |

Rough effort (very approximate):

- **Phase 1 (foundation):** Split server, kill/fix `core/database.js`, single test command + CI — **~2–4 weeks** for one person.
- **Phase 2 (safety):** Route/auth audit, runbook, health deps, quality gates in CI — **~1–2 weeks**.
- **Phase 3 (polish):** Doc verification, dependency audit, alerts, regression coverage — **~1–2 weeks**.

So: **about 4–8 weeks of focused work** gets you into the high 8–9 range; maintaining that and closing the last gaps (monitoring, coverage, and discipline about keeping docs/CI in sync) is what makes it a **10**.

---
