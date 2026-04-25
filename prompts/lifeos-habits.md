# Domain: Habits (Identity Tracker)

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)

**Last updated:** 2026-04-19  
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`  
**Owning service:** `services/lifeos-habits.js`  
**Owning routes:** `routes/lifeos-habits-routes.js`  
**Mounted at:** `/api/v1/lifeos/habits`

---

## What This Domain Does

Minimal recurring habit lane with identity framing:
- Define a habit (`title`, optional `identity_statement`, `frequency`)
- One-tap daily check-in
- Streak + misses summary
- Reflection question when misses reach 3 in 7 days

This closes the P1 habits gap called out in Amendment 21.

---

## API Surface

```http
GET  /api/v1/lifeos/habits?user=adam
POST /api/v1/lifeos/habits
POST /api/v1/lifeos/habits/:id/checkin
GET  /api/v1/lifeos/habits/summary?user=adam&days=7
```

---

## Next Approved Task

Add a small overlay surface (Today or a dedicated habits page) for:
- create habit
- one-tap check-in
- summary + reflection question
