<!-- SYNOPSIS: LifeOS UX architecture — Lumin-first adaptive environment -->

# LifeOS UX architecture — Lumin-first adaptive environment

| Field | Value |
|-------|--------|
| **Owner** | LifeOS / `AMENDMENT_21` |
| **Status** | Active — principles SSOT (2026 brainstorm → law) |
| **Canonical with** | `docs/LIFEOS_PROGRAM_MAP_SSOT.md`, `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/mockups/DASHBOARD_UI_MAP.md`, North Star **Article II §2.6** |
| **Updated** | 2026-05-11 (v1 modes spec anchor) |

## Purpose

This document **locks interaction law** so builders and councils do not accidentally ship “another dashboard app.” It **extends** (does not replace) mockup-driven shell rules: sidebar, bottom tabs, rail, density, and breakpoints in **`DASHBOARD_UI_MAP.md`** remain **hard layout constraints** until explicitly amended with receipts (and **§2.12** / gate-change when load-bearing).

**North star UX sentence:** *Reduce friction between **intention** and **aligned action**.*

LifeOS is a **persistent adaptive life environment**, not a pile of disconnected pages. The **web still uses routes and iframes** under the hood; the **experience** should feel like **one space**: shared shell, shared context, smooth transitions, same Lumin thread where possible.

---

## The re-ranking (what changed conceptually)

| Before (risk) | Now (intent) |
|---------------|--------------|
| Dashboard = primary “app” | **Lumin / presence = primary interface layer** |
| Widgets compete for attention | Dashboard = **visual cognition support** (glance, orient, reflect) |
| User navigates feature soup | User **lives in** a conversational + contextual environment |
| Same home always shouts | **Home is contextual** — what rises changes with mode, time, energy, commitments |

**Lumin is not “a feature.”** It is the **default way in** and the **coordination surface** for capture, planning, execution, reflection, and (bounded) memory — per **`AMENDMENT_21`** Lumin section.

---

## Four levels of UI hierarchy (always use this vocabulary)

| Level | Name | Role |
|-------|------|------|
| **1** | **Presence** | Lumin always **reachable**: voice, type, strip, rail, FAB — **states** must be explicit (off / push-to-talk / session), never “surprise listening.” |
| **2** | **Context** | **Mode / lens** (see below): sets emotional tone, density, and what the system **emphasizes**. |
| **3** | **Focus** | **What matters right now** — small set of actions or signals; not the whole OS. |
| **4** | **Depth** | Detailed dashboards, lists, analytics — **entered on purpose** (Today, Health, Money, Integrity, calendar, memory timeline, operator queues, etc.). |

**Rule:** Level 4 must never **collapse** into Level 1 on the home surface. That prevents overwhelm.

---

## Five layers (stack model)

### Layer A — Ambient Lumin layer (primary)

Persistent conversational presence: listen (when consented), speak, capture, summarize, organize, propose, reflect. **UI forms:** conversational strip, rail, orb/ring metaphors, voice state indicator, floating entry — must stay **honest** about when the mic is live.

### Layer B — Swipe / mode layer (contextual atmospheres)

