# REPO_DEEP_AUDIT — why things exist, what matters, what to fix or archive

**Status:** Living document. **Not** constitutional SSOT law — operational truth-finding.  
**Companion:** `docs/REPO_CATALOG.md` (full inventory), `docs/REPO_BUCKET_INDEX.md` (buckets only), `docs/REPO_MASTER_INDEX.md` (all indexes), `docs/REPO_TRIAGE_NOTES.md` (verdicts).  
**Generated inventory note:** ~4.2k files indexed (excludes `THREAD_REALITY`, `audit/reports/`, `node_modules`, etc.) — run `npm run repo:catalog` for current counts.

---

## 1. Why this repo looks like a “city with no zoning”

Multiple agents and experiments added **parallel trees** (extra `migrations/`, `database/`, `src/`, `apps/`, product demos) without a single **composition audit**: “does `server.js` import this?” Until recently, rules (builder-first, SSOT receipts, `@ssot` tags) were **not** uniformly enforced, so **dead code and gold coexist**.

**You can still get a functioning system** — production is not “every file”; it is **the spine** below plus Neon + Railway.

---

## 2. The spine (KNOW — what actually runs the Railway app)

**Entry:** `server.js` → loads pool, middleware, then mounts routes from:

| Layer | File(s) | Role |
|--------|---------|------|
| Public / static | `routes/public-routes.js`, middleware | Overlays, static HTML, some marketing paths |
| Core API v1 | `routes/api-v1-core.js` | Tasks, ideas, snapshots, execution queue, older “OS” automation surface |
| Server routes | `startup/routes/server-routes.js` | Memory API mount, Stripe, health, pods, auto-builder hooks, etc. |
| **Runtime product** | `startup/register-runtime-routes.js` | **Main revenue + LifeOS + builder + governance** |

**`register-runtime-routes.js` is the honest map of “what we ship” for most product lanes:** ClientCare billing, TokenOS, LifeOS (`/api/v1/lifeos/*`), council builder, gate-change, lane intel, TC, MLS, Word Keeper, cost savings, twin, history, ideas, autonomy, Railway env, project governance, builder supervisor, capability map, model performance, website audit, enhanced council, optional copilot/simulator/workshop/kids/teacher.

**Also mounted from `server.js` (not in that file):** `routes/site-builder-routes.js`, `routes/command-center-routes.js` (and other imports near the bottom of `server.js`).

**Rule of thumb:** If a folder is **not** imported (directly or transitively) from `server.js` → **`startup/*` → `routes/*` → `services/*`**, it is **not** part of the default production server unless something else loads it (cron, CLI, one-off script).

---

## 3. Value tiers (what to protect vs question)

### Tier A — **Protect** (core value, active or strategically required)

| Area | Why it’s here | Risk if neglected |
|------|----------------|-------------------|
| `routes/lifeos-*.js`, `services/lifeos-*.js`, `public/overlay/lifeos-*` | LifeOS product + Lumin | User-facing truth; highest amendment coupling |
| `routes/lifeos-council-builder-routes.js`, `services/council-service.js`, `config/task-model-routing.js`, `prompts/` | TokenSaverOS builder + council | §2.11 spine; scale path |
| `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-*.js` | Load-bearing debate + receipts | §2.12 / §2.6 |
| `routes/clientcare-billing-routes.js`, `public/clientcare-billing/` | Active recovery revenue | Amendment 18 |
| `routes/tokenos-routes.js`, TokenOS public pages | B2B savings product | Amendment 10 |
| `routes/tc-routes.js`, `services/tc-*.js` | TC lane | Amendment 17 |
| `startup/register-runtime-routes.js`, `middleware/`, `core/database.js` | Composition | Drift breaks everything |
| `db/migrations/` (paths actually applied on boot) | Schema truth | Must match Neon |
| `docs/projects/AMENDMENT_*.md`, `docs/SSOT_*.md`, `docs/ENV_REGISTRY.md` | Governance + env mirror | §2.6 / operator trust |

### Tier B — **Keep but verify usage** (may be legacy or partially used)

