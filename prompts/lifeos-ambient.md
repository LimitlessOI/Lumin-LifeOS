# Domain: Ambient Context (Opt-in Snapshots)

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)

**Last updated:** 2026-04-22  
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`  
**Owning service:** `services/lifeos-ambient-context.js`  
**Owning routes:** `routes/lifeos-ambient-routes.js`  
**Mounted at:** `/api/v1/lifeos/ambient`

---

## What This Domain Does

Opt-in lightweight context snapshots. User enables in Settings. Device sends a `signals` object (time-of-day hints, battery level, location coarseness, etc.) — no audio or video. Snapshots are stored and read by Lumin to personalize responses without requiring a full daily check-in.

This is coarse device telemetry only. NOT raw audio/video. True background sensing needs native iOS/Android wrapper — not in scope here.

---

## Tables

Migration: `db/migrations/20260423_lifeos_ambient_snapshots.sql`

Primary table: `lifeos_ambient_snapshots` — columns include `id`, `user_id`, `signals` (JSONB), `created_at`. Check migration for exact schema before adding columns.

---

## API Surface

```http
POST /api/v1/lifeos/ambient/snapshot   — requireKey; body: { user?, signals: {} }
GET  /api/v1/lifeos/ambient/recent     — requireKey; query: user, limit (default 8)
```

---

## User Resolver Pattern

All endpoints resolve `user` handle → numeric `user_id` via:
```js
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
const resolveUserId = makeLifeOSUserResolver(pool);
const userId = await resolveUserId(user);
```

---

## What NOT to Touch

- Do NOT add audio/video capture. Device hints only.
- Do NOT build a background scheduler here — ambient is user-triggered or lightweight device push, not server-side polling.

---

## Next Approved Task

1. **Smoke test** — confirm `20260423_lifeos_ambient_snapshots.sql` applied on Neon. `GET /api/v1/lifeos/ambient/recent?user=adam` should return rows after user enables ambient in Settings.
2. **Settings toggle** — ensure the enable/disable toggle in `lifeos-settings.html` (or equivalent) persists to user prefs and the overlay respects it.
3. **Lumin integration** — Lumin chat should read the 3 most recent snapshots and factor signal patterns into response tone (e.g., late-night low-battery → quieter, less demanding response).
