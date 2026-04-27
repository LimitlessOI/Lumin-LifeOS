# Domain: Emotional Intelligence

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/emotional-pattern-engine.js`
**Owning routes:** `routes/lifeos-emotional-routes.js`
**Mounted at:** `/api/v1/lifeos/emotional`

---

## What This Domain Does

Captures daily emotional weather via one-tap check-in. Detects patterns (what precedes low periods, what lifts mood). Surfaces early warnings when the pattern engine detects a concerning trajectory. All downstream systems (truth delivery calibration, early warning, weekly review, Lumin context snapshot) read from this domain's tables.

---

## Tables Owned

| Table | Purpose |
|---|---|
| `daily_emotional_checkins` | One row per user per day — weather (8 presets), intensity (1-10), valence (-5..+5), depletion_tags TEXT[], note, somatic_note, source. UNIQUE user_id+checkin_date. |
| `emotional_patterns` | Learned patterns — trigger→response sequences, frequency, confidence |
| `joy_checkins` | Legacy joy scores — score, notes, created_at. Still used by early warning + truth calibration fallback. |
| `self_sabotage_patterns` | Detected self-sabotage signatures |

---

## Services

```
createEmotionalPatternEngine({ pool, callAI, logger })
  .logDailyCheckin(userId, { weather, intensity, valence, depletionTags, note, somaticNote })
      → upsert by user_id+checkin_date
  .getTodayCheckin(userId)
  .getRecentCheckins(userId, { days })
  .getTrend(userId, { days })               → pure SQL, no AI, 14-day trend
  .analyzePatterns(userId)                  → AI pattern analysis
  .earlyWarning(userId)                     → returns warning object if threshold crossed
  .logSelfSabotage(userId, pattern)
  .getSabotagePatterns(userId)
  .detectSabotageSignatures(userId)
```

---

## Route Surface

```
POST /api/v1/lifeos/emotional/daily         logDailyCheckin
GET  /api/v1/lifeos/emotional/daily/today   getTodayCheckin
GET  /api/v1/lifeos/emotional/daily/recent  getRecentCheckins
GET  /api/v1/lifeos/emotional/daily/trend   getTrend (no AI, pure SQL)
POST /api/v1/lifeos/emotional/patterns      analyzePatterns
GET  /api/v1/lifeos/emotional/patterns      getPatterns
POST /api/v1/lifeos/emotional/sabotage      logSelfSabotage
GET  /api/v1/lifeos/emotional/sabotage      getSabotagePatterns
POST /api/v1/lifeos/emotional/sabotage/detect detectSabotageSignatures
POST /api/v1/lifeos/emotional/acknowledge   acknowledge a sabotage pattern
```

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `analyzePatterns()` | `gemini_flash` | Pattern synthesis, free |
| `earlyWarning()` | `groq_llama` | Classification, cheap/fast |
| `getTrend()` | no AI, pure SQL | No cost |
| `detectSabotageSignatures()` | `gemini_flash` | Nuanced behavioral patterns |

---

## The 8 Weather Presets (daily check-in)

```
clear      — good energy, clear mind, positive valence
partly     — ok, some friction but manageable
cloudy     — low energy, foggy, neutral to slightly negative
foggy      — unclear, dissociated, hard to think
stormy     — high emotional intensity, turbulent
heavy      — weighed down, depleted, hard to move
charged    — high energy but volatile, could go either way
numb       — disconnected, flat, neither good nor bad
```

---

## Depletion Tags

```
people     — drained by social interaction
pace       — overwhelmed by speed of life
meaning    — disconnected from purpose
body       — physically depleted
money      — financial stress
other      — user-defined
```

---

## Early Warning System

`services/lifeos-scheduled-jobs.js` → `earlyWarningTick`
- Fires every N minutes (configured in scheduler)
- Reads both `joy_checkins.notes` AND `daily_emotional_checkins.weather/note/somatic_note/depletion_tags`
- Calls `patternEngine.earlyWarning()` for each active user
- If warning triggered → queues notification via escalation ladder
- Guarded: requires ≥1 `emotional_patterns` row AND recent signal from joy or daily check-in

**⚠️ callAI was missing from bootAllDomains until 2026-04-19.** earlyWarningTick was silently skipping. Fixed.

---

## UI

`public/overlay/lifeos-today.html` — "Emotional Weather" card + modal:
- 8 weather preset tiles (tap to select)
- Intensity slider (1-10)
- Valence slider (-5 to +5)
- 6 depletion tag chips (multi-select)
- Notes textarea + somatic note textarea
- Submits to `POST /daily`

---

## What NOT to Touch

- Do NOT merge `daily_emotional_checkins` into `joy_checkins`. They serve different purposes: joy_checkins is a simple numeric log; daily_emotional_checkins is the richer qualitative daily ritual. Both are read by downstream systems.
- Do NOT remove the `depletion_tags TEXT[]` column — it feeds the early warning classifier.

---

## Next Approved Task

**Voice-note journaling** — mobile-first emotional capture via audio; transcribed with Web Speech API; stored as note + voice_transcript flag in `daily_emotional_checkins`. Add `voice_transcript BOOLEAN DEFAULT FALSE` column and `voice_input` toggle to the today overlay modal.
