# Domain: Weekly Review

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/lifeos-weekly-review.js`
**Owning routes:** `routes/lifeos-weekly-review-routes.js`
**Mounted at:** `/api/v1/lifeos/weekly-review`

---

## What This Domain Does

Every Sunday, Lumin writes Adam a 4-6 paragraph letter grounded in real data from that week — joy, integrity, commitments, health, emotional patterns, decisions, finance, outreach. The letter is stored. Adam can then open an interactive conversation with Lumin grounded in that same week's data snapshot, ask questions, push back, make commitments. Any commitments or changes made in conversation get applied back to LifeOS tables.

---

## Tables Owned

| Table | Purpose |
|---|---|
| `weekly_reviews` | One row per user per week — week_start DATE, week_end DATE, narrative_text, data_snapshot JSONB, status (draft/delivered/reviewed). UNIQUE user_id+week_start. |
| `weekly_review_sessions` | One active conversation per review — review_id, user_id, status (active/closed). UNIQUE review_id. |
| `weekly_review_messages` | Messages in the conversation — session_id, role (assistant/user), content |
| `weekly_review_actions` | Extracted actions from conversation — session_id, action_type (create_commitment/update_goal/add_note/set_priority/log_moment/schedule_event), payload JSONB, applied BOOLEAN |

---

## Services

```
createLifeOSWeeklyReview({ pool, callAI, logger })
  .weekBounds(referenceDate)                 → { start, end, label }
  .buildSnapshot(userId, weekStart, weekEnd) → data object from 8 sources
  .generateReview(userId, opts)              → upserts weekly_reviews row, returns review
  .openSession(userId, reviewId)             → creates or resumes conversation session
  .sendMessage(sessionId, userId, msg)       → persists message, gets AI reply, extracts actions
  .extractActions(sessionId, content)        → parses ACTION: markers into typed action objects
  .applyActions(sessionId, userId)           → writes agreed actions back to LifeOS tables
```

---

## Route Surface

```
GET  /api/v1/lifeos/weekly-review/latest          get current week's review
GET  /api/v1/lifeos/weekly-review/history         list past reviews
GET  /api/v1/lifeos/weekly-review/week/:date      get review for specific week
POST /api/v1/lifeos/weekly-review/generate        force generate (or regenerate) this week's review
POST /api/v1/lifeos/weekly-review/:id/session     open or resume conversation for a review
POST /api/v1/lifeos/weekly-review/session/:id/message  send message in conversation
GET  /api/v1/lifeos/weekly-review/session/:id/actions  get extracted actions
POST /api/v1/lifeos/weekly-review/session/:id/apply    apply actions to LifeOS
POST /api/v1/lifeos/weekly-review/session/:id/close    close conversation
```

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `generateReview()` — AI letter | `gemini_flash` | Quality narrative, free |
| `sendMessage()` — conversation | `gemini_flash` | Conversational quality |
| `extractActions()` — parse JSON | `groq_llama` | Structured extraction, fast/cheap |

---

## Scheduler

`services/lifeos-scheduled-jobs.js` → `weeklyReviewTick`
- Fires Sunday only, after 18:00
- Guarded by `createUsefulWorkGuard()` — skips if no active users or already reviewed this week
- Idempotent — uses `ON CONFLICT DO UPDATE` so safe to call multiple times

**⚠️ callAI was not being passed to `bootAllDomains` until 2026-04-19.** The tick was silently skipping. This is now fixed in `server.js`.

---

## UI

`public/overlay/lifeos-weekly-review.html`
- Split pane: letter (left) + chat (right)
- Letter pane: scrollable prose, history chips at bottom
- Chat pane: message bubbles, typing indicator, actions toast with Apply button

---

## Next Approved Task

The weekly review data snapshot (`buildSnapshot`) currently queries 8 data sources (joy, integrity, commitments, health, emotional, decisions, outreach, finance). When sleep tracking is built, add a 9th source: last 7 days of `sleep_logs` (avg duration, avg HRV, debt score).
