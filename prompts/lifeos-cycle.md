<!-- prompts/lifeos-cycle.md — LifeOS Cycle Tracking domain context -->
<!-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md -->

# Domain: LifeOS Cycle Tracking

## What this domain does
Tracks menstrual / perimenopause cycles. Computes the current phase from logged period entries + user settings. Feeds phase context into energy_patterns and decision-intelligence snapshots so the rest of LifeOS is cycle-aware. Zero AI cost — all computation is pure math + SQL.

## Why it matters
~50% of users depend on this for accurate pattern intelligence. Phase context directly improves energy predictions, optimal decision windows, and conflict sensitivity detection.

## Phase model
Boundaries scale linearly with `avg_cycle_length / 28`:

| Phase | Approx days (28-day cycle) | Energy | Decision guidance |
|---|---|---|---|
| `menstrual` | 1–5 | low | Delay non-urgent decisions. Rest and reflect. |
| `follicular` | 6–12 | rising | New projects, social commitments. |
| `ovulation` | 13–15 | peak | Best window for hard conversations + major decisions. |
| `luteal_early` | 16–22 | steady | Strong focus and planning. Good for follow-through. |
| `luteal_late` | 23–28 | dipping | Protect capacity. Avoid overcommitting. |

## Tables owned
- `cycle_settings` — per-user tracking preferences (opt-in). avg_cycle_length, avg_period_length, tracking_enabled, notify_phase_change, perimenopause_mode
- `cycle_entries` — raw period log (period_start / period_end / symptom / spotting)
- `cycle_phases` — one row per cycle, records cycle_start_date + actual cycle_length once next period logged
- `energy_patterns.cycle_phase` — column added by this domain; written on every period_start

## Services owned
- `services/lifeos-cycle.js` → `createCycleService({ pool, logger })`
  - `getSettings(userId)` — reads cycle_settings row (defaults if none)
  - `updateSettings(userId, patch)` — upserts allowed fields
  - `logEntry(userId, { entry_type, ... })` — inserts cycle_entries; on period_start closes prev cycle + syncs energy_patterns
  - `getCurrentPhase(userId)` — pure math from last period_start; returns phase + energyProfile + daysUntilNextPeriod
  - `getContextSnapshot(userId)` — compact object for injection into AI prompts (decision-intel, Lumin)
  - `getCycleHistory(userId, limit)` — last N cycles + recent entries + computed avg length
  - `computePhase(dayOfCycle, settings)` — standalone pure function, exported for tests

## Route surface (`/api/v1/lifeos/cycle`)
| Method | Path | What it does |
|---|---|---|
| POST | `/entry` | Log period_start / period_end / symptom / spotting |
| GET | `/phase` | Current phase + energy overlay |
| GET | `/context` | Compact snapshot for decision-intel + Lumin |
| GET | `/history?limit=N` | Past N cycles with entries (max 24) |
| GET | `/settings` | Get tracking preferences |
| PUT | `/settings` | Update tracking preferences |

## Integration contracts (what other domains consume)
- **Decision intelligence** — calls `getContextSnapshot(userId)` and injects `cycle_phase`, `decision_guidance` into prompt context
- **Lumin chat** — same; overlays energy awareness on responses
- **energy_patterns** — `cycle_phase` column updated on every period_start event

## Model guidance
- No AI calls in this domain. Pure SQL + date math only.
- If you're considering adding AI here, HALT — compute it mathematically first.

## What NOT to touch
- `computePhase()` boundary logic — changes here cascade to all historical + live phase reads. Gate changes through council review.
- The `cycle_phase` CHECK constraint in energy_patterns — adding new phase names requires a migration + service update.

## Next approved tasks
1. Frontend overlay: `public/overlay/lifeos-cycle.html` — log entry form + phase badge + energy ring
2. Wearable integration: cross-reference `wearable_data.metric = 'basal_temperature'` to confirm/refine phase prediction
3. Phase-change notifications: if `notify_phase_change = true`, send SMS when phase transitions (uses NotificationService)
4. Perimenopause mode: flag irregular cycles, widen phase uncertainty windows, surface coaching prompts
