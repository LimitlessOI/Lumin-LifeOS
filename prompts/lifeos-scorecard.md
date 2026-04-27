# Domain: Daily Scorecard + MITs

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/lifeos-daily-scorecard.js`
**Owning routes:** `routes/lifeos-scorecard-routes.js`
**Mounted at:** `/api/v1/lifeos/scorecard`

---

## What This Domain Does

Each day, Adam sets up to 3 Most Important Tasks (MITs). He checks them off or defers them. At end of day, the system computes a weighted score (0-100) across 5 sources and generates a one-paragraph AI narrative. Chronic deferral (3+ times on the same item) is detected and surfaced. The score feeds the Lumin context snapshot so the AI always knows how the day went.

---

## Tables Owned

| Table | Purpose |
|---|---|
| `daily_mits` | MITs — user_id, mit_date DATE, position (1-3), title, notes, status (pending/done/deferred/dropped), deferred_to DATE, completed_at. UNIQUE user_id+mit_date+position. |
| `daily_scorecards` | One row per user per day — score 0-100, grade (A-F), breakdown JSONB, narrative TEXT. UNIQUE user_id+scorecard_date. |
| `task_deferrals` | Deferral audit trail — user_id, item_type (mit/commitment), item_id, item_title, deferred_from DATE, deferred_to DATE, deferral_count INT |

---

## Services

```
createLifeOSDailyScorecard({ pool, callAI, logger })
  .setMITs(userId, date, mits[])                    → upsert by position
  .getMITs(userId, date)                             → ordered by position
  .updateMITStatus(userId, mitId, { status, deferredTo })
      → logs to task_deferrals on defer, detects chronic (existing count >= 2)
  .computeScore(userId, date)
      → MITs(40pts) + commitments(25pts) + joy(20pts) + deferrals(penalty -15) + integrity(15pts)
  .generateScorecard(userId, date, { force })        → idempotent, AI narrative
  .getScorecardHistory(userId, { days })             → last N days
  .getDeferralPatterns(userId, { limit })            → items deferred 2+ times in 30 days
  .getTodaySummary(userId, date)                     → { date, mits, scorecard }
```

Grade thresholds: A≥90, B≥75, C≥60, D≥40, F≥0.

---

## Route Surface

```
GET   /api/v1/lifeos/scorecard/today         getTodaySummary (mits + scorecard)
GET   /api/v1/lifeos/scorecard/mits?date=    getMITs for a date
POST  /api/v1/lifeos/scorecard/mits          setMITs (array of { position, title })
PATCH /api/v1/lifeos/scorecard/mits/:id      updateMITStatus
POST  /api/v1/lifeos/scorecard/score         generateScorecard (force flag)
GET   /api/v1/lifeos/scorecard/history?days= getScorecardHistory
GET   /api/v1/lifeos/scorecard/deferrals     getDeferralPatterns
```

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `generateScorecard()` — narrative | `groq_llama` | Short narrative, cheap, fast |
| All other calls | No AI — pure DB | No cost |

---

## UI Integration

`public/overlay/lifeos-today.html` has the MIT widget + day score bar injected.

**Variable names (fixed 2026-04-19):**
- User: `USER` (from `CTX.USER` via `window.LifeOSBootstrap`)
- Headers: `H()` (from `CTX.headers()`)
- DO NOT use `LIFEOS_USER` or `getH()` — these were bugs that have been fixed.

Key functions in today overlay: `loadMITs()`, `renderMITs()`, `renderScorecard()`, `toggleMIT()`, `deferMIT()`, `addMIT()`.

---

## Next Approved Task

Add a **weekly scorecard summary** to the weekly review data snapshot. When `buildSnapshot()` in `lifeos-weekly-review.js` runs, include:
- 7-day average score
- Number of A/B/C/D/F days
- Top deferred item (most deferrals this week)
- Chronic deferral count for the week
