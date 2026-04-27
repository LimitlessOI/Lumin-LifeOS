# Domain: Truth Delivery + Calibration

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/truth-delivery.js`
**Owning routes:** `routes/lifeos-core-routes.js` (truth endpoints)
**Mounted at:** `/api/v1/lifeos/truth`

---

## What This Domain Does

Delivers honest truths to the user in the style they can actually receive — not softened to meaninglessness, but calibrated to their capacity and current emotional state. The system gets better at truth delivery over time by tracking which styles, hours, and emotional states produce the highest acknowledgment rate for each user.

---

## Tables Owned

| Table | Purpose |
|---|---|
| `truth_delivery_log` | Every delivery — user_id, content, style, topic, acknowledged, hour_of_day, emotional_state, joy_7d_at_time, integrity_at_time |
| `truth_deliveries` | VIEW — alias for `truth_delivery_log` (backward compat, added 2026-04-18) |

Truth style per user is stored on `lifeos_users.truth_style`.

---

## Services

```
createTruthDelivery({ pool, callAI })
  .generate({ userId, topic, context })
      → picks style from user's truth_style, generates truth statement
  .logDelivery({ userId, content, style, topic })
      → persists to truth_delivery_log with hour + emotional state
  .acknowledge({ userId, deliveryId })
      → marks acknowledged = true
  .getCalibrationReport({ userId, days })
      → total_deliveries, by_style, by_hour, by_emotional_state + 'best' qualifieds
  .getStyleEffectiveness({ userId })
      → aggregates ack_rate by style
```

---

## Route Surface

```
POST /api/v1/lifeos/truth/deliver            generate + log a truth delivery
POST /api/v1/lifeos/truth/acknowledge        acknowledge a delivery
GET  /api/v1/lifeos/truth/calibration?days=  get calibration report
```

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `generate()` — truth statement | `gemini_flash` | Nuanced, calibrated, free |
| `getCalibrationReport()` | no AI, pure SQL aggregation | No cost |

---

## Truth Delivery Styles

```
direct        — state the truth plainly, no cushion
socratic      — ask questions that lead the user to the truth themselves
reframe       — present the same truth from a different angle
data_mirror   — "here is what the data shows, without interpretation"
story_bridge  — surface the truth through a metaphor or analogy
challenge     — gently push back on the user's stated belief
```

Style is per-user, learned from calibration. Default: `direct`.

---

## Calibration Learning Loop

`services/lifeos-scheduled-jobs.js` → `calibrationTick`
- Fires daily
- Reads `getStyleEffectiveness()` — if ≥5 deliveries across ≥2 styles, writes the winning style back to `lifeos_users.truth_style`
- Guarded by `createUsefulWorkGuard()` — workCheck requires ≥5 truth_deliveries in ≥2 styles over 90d
- **callAI is NOT required** for calibration — it's pure SQL aggregation. The guard has `prerequisites: []`.

**⚠️ Bug fixed 2026-04-18:** calibrationTick was pointing at `truth_deliveries` (wrong table name). Actual table is `truth_delivery_log`. A VIEW `truth_deliveries` was added as a compatibility alias.

---

## Calibration Report UI

`public/overlay/lifeos-today.html` — "Truth Calibration" card (between Emotional Weather and Attention Loop):
- Best style + ack_rate + sample size
- Best hour of day
- Best emotional state
- "Still learning" fallback if <10 total deliveries

---

## What NOT to Touch

- Do NOT rename `truth_delivery_log` — the VIEW `truth_deliveries` depends on it.
- Do NOT remove the VIEW `truth_deliveries` — backward-compat queries use it.
- The `hour_of_day`, `emotional_state`, `joy_7d_at_time`, `integrity_at_time` columns were added 2026-04-18. Do not remove them — they feed the calibration report.

---

## Next Approved Task

**Emotional state inference is currently best-effort from `daily_emotional_checkins`.** If the user hasn't done a daily check-in today, emotional_state defaults to `null`. Improve: fall back to the most recent `joy_checkins.score` (score <4 = `stirred`, score <2 = `heavy`) so emotional_state is almost never null.
