# SSOT read sequence — anti-hallucination, anti-drift

**Read after:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)  
**Pairs with:** [`00-MODEL-TIERS-THINK-VS-EXECUTE.md`](00-MODEL-TIERS-THINK-VS-EXECUTE.md), [`docs/SSOT_DUAL_CHANNEL.md`](../docs/SSOT_DUAL_CHANNEL.md)

---

## Why order matters

Models **confabulate** when asked to “know” the whole system without reading. **Drift** happens when an agent assumes an old mental model after SSOT changed. **Fixed read order** reduces both: you **ground** claims in files you actually opened, in **priority** order.

---

## Channel A — Agents / Conductor (build sessions)

Use this **before** writing or dispatching `/builder/build`.

| Step | Read | Purpose |
|------|------|---------|
| A0 | `docs/AGENT_RULES.compact.md` | Token-light enforcement (generated; regen via `npm run gen:rules`). |
| A1 | `docs/QUICK_LAUNCH.md` | Current queue + lane; don’t build the wrong priority. |
| A2 | `docs/CONTINUITY_INDEX.md` → **your lane log** (newest entry) | What the last session actually did. |
| A3 | `prompts/00-LIFEOS-AGENT-CONTRACT.md` | §2.6 / §2.11 / §2.15 baseline. |
| A4 | `prompts/<domain>.md` (if any) | 30-second domain truth. |
| A5 | Owning amendment: **Agent Handoff** + last **3–5 Change Receipts** | Specced state vs stubbed. |
| A6 | **Only if** editing constitutional text: full `docs/SSOT_NORTH_STAR.md` and/or `docs/SSOT_COMPANION.md` (read-before-write) | Supreme law edits. |

**Laws while reading**

1. **Do not summarize SSOT from memory** — if you cite it, you **opened** it this session (or say **THINK/GUESS**).
2. **KNOW / THINK / GUESS / DON’T KNOW** — label claims about prod, env, or “what ships.”
3. **Injected beats imagined** — repo file bodies in builder `files[]` override your prior belief about code.
4. **If two sources conflict** — stop; reconcile with git/SSOT or ask Adam; don’t silently pick one.
5. **Non-human → TSOS compression** — **Other than** talking **to a human**, use the **TokenSaverOS** machine channel: **`docs/TSOS_SYSTEM_LANGUAGE.md`**, `[TSOS-MACHINE]` where specified, and expect **council-service** compression layers on provider traffic (Amendment 01). Plain English is for **people** (including **§2.11b** to Adam), not a substitute for machinery lexicon.

---

## Channel B — System / architecture (whole picture)

Use when you need **how the platform fits together**, not just the current task.

| Step | Read | Purpose |
|------|------|---------|
| B1 | `docs/SSOT_NORTH_STAR.md` | Mission, non-negotiables, what wins conflicts. |
| B2 | `docs/SSOT_COMPANION.md` | Operations, gates, builder/council HTTP, enforcement. |
| B3 | `docs/projects/INDEX.md` | Amendment registry + revenue order. |
| B4 | `docs/SYSTEM_CAPABILITIES.md` + `docs/ENV_REGISTRY.md` | What runtime can do; env names. |
| B5 | `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md` | Whether specs are build-complete. |
| B6 | Per-product: owning `AMENDMENT_*.md` + manifest | Executable spec for that lane. |

Same **laws:** label uncertainty; don’t invent APIs or tables not in spec.

---

## Builder-specific

- **Plan first (`mode: plan`)** when scope is fuzzy or cross-file. **Code (`mode: code`)** when spec + `files[]` are complete.
- **`execution_only: true`** (see `lifeos-council-builder.md`) = spec is **frozen**; model should **implement**, not redesign. Use only when Conductor has already thought it through.

---

## SSOT

- `docs/SSOT_DUAL_CHANNEL.md` — canonical vs agent views.
- `prompts/lifeos-council-builder.md` — API + model routing.