| Area | Question to answer |
|------|---------------------|
| `routes/api-v1-core.js` + `core/*` drones / idea engine | Still used by operators daily, or superseded by LifeOS + builder? |
| `council/enhanced-consensus.js` vs `lifeos-gate-change` | Two consensus paths — document **when** each is used |
| `server.js` late mounts (`/api/tco`, etc.) | Confirm env flags and whether still revenue-relevant |
| `audit/` (code, not `audit/reports/`) | FSAR/drift **runners** — keep; generated reports belong out of git or gitignored |

### Tier C — **Archive / quarantine candidates** (high probability of barnacles)

**Signals:** duplicate folder names, tiny file counts, “experiment” names, huge binary or dump trees, not referenced from spine.

| Bucket / pattern | Catalog signal (approx.) | Action |
|------------------|--------------------------|--------|
| `docs/THREAD_REALITY/` | Excluded; ~1.4GB, ~367k files | **Move to external archive** or delete after legal/ops check |
| `backups/` | ~1k+ files | **Should not** live in main git; move to object storage or local-only |
| `logs/` in repo | ~2.8MB tracked | **Gitignore** + rotate; logs are not source code |
| `• Lumin-Memory/` vs `Lumin-Memory/` (unicode dup) | Two buckets, one huge | **Merge or delete** duplicate; fix folder name encoding |
| `migrations/` (repo root) vs `db/migrations/` | Two migration roots | **Inventory which apply**; deprecate unused root |
| `database/` vs `db/` | Parallel SQL history | Same — **one winning path** for new work |
| `src/`, `apps/`, `workflow-server/`, `frontend/` chunks | Classic “second app” drift | **grep imports** from `server.js`; if none → archive |
| `my_project/`, `my-project/` | Obvious scratch | DELETE-CANDIDATE after grep |
| Tiny dirs: `quantum/`, `kafka/`, `k8s/`, `ar-project/` | Often one-file spikes | REVIEW — keep only if referenced |

### Tier D — **Fix / improve** (system hygiene, not “delete repo”)

| Issue | Fix |
|--------|-----|
| Missing `@ssot` on orphan route files | Tag or delete; pre-commit already warns |
| Dual / competing “consensus” stories in docs | One operator table: **IDE debate** vs **`run-council`** vs **`enhanced-consensus` HTTP** |
| `FEATURE_INDEX.md` vs `REPO_CATALOG.md` | FEATURE_INDEX is **marketing/feature** list; CATALOG is **filesystem** truth — both needed; cross-link |
| Cold agents read 10 files | Future: retrieval API; for now **QUICK_LAUNCH + lane + this audit wave** |

---

## 4. Recommended waves (multi-session, same rules you have now)

**Wave 0 — Lock the spine (1 session)**  
- Export list: every `import` from `server.js` and `startup/register-runtime-routes.js` → save as `docs/artifacts/SPINE_IMPORTS.txt` (optional).  
- Run `npm run tsos:doctor` + smoke against prod when keys exist.

**Wave 1 — Quarantine dumps**  
- `THREAD_REALITY`, `backups/`, `logs/` → triage notes → archive/delete.

**Wave 2 — One migration story**  
- Document: “**Authoritative migrations:** `db/migrations/`” (or correct if wrong).  
- Mark `database/` + root `migrations/` DEPRECATE or merge.

**Wave 3 — Top-level barnacle grep**  
- For each suspicious top-level dir: `rg "from ['\"].*dirname" server.js startup routes services` or “is this path in any import?”  
- DELETE-CANDIDATE → PR → `npm run repo:catalog`.

**Wave 4 — Dual-codepath council**  
- SSOT paragraph: when to call `enhanced` consensus endpoint vs gate-change vs builder review.

---

## 5. Mindset (so you don’t lose hope)

The **functioning system** is the **spine + Neon + Railway + verifiers**, not the repo’s total line count. The barnacles are **technical debt**, not proof the platform failed — they are what **ordered cleanup + receipts** are for.

**Next edit:** After each wave, add rows to `docs/REPO_TRIAGE_NOTES.md` and a short pointer in `docs/CONTINUITY_LOG.md` or the relevant lane log.

---

*Last updated: 2026-04-26 — initial deep audit from composition trace + catalog buckets.*
