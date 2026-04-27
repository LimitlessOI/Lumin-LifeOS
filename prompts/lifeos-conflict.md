# Domain: Conflict Intelligence

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).

**Last updated:** 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning service:** `services/conflict-intelligence.js` (+ `services/mediation-engine.js`)
**Owning routes:** `routes/lifeos-conflict-routes.js`
**Mounted at:** `/api/v1/lifeos/conflict`

---

## What This Domain Does

Helps couples navigate conflict in the healthiest way possible. Two levels:
1. **Interruption system** — detects Gottman's Four Horsemen (contempt, criticism, defensiveness, stonewalling) in text; sends a gentle intervention if the user has it turned on
2. **Mediation** — structured joint session where both sides are heard; the AI facilitates without taking sides

This domain is also linked to [Amendment 25 — Conflict Arbitrator](../docs/projects/AMENDMENT_25_CONFLICT_ARBITRATOR.md) for the deeper arbitration product.

---

## Tables Owned (existing + planned)

| Table | Purpose | Status |
|---|---|---|
| `conflict_sessions` | Active conflict/mediation sessions | exists |
| `conflict_messages` | Messages within sessions | exists |
| `conflict_patterns` | Learned patterns per user | exists |
| `conflict_resolutions` | Resolution outcomes | exists |
| `conflict_interrupt_enabled` | Per-user column on `lifeos_users` | ✅ added (`20260419_conflict_interrupt.sql`) |
| `conflict_interrupt_sensitivity` | Per-user sensitivity (low/medium/high) | ✅ added (`20260419_conflict_interrupt.sql`) |

---

## Services

```
createConflictIntelligence({ pool, callAI, logger })
  (existing) — startSession, addMessage, getPatterns, getSessions, etc.

Built:
  .detectEscalationInText(text, { sensitivity? })
      → { triggered: bool, horseman: string|null, confidence: number, flooding: bool, suggestion: string }
  .getInterruptSettings(userId)
      → { enabled: bool, sensitivity: 'low'|'medium'|'high' }
  .updateInterruptSettings(userId, settings)
```

---

## Route Surface (existing)

```
POST /api/v1/lifeos/conflict/session      start session
GET  /api/v1/lifeos/conflict/sessions     list sessions
POST /api/v1/lifeos/conflict/message      add message
GET  /api/v1/lifeos/conflict/patterns     get patterns
GET  /api/v1/lifeos/conflict/sessions/:id get session

POST /api/v1/lifeos/conflict/interrupt/check     detect escalation in text
GET  /api/v1/lifeos/conflict/interrupt/settings  get user's interrupt preferences
PUT  /api/v1/lifeos/conflict/interrupt/settings  update interrupt preferences
```

---

## Model Guidance

| Task | Model | Why |
|---|---|---|
| `detectEscalationInText()` | `groq_llama` | Pattern classification, cheap/fast |
| Mediation session AI responses | `gemini_flash` | Nuanced, impartial facilitation |
| Pattern learning | no AI, pure DB aggregation | No cost |

---

## Four Horsemen Detection (Gottman Research)

The escalation detection should flag these patterns:

| Horseman | Example signals |
|---|---|
| **Contempt** | "you always", "you never", "you're such a", eye-roll emoji, mockery |
| **Criticism** | "you never listen", "you're selfish", character attacks (not behavior) |
| **Defensiveness** | "that's not my fault", "you started it", counter-attacks disguised as defense |
| **Stonewalling** | "whatever", "fine", sudden silence cues, "I'm done talking" |

Detection is rule-based keyword + LLM confirm (two-stage, cheaper). Does NOT auto-send to partner. Surfaces only to the user who typed it.

---

## The Intervention Style

When triggered, the system does NOT say "stop that." It says something like:
> "Lumin noticed some tension in what you're typing. Want to take a breath before sending? You can still send it — just wanted to flag it."

User can dismiss, turn off interventions, or see a reflection of what was detected.

---

## Next Approved Task

Conflict interruption core + in-chat settings controls are shipped.

Next in this lane: add richer intervention UX (e.g., rewrite suggestion actions) and optional per-thread snooze.
