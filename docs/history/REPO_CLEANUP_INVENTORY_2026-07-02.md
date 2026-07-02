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

## Recommended execution order (all reversible, verify boot after each)

1. **`lumin-factory/`** → Hist archive or `.gitignore` (safe now; 0 boot-path impact). Verify
   `npx madge --circular server.js` still 0 and `node --check server.js` passes.
2. **Legacy overlays** → builder task to untangle refs, then archive.
3. **Bullet memory dirs** → founder-confirm, merge unique files, archive.
4. **History bulk** → Hist mandatory case, consolidate under `_hist/` with INDEX.

After each batch: `npm test` + `npx madge --circular server.js --extensions js` must stay green.
