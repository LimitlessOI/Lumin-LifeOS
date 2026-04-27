# REPO_TRIAGE_NOTES — human verdicts (gold / trash / keep)

**Companion to:** `docs/REPO_CATALOG.md` (regenerate with `npm run repo:catalog`)

**Compact view:** `docs/REPO_BUCKET_INDEX.md` (top-level buckets + largest 15). **Every index:** `docs/REPO_MASTER_INDEX.md`.

**Deep “why is this here?” audit:** `docs/REPO_DEEP_AUDIT.md` — spine (`server.js` + `register-runtime-routes.js`), value tiers, archive waves.

Use this file for **judgment** the generator cannot make. The catalog only lists **what exists** and a **one-line hint**.

## How to triage

| Status | Meaning |
|--------|---------|
| **KEEP** | Active; belongs in main tree |
| **GOLD** | Keep; unusually valuable reference or pattern — note why |
| **REVIEW** | Not sure; needs owner decision |
| **DEPRECATE** | Still in tree but do not extend; plan removal |
| **DELETE-CANDIDATE** | Safe to remove after quick grep / verify |

## Entries (newest at top)

| Date | Path or glob | Status | Notes |
|------|--------------|--------|-------|
| 2026-04-26 | *(strategy)* | GOLD | `docs/REPO_DEEP_AUDIT.md` — use **Wave 0–4**; functioning system = spine + DB + deploy, not every top-level folder. |
| 2026-04-26 | `backups/` (~1k files) | DELETE-CANDIDATE | After grep: not part of `server.js` spine — move off git to storage or delete; verify no script depends on path. |
| 2026-04-26 | `logs/` in repo (~2.8MB) | DELETE-CANDIDATE | Logs should not be versioned — `.gitignore` + delete tracked copies after confirm. |
| 2026-04-26 | `migrations/` vs `db/migrations/` vs `database/` | REVIEW | **Wave 2** in DEEP_AUDIT — pick authoritative migration root; deprecate others. |
| 2026-04-26 | `src/`, `apps/`, root `frontend/` | REVIEW | Grep for imports from spine; likely parallel experiments — archive if unused. |
| 2026-04-26 | `my_project/`, `my-project/` | DELETE-CANDIDATE | Scratch names — grep then remove. |
| 2026-04-26 | `audit/reports/` | REVIEW | Many generated FSAR/drift artifacts — excluded from catalog by default (see `.gitignore`); prune legacy committed copies if desired. |
| 2026-04-26 | `docs/THREAD_REALITY/` | REVIEW | ~367k small files / ~1.4GB — excluded from `REPO_CATALOG.md` by default; see `.gitignore` partial ignore; decide archive vs delete vs move out of repo. |
| _(none yet)_ | | | Add rows as you audit. |

## Session checklist

1. Pick a **bucket** from `REPO_CATALOG.md` (e.g. `core/`, `legacy routes/`).
2. For each suspicious file: grep imports / routes; if unused → **DELETE-CANDIDATE** here.
3. After deletes: `npm run repo:catalog` and commit.
