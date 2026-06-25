<!-- SYNOPSIS: Lumin — translation layer, cost routing, account capabilities, fluid UI -->

# Lumin Translation & Account Model

**Adam directive — 2026-06-25. Non-theater.**

---

## Core metaphor: translation, not theater

Lumin speaks to humans in **personality** — but personality is a **translation layer**, like converting API JSON into natural language.

```
Real system (APIs, DB, files, receipts, twin)
        ↓
SYSTEM_FACTS (structured truth — command_ran, data, blockers)
        ↓
Translation model (cheapest that can handle the turn)
        ↓
Human-facing prose (tone from communication_profile / twin)
```

**Not theater:** the translator never invents actions, never claims execution unless `command_ran: true` in facts.

**Not a separate chatbot:** the orchestrator (`lumin-chair-orchestrator.js`) gathers facts and routes execution; translation only formats output.

---

## Cost routing (every account)

**Rule:** start at the **lowest API cost** that can handle the turn; escalate only when needed.

| Tier | Typical model | When |
|------|---------------|------|
| **Free / cheap** | `groq_llama` | Short counsel, simple facts, preference chat |
| **Smart** | `gemini_flash` | Long context, medium complexity, onboarding |
| **Capable** | `gemini`, `claude` | Strategic brief, high complexity, failed cheap attempts |

Implementation: `services/lumin-translation-router.js` → `classifyLuminTranslationTurn` + `callTranslationWithEscalation`.

Escalation signals: token volume, build/strategy/legal keywords, Point B channel, strategic brief attached.

---

## Account capabilities (significant difference)

| Capability | Founder / operator | Member / household / client |
|------------|-------------------|----------------------------|
| **Execute builds, missions, terminal** | Yes — when intent clear + gates pass | **No** |
| **Direct platform priority** | Yes — defines what we work on | **No** |
| **Counsel + personal LifeOS** | Yes | Yes |
| **Capture preferences & UI directives** | Yes | Yes |
| **Fluid UI (pin, layout, modules)** | Yes | Yes — **scoped to their account** |
| **Twin simulation ("would Adam/user like this?")** | Full | Per-user twin — **for their UX only** |
| **Product backlog input** | Routes to builder queue | **Logged as feedback** — not build authority |

**Nobody except founder/operator commands what the platform builds.** Everyone else: ideas, fixes, layout wishes → **captured → simulated → applied when safe**.

---

## Preference capture & reaction simulation

When a user says *"I want communication pinned here"* or *"this layout annoys me"*:

1. **Capture** — store in `lifeos_users.flourishing_prefs` (e.g. `ui_directives[]`, `pinned_modules[]`, `layout_overrides`)
2. **Simulate** — twin + Wisdom run: *Prediction: they would prefer X because past choices Y*
3. **Consistent feedback** — if the same ask repeats, escalate from log → auto-apply safe UI change → queue product fix
4. **Apply** — fluid UI reads prefs and re-renders (Adaptive Panel Runtime — Amendment 21 backlog)

Founder twin simulates **Adam's** reactions for **platform** decisions. Member twins simulate **their** reactions for **their** shell only.

---

## Fluid UI (per person)

- Universal overlay shell (`lifeos-app.html`) + stack registry
- Each user: own pins, module order, light/dark, density
- Lumin anticipates from twin + conversation history — offers before asked when confidence high
- User can always override in natural language → captured as directive

---

## Honesty labels (UI + API)

| State | User sees | API |
|-------|-----------|-----|
| Facts only, no execution | `Counsel · Lumin` | `command_truth: NO_COMMAND_RAN` |
| System executed | `Executed · Lumin` | `COMMAND_RAN` / `COMMITTED` + receipt |
| Preference captured | Confirm what was saved | `preference_captured: true` |
| Prediction | `Prediction: …` in prose | twin simulation, not action |

---

## Build order

1. ✅ Translation router + personality uses cost ladder (`lumin-translation-router.js`)
2. 🔲 Wire `account_role` from auth into orchestrator + translation routing
3. 🔲 `ui_directives` capture API + flourishing_prefs schema
4. 🔲 Twin reaction simulator before auto-applying layout changes
5. 🔲 Member feedback → product intake queue (not builder execute)

@ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
