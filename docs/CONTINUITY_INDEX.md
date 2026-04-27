# Continuity Index

**Purpose:** Parallel workstreams no longer share one monolithic `CONTINUITY_LOG.md`. Each lane has its own log so the next agent reads only what matters for that lane.

**Cold-start (any agent):** Read `docs/AI_COLD_START.md` (regenerate with `npm run cold-start:gen`), then open the lane for your task.

**Repo-wide file inventory (cleanup / “what is this?”):** `docs/REPO_CATALOG.md` — regenerate with `npm run repo:catalog`. **Compact bucket stats:** `docs/REPO_BUCKET_INDEX.md`. **Every index in one place:** `docs/REPO_MASTER_INDEX.md`. Human triage: `docs/REPO_TRIAGE_NOTES.md`. **Spine vs experimental trees:** `docs/REPO_DEEP_AUDIT.md`.

| Lane ID | File | Scope |
|--------|------|--------|
| `general` | `docs/CONTINUITY_LOG.md` | Cross-cutting session summaries, repo-wide decisions, legacy history |
| `council` | `docs/CONTINUITY_LOG_COUNCIL.md` | AI Council, LCL, token stack, builder dispatch, model routing |
| `lifeos` | `docs/CONTINUITY_LOG_LIFEOS.md` | LifeOS Core SSOT (Amendment 21), overlays, LifeOS routes/services |
| `tc` | `docs/CONTINUITY_LOG_TC.md` | TC service lane (Amendment 17), TC routes/services/migrations |
| `horizon` | `docs/CONTINUITY_LOG_HORIZON.md` | Competitive + AI landscape intel (`/api/v1/lifeos/intel/horizon/*`, Amendment 36) |
| `security` | `docs/CONTINUITY_LOG_SECURITY.md` | Red-team / dependency + future pentest scope (`/api/v1/lifeos/intel/redteam/*`, Amendment 36) |

**Session tag prefix (required on every new entry):** `[PLAN]` `[BUILD]` `[FIX]` `[REVIEW]` `[RESEARCH]`

Example first line of an update:

`## [BUILD] Update 2026-04-19 #1`

**SSOT:** `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md`