Horizontal **lenses**, not “nine separate apps.” Each mode changes **priorities, density, pacing, and tone** — e.g. Calm, Focus, Family, Operator, Recovery, Reflection, Brainstorm (full set is **backlog**; **v1 = four modes only** — see **## v1 modes** below).

**Implementation truth:** v1 may be **saved `home_context` + density + emphasis flags**, not visually distinct engines per mode.

### Layer C — Deep surfaces (intentional depth)

Category dashboards and tools aligned with **`LIFEOS_DASHBOARD_BUILDER_BRIEF.md`** suggested categories (Today, Health, Inner, Family, Purpose, Work, Money). Vertical scroll inside category; horizontal swipe **between** categories on mobile remains valid.

### Layer D — Background intelligence

Twin, memory, ambient jobs, pattern detection — **epistemic contract**: KNOW vs THINK vs receipts; no fake “green” states (**§2.6**).

### Layer E — Device / modality layer

Phone, desktop, later TV / wearables / robotics. **Modality-flexible:** speaking, typing, glancing, walking. **Phase:** ship **phone + desktop + voice/text** first; same account + state model so new devices attach without rewriting the soul.

---

## Emotional ergonomics (product requirement)

When signal suggests **stress, fatigue, or overload** (user-stated tags, depletion check-in, or optional future automated hints — only with consent):

- **Simplify** Level 3 (fewer items).
- **Slow** pacing (less motion; fewer nudges).
- **Reduce pressure** (no streak shame; no “catch up” dumps).
- **Calm** visuals per token system.

This is **not** decoration; it is **safety and sovereignty** in UX form.

---

## Contextual home (example only — not prescriptive data)

| Situation | Level 3 emphasis (example) |
|-----------|----------------------------|
| Morning | Focus, top commitments, emotional weather, light relationship awareness |
| Evening | Reflection, integrity check-in, recovery, memory highlights |
| Brainstorm | Loose capture, low structure, idea parking |
| Operator | Queues, metrics, execution — **does not replace** LifeOS consumer calm for non-operator users |

---

## v1 modes (spec anchor — four only)

**Scope:** Behavioral and emphasis contract for **Level 2 (Context)** + **Level 3 (Focus)** on **home**. **Does not** amend **`DASHBOARD_UI_MAP.md`** (sidebar, bottom tabs, rail, breakpoints stay law). **Does not** require four separate visual themes on day one — v1 may ship as **`home_context` / `lifeos_mode`** persistence + **re-ordered Focus row + density + Lumin thread tone** only.

**North Star alignment (KNOW from NSSOT):** §2.10 ¶7 *calm core vs adaptive modules* → Calm is the default **core** posture; Operator is an **adaptive** lens for the sole operator, not the default consumer shell. §2.6 → no misleading “all healthy” from condensed operator cards. §2.11 / §2.11c → product implementation still prefers **`POST /build`** when touching overlay; this section is **spec** for that build.

| Mode | Calm | Focus | Family | Operator |
|------|------|-------|--------|----------|
| **Purpose** | Default daily mirror: low pressure, truth without pile-on, recovery-friendly pacing. | Execution: MITs, calendar, commitments, “do the next right thing.” | Household + relationship: shared promises, repair, parenting adjacency (consent-gated). | Founder command: queues, builder/TSOS health, deploy/env signals, operator ledger — **Adam-facing program slice**, not the default LifeOS home for non-operators. |
| **Top of home (Level 3)** | Gentle **Today** mirror: emotional weather / intention / one integrity or joy glance — **not** a full analytics wall. | **MIT row** + next hard commitment or next calendar block (time-aware). | **Shared commitments** or relationship pulse card + **one** optional connection/repair prompt (only if household features opted in). | **Next queue slice** or builder gaps summary + operational grade / doctor pointer + optional OCL-style consumption rollup **when that product exists**. |
| **Lumin behavior** | Shorter, warmer defaults; fewer proactive suggestions unless user speaks first; reflection-first language. | Crisp, execution-oriented; one clarifying question at a time; avoids opening new life domains unprompted. | Warm; uses **only** household-permitted context; surfaces repair scripts **never** as surveillance. | Terse; may use **receipt-style** summaries; links to depth (logs, queues) — still honest **KNOW/THINK** on load-bearing claims per **§2.6**. |
| **Card density** | **Balanced**; may auto-**compact** only under emotional ergonomics rules (stress / overload). | **Compact** by default (more rows without breaking token/density SSOT in Brief). | **Balanced**; fewer simultaneous cards than Focus — emotional bandwidth over throughput. | **Compact** default; operator may opt **expanded** later — still within Brief density tokens, not a new layout grid. |
| **Mobile behavior** | **`DASHBOARD_UI_MAP`**: bottom tabs + main scroll; **no** second permanent nav bar; Lumin strip + FAB unchanged. | Same shell; Focus content **first** in main column; horizontal swipe **between categories** only for intentional depth (Level 4), not as home chaos. | Same; sensitive threads behind clear entry; **revoke / consent** reachable without digging. | Same **bottom tabs** (law); operator widgets live in **main column**, not a replacement shell. |
| **Desktop behavior** | **`DASHBOARD_UI_MAP`**: left sidebar + scrollable widget region + rail; Calm **re-orders** which widgets float up, **not** which chrome exists. | Sidebar + execution-first widget ordering in main column. | Sidebar; family modules emphasized in Focus row — sidebar category list unchanged unless Brief amended. | Sidebar; operator stack at **top of main column**; **Command Center omnibus** remains **defer** per **Amendment 21** unless separately green-lit. |
| **What must NOT happen** | Streak guilt, “catch up” dumps, burying bad news in cheerfulness (**§2.6**), operator queues as default for all users. | Sneaking family/clinical/finance depth into home without navigation; infinite scroll of unrelated widgets. | Surveillance framing; partner data without **both-sides** consent rules; conflict escalation UI without gates. | Defaulting **all** users into Operator; conflating **TokenOS/B2B** with consumer LifeOS; removing Lumin or rail; **KNOW** claims from empty IDE env (**NSSOT §2.3**). |

**Implementation note (THINK):** Persist `mode` + `mode_updated_at` in `lifeos_users.flourishing_prefs` or a dedicated column when schema work is approved — until then, **session/local** prototype is acceptable **only** if labeled **stub** in builder metadata and receipts.

---

## Governance — how this stays true

1. **Principles before pixels** — this file + **`DASHBOARD_UI_MAP.md`** + Brief are read before overlay **`/build`** tasks (queue auto-injects bundle).
2. **Material change to layout law** (e.g. removing sidebar as primary desktop nav) → **Amendment / brief / mockup** path + **`npm run lifeos:gate-change-run`** on live app when load-bearing (**§2.12**).
3. **Background AI** → **`createUsefulWorkGuard()`** for scheduled work; no idle token burn (**Zero Waste**).
4. **Always-on audio** → opt-in, visible state machine, documented in SSOT — not marketing copy only.

---

## v1 build guidance (phased)

1. **Prove Lumin-first + contextual home** using the **four v1 modes** table above — ship a **thin vertical slice** (e.g. **Calm ↔ Operator** or **Calm ↔ Focus** persistence + Focus row + density + Lumin tone) before adding new mode names.
2. **Same state model** for drag layout and chat commands (“move Health up”) — preview → **Apply** → **Undo**.
3. **Extend** rail/strip behavior per **`DASHBOARD_AI_RAIL_CONTRACT.md`**; do not fork a second chat system without SSOT.

---

## Related documents

| Doc | Role |
|-----|------|
| `docs/mockups/DASHBOARD_UI_MAP.md` | Shell IA checklist (sidebar, tabs, rail, breakpoints) |
| `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` | Builder + density + category list |
| `docs/LIFEOS_PROGRAM_MAP_SSOT.md` | URLs, queue pointer, authority order |
| `docs/products/lifeos/PRODUCT_HOME.md` | Product layers, Lumin intent, backlog |
| `docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md` | AI rail behavior contract |
