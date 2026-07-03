<!-- SYNOPSIS: Council builder: production 404 on `/domains` — diagnosis & fix -->

# Council builder: production 404 on `/domains` — diagnosis & fix

**Authority:** Operational; `docs/constitution/NORTH_STAR_SSOT.md` **§2.11a** (builder is P0).  
**For Adam:** you do not need to “test harder.” This is a **deploy / image** gap, not a skills gap.

---

## 1. Problem (KNOW)

| Check | `https://lumin-web-production-e3a9.up.railway.app` |
|--------|-----------------------------------------------|
| `GET /healthz` | **200** — the Node app is up |
| `GET /api/v1/lifeos/builder/domains` | **404** `Cannot GET /api/.../domains` — **no route registered** on the **running** image |

**Conclusion:** The live container is **not** running the same route table as **current** `main`. The builder is **mounted in code** at `startup/register-runtime-routes.js` → `createLifeOSCouncilBuilderRoutes` → `app.get('/api/v1/lifeos/builder/domains', …)` (`routes/lifeos-council-builder-routes.js`). A **404** from Express here means: **this code path is absent from what Railway deployed** (stale build, wrong branch, or service pinned to an old image).

**Not the problem (ruled out for “404 Cannot GET”):**

- **Wrong `COMMAND_CENTER_KEY`:** would normally yield **401**, not 404, *if* the route existed. Here the route is missing entirely.
- **Missing `prompts/` on server:** would yield **500** from `getDomains`, not 404 at the router.

---

## 2. Core (AI Council) — structured debate

**Question:** *Why is the council builder missing on production while `healthz` works?*

| Position | Case | Rebuttal |
|----------|------|----------|
| **A — Deploy drift (winner)** | `main` includes builder mount; 404 = running image **older** or built from a **ref** that predates the mount, or **another** service is bound to the URL (unlikely if same app serves `/healthz`). | If Railway built the wrong Dockerfile or wrong root, you’d still fix by **re-pointing the deploy** to the correct branch/commit. |
| **B — Feature flag** | No feature flag in `createLifeOSCouncilBuilderRoutes` — mount is **unconditional** if `registerRuntimeRoutes` completes. | Unlikely. |
| **C — partial boot** | If `registerRuntimeRoutes` threw before line 231, the whole app might not listen — but **healthz 200** suggests normal boot. | Rejected unless logs show a secondary server. |

**Consensus recommendation:** **Redeploy** the Railway service from the **branch that contains** `createLifeOSCouncilBuilderRoutes` in `register-runtime-routes.js` (your usual **`main`**). Then **re-probe** `GET /api/v1/lifeos/builder/domains` until **200** + JSON `{ ok: true, domains: [...] }`.

---

## 3. Fix (operator — one of these)

1. **Push `main` + wait for auto-deploy** (if Railway is wired to GitHub and auto-deploys on push).  
2. **HTTP (preferred when the app is up):** from a shell that has the same env as `docs/ENV_REGISTRY.md` for this service:  
   `npm run system:railway:redeploy`  
   (needs `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY`, and Railway IDs on the **server**; see `scripts/system-railway-redeploy.mjs` for `RAILWAY_TOKEN` fallback.)  
3. **Railway dashboard:** open the service → **Deployments** → **Redeploy** latest / trigger from correct branch.

**After deploy:** run locally:

```bash
export PUBLIC_BASE_URL="https://lumin-web-production-e3a9.up.railway.app"
# plus COMMAND_CENTER_KEY in shell
npm run builder:preflight
```

**Success:** preflight exit **0** and JSON from `/domains`. **Then** `npm run lifeos:builder:build-chat` is allowed.

---

## 4. Verify

```bash
node scripts/diagnose-builder-prod.mjs
```

(HTTP-only; no keys required for the 404/200 distinction.)

---

## 5. Changelog

| Date | Note |
|------|------|
| 2026-07-03 | **Repo-side deploy drift reduced:** runtime/script base URLs now resolve through `config/public-origin.js`, the fallback `RAILWAY_PUBLIC_DOMAIN` no longer defaults to robust-magic, and `.github/workflows/railway-deploy.yml` now targets `lumin-web` by default. Current deploy blocker remains external to code: GitHub Actions still reports `Invalid RAILWAY_TOKEN` on `Deploy to Railway`. |
| 2026-04-25 | **KNOW:** `healthz` 200, `/api/v1/lifeos/builder/domains` 404 on `robust-magic-production` — doc + `diagnose-builder-prod.mjs`. |
