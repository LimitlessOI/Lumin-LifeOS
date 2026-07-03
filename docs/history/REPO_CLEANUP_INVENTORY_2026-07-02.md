<!-- SYNOPSIS: Repo cleanup inventory (2026-07-02) — indexed sprawl candidates, reference-evidence, ARCHIVE/ESCALATE/REVIEW verdicts. -->

# Repo Cleanup Inventory — 2026-07-02

**Purpose (Adam's directive):** go through repo files; anything unused/harmful → either
**escalate** (good idea worth implementing) or **archive** into one organized, fully-indexed
location so "we know exactly everything that's in there."

**Method:** evidence-driven, shell-generated (no per-file AI). Every candidate below carries
the concrete reference-check that produced its verdict. **Nothing here was deleted** — this is
the map so the actual moves can happen safely (via the builder self-repair loop or with founder
confirmation), because a prior blind cleanup broke the live backbone and governance is
**default-HALT** on legacy/Hist artifacts.

**Verdict key:**
- **ARCHIVE-SAFE** — provably not in the live boot path and regeneratable/duplicate; safe to move to a Hist archive.
- **ESCALATE** — still referenced by active code; the references must be untangled (builder task) before it can move.
- **REVIEW** — load-bearing or founder-owned content; needs founder confirmation before touching.

---

## 1. `lumin-factory/` — duplicate factory tree — **ARCHIVE-SAFE**

- **Size:** 4.0M · **648 tracked files**
- **Evidence it is not live:**
  - `npx madge server.js` import graph contains **0** `lumin-factory` nodes.
  - Not imported by `server.js`, `server-*.js`, `startup/`, `routes/`, `services/`, `config/`.
  - Only references are two **export/bundle** scripts in `package.json`:
    `factory:bundle` → `builderos-reboot/scripts/build-lumin-factory-bundle.mjs`,
    `factory:init` → `builderos-reboot/scripts/init-lumin-factory-repo.mjs`.
- **What it is:** a materialized/exported copy of `factory-staging/` (identical `AGENTS.md`,
  same `factory-core/` layout) intended to be published as a standalone repo bundle.
- **Why safe:** regeneratable from `factory-staging/` via `npm run factory:bundle`; it is a
  build artifact checked into git, not source of truth.
- **Action:** move to `builderos-reboot/_hist/` (Hist domain) with a restore note, OR add to
  `.gitignore` and stop committing the generated bundle. Verify `npm run factory:bundle` still
  regenerates it afterward.

---

## 2. Legacy overlay HTML (rule-declared dead) — **ESCALATE**

The always-on rule `legacy-interfaces-forbidden` names 12 dead overlays; the one active
interface is `public/overlay/lifeos-app.html`. **All 12 are still present AND still linked**
(from `lifeos-app.html`, `public/overlay/lifeos-feature-data.js`, tests, or
`scripts/check-overlay-syntax.js`), so none can be moved without breaking a live link:

| File | active-code refs |
|------|------------------|
| `lifeos-communication.html` | 1 |
| `command-center.html` | 3 |
| `lifeos-command-center.html` | 2 |
| `lifeos-founder-interface.html` | 2 |
| `lifeos-voice-rail-v1.html` | 2 |
| `portal.html` | 2 |
| `lifeos-alpha.html` | 0 code / linked from app + feature-data |
| `lifeos-alpha-rail.html` | 0 code / linked from app + feature-data |
| `control.html` | 0 code / referenced by `check-overlay-syntax.js`, `src/utils/context.js` |
| `lifeos-backtest.html` | 0 code / linked from `lifeos-app.html` + `lifeos-feature-data.js` |
| `lifeos-builder-test.html` | 0 code / a few doc refs |
| `lifere-os-v1.html` | 0 code / a few refs |

- **Action (builder task):** for each, remove the nav link / feature-data entry / test ref that
  points at it, prove the app still renders, then archive. This is exactly the kind of
  reference-untangling the self-repair loop should own — not a blind overnight move.

---

## 3. Accidental duplicate memory dirs — **REVIEW (founder)**

`git ls-files` shows three `Lumin-Memory` roots — two with a **bullet character in the
directory name** (never intentional), which is copy-paste cruft:

- `Lumin-Memory/` — clean (18 files), referenced by `services/lumin-memory-fetcher.js`,
  `routes/lifeos-core-routes.js`, and the idea-extraction scripts. **Load-bearing — keep.**
- `• Lumin-Memory/` (space) — 18 files; **flatter layout** and contains a unique
  `00_INBOX/raw/system-ideas.txt` not present in the clean tree.
- `•␉Lumin-Memory/` (tab) — 19 files.
- **Risk:** memory is load-bearing and these are founder brain-dumps (GPT/Gemini/Grok/DeepSeek
  dumps, "Directives and ideas log", "Mission & North Star"). Content differs, so this is a
  **merge**, not a dedupe.
- **Action:** founder-confirm, then consolidate any unique files (e.g. `system-ideas.txt`) into
  the clean `Lumin-Memory/00_INBOX/raw/`, and archive the bullet-named roots. Do **not** delete
  unique dumps.

---

## 4. History / evidence bulk — **REVIEW (Hist consolidation)**

Large trees that read as history/evidence rather than live code — candidates for the "single
organized archive," but each is Hist-domain (default-HALT; needs the Hist mandatory case):

| Path | Size | Tracked files | Nature |
|------|------|---------------|--------|
| `docs/conversation_dumps/` | 46M | 100 | research archives (already flagged "not product authority") |
| `audit/` | 12M | 2690 | audit output/evidence |
| `backups/` | 6.8M | 1095 | snapshots |
| `builderos-reboot/_hist/` | 2.0M | 105 | existing Hist archive (destination pattern) |

- **Action:** consolidate 1–3 under the existing `builderos-reboot/_hist/` archive with a
  top-level `INDEX.json`, following the `WORKING_TREE_SNAPSHOTS` pattern already in use. Route
  through the Hist mandatory case per `HIST_LEGACY_SYSTEM_REGISTRY.md §4`.

---

## EXECUTED — Batch 1 (2026-07-02): fence-corrupted dead `src/` artifacts

**Moved 168 files** → `docs/history/legacy-src/<path>.txt`, catalogued in
`docs/history/legacy-src/SALVAGE_INDEX.json` (source_path, archived_to, salvaged synopsis, verdict, reason).

- **Selection (evidence):** madge import closure of `server.js` + `server-founder-runtime.js` +
  `server-full-runtime.js` (741 modules) → file absent from closure; resolved-import scan across the
  full active corpus (routes/services/startup/config/core/middleware/scripts/apps/**tests**) → 0 importers;
  AND file contains literal markdown fences (```), i.e. syntactically invalid / non-loadable.
- **Salvage-first:** each file's `SYNOPSIS`/intent captured into `SALVAGE_INDEX.json` before the move so
  the *idea* survives even though the corrupted code is retired. (Most were codegen boilerplate; genuine
  ideas e.g. LoRaWAN/IoT ingestion, example adapters preserved.)
- **Post-move verification:** `node --check` on all 3 entrypoints OK · `madge --circular server.js` still
  741 files (0 boot-path impact) · `tests/spine-import-resolution.test.js` 156/156 · `npm test` 225 pass / 0 fail.
- **Remaining `src/`:** 13 files load-bearing (KEEP), ~92 dead-but-referenced-by-tests/aliases (per-file work),
  balance still to salvage+archive in later batches.

## EXECUTED — Batch 2 (2026-07-02): aggressive dead-`src/` + coupled dead tests

**Adam directive:** prefer a *loud* break that names its dependency over silent legacy drift — so
this batch is aggressive: it moves dead `src/` files even when only **tests/aliases** referenced them,
letting any true dependency surface in CI/boot rather than lurk.

**Moved 119 files** (103 `src/*.js` → `docs/history/legacy-src/`, 16 dead tests → `docs/history/legacy-tests/`),
appended to the same `SALVAGE_INDEX.json` (287 entries total).

- **Held back (real deps):** `src/controllers/clientController.js`, `src/services/migrationService.js`
  (imported by non-test active `index.js`) + the 13 boot-closure KEEP files.
- **Coupled moves:** the 16 dead tests that imported archived `src/` were moved with them (none are in the
  CI `npm test` list, so the suite is unaffected).
- **Safety net (anti-drift):** the import-resolution CI guard now fails loudly if anything reaches for an
  archived path — silent drift becomes an immediate red X, and the archive is a git-tracked quarantine (restorable).
- **Verification:** node --check x3 OK · madge --circular still 741 (0 boot impact) · npm test 225 pass / 0 fail.

---

## Recommended execution order (all reversible, verify boot after each)

1. **`lumin-factory/`** → Hist archive or `.gitignore` (safe now; 0 boot-path impact). Verify
   `npx madge --circular server.js` still 0 and `node --check server.js` passes.
2. **Legacy overlays** → builder task to untangle refs, then archive.
3. **Bullet memory dirs** → founder-confirm, merge unique files, archive.
4. **History bulk** → Hist mandatory case, consolidate under `_hist/` with INDEX.

---

## 5. Import-resolution audit (2026-07-02 addendum) — broken/dead modules

**Method:** dynamically `import()` every module (routes/services/middleware/config)
in an isolated process with a dummy `DATABASE_URL`. This catches *missing named
exports* and *missing packages/modules* that `node --check` and madge cannot see
(they don't resolve exports). This is the exact class that took the live site
down (`stripChairDoPrefix`).

### 5a. Routes — DONE (quarantined)
All 126 `routes/*.js` imported; 123 clean. 3 dead+broken (phantom
`lifeos-auth-helpers.js` / wrong-file `requireLifeOSUser`, 0 active refs) →
moved to `docs/history/legacy-routes/*.js.txt`. The route surface is now guarded
in CI by `tests/spine-import-resolution.test.js` (imports every `routes/*.js`).

### 5b. services / middleware / config — DEAD but NOT boot-orphaned islands — **ESCALATE (do not blind-move)**
~11 modules fail import, almost all because they import **npm packages that are
no longer installed** (`sequelize`, `joi`, `openai`, `winston`, `brain.js`,
`natural`) or missing local modules:

| Module | Failure | Active importers (non-catalog/dump) |
|---|---|---|
| `services/ConfigService.js` | `config/env-validator.js` has no `default` | none (only `docs/REPO_CATALOG.json`) |
| `services/adaptiveModel.js` | pkg `brain.js` missing | `workers/learningQueue.js`, `api/learningRoutes.js` |
| `services/analysisService.js` | pkg `openai` missing | `controllers/callAnalyzerController.js` |
| `services/documentProcessor.js` | pkg `natural` missing | none active |
| `services/marketing-coach.js` | `services/ai-council.js` missing | none active (`marketingos` manifest only) |
| `services/marketing-transcriber.js` | `transcribeAudioFile` export missing | none active |
| `services/transcriptionService.js` | pkg `openai` missing | `controllers/callAnalyzerController.js` |
| `middleware/config-security.js` | pkg `winston` missing | none active |
| `middleware/simulationMiddleware.js` | `models/outreachLog.js` no `default` | none active |
| `config/db.js` | pkg `sequelize` missing | **28** (all under `src/`, `api/`, `controllers/`, `workers/`, `scripts/`) |
| `config/env-validator.js` | pkg `joi` missing | only dead `ConfigService.js` (boot uses the *different* `services/env-validator.js`) |

**Key finding — a legacy Express-MVC island:** these dead modules are wired to a
separate older app structure — **`src/` (532 files), `api/` (13), `controllers/`
(4), `workers/` (1), `models/` (25)** — that uses sequelize/joi/openai/winston.
The current runtime boots via `server-*-runtime.js → startup/ → routes/ +
services/`, and **none of the live spine imports `api/ controllers/ workers/
models/`**.

**BUT `src/` is partially load-bearing** — the live spine imports:
- `src/server/auth/requireKey.js` ← `server-founder-runtime.js`, `server-full-runtime.js` (**boot path**)
- `src/integrations/boldtrail.js` ← `routes/lifere-os-routes.js`, `services/lumin-ambient-moment-router.js`, `services/lifere-boldtrail-bridge.js`

So **the subtree cannot be moved wholesale** (repeating the backbone break). Safe
path is per-file: a file is archive-safe only if it (a) fails import or is
unreferenced AND (b) has zero importers that are themselves in the live graph.
`api/ controllers/ workers/ models/` look fully boot-orphaned and are the safest
first candidates; `config/db.js` + the sequelize/joi chain go with them. This is
a builder/self-repair task (bulk, evidence-checked), not a blind overnight move.

**Not extended to the CI guard:** the whole-`services/` import sweep is
intentionally *not* wired into CI yet, because these 11 legitimately-dead modules
would fail it. The guard covers `routes/*.js` + the explicit spine; extend to
`services/` only after 5b is archived.

After each batch: `npm test` + `npx madge --circular server.js --extensions js` must stay green.

---

## 6. Fence-corruption blast radius (pre-fix codegen artifacts)

**Finding (2026-07-02):** **357** tracked `.js` files in the active tree contain
literal markdown code fences (` ```javascript ` … ` ``` `) written *inside* the
source — the signature of AI codegen whose output fences were never stripped
before commit. Example `config/redis.js`:

```
/** SYNOPSIS ... */
```javascript          <-- corruption
const Redis = require('ioredis');
...
```                    <-- corruption
```

These files are syntactically invalid (and many also use CommonJS `require` in an
ESM repo) so they cannot load.

**Safety proven:** cross-checked all 357 against the live boot-graph import
closure (madge union of `server.js` / `server-founder-runtime.js` /
`server-full-runtime.js`, 741 modules) → **0 reachable**. Boot works precisely
because none are on the live path. The 22 corrupted files under `test/`,`tests/`
are **not** in the `npm test` explicit file list, so the suite stays green.

**By top dir:** `src/` 176, `services/` 85, `backups/` 20, `tests/` 22,
`(root)` 10, `config/` 9, `migrations/` 9, `server/` 6, `client/` 5, misc.

**Why it matters (system thesis):** this quantifies the blast radius of the
builder bug that the **fence-strip** step in the commit path
(`services/deployment-service.js`) now prevents — new autonomous commits are
fence-clean by construction, so this set is bounded and will not grow.

**Disposition:** part of the deliberate legacy `src/` MVC-island archival (§5),
**not** a blind 5am mass-edit. `config/`'s 9 corrupted config files
(`redis`,`redis_config`,`stripeConfig`,`makeComConfig`,`translationConfig`,
`gdpr-compliance`,`agriculture-config`,`voting-config`,`wearable-apis`) are
0-reachable and in no product manifest — safe to archive with the next batch, at
which point the import-resolution guard can extend to `config/` as it now does
for `routes/` + `middleware/`.
