# SSOT dual channel — agents vs system

**Purpose:** Separate *who needs what* without maintaining two copies of the same law.  
**Parent authority:** `docs/SSOT_NORTH_STAR.md` (NSSOT) and `docs/SSOT_COMPANION.md` (Companion) — nothing in this file overrides them.

---

## The problem you named

You want:

1. **Channel A — Builder / agents** — enough context to ship safely (epistemics, builder loop, receipts, lane routing) without reading 400 lines of constitution every session.
2. **Channel B — System** — the whole picture: mission, operations, capabilities, env, amendments, manifests — what the platform *is* and how it reaches the North Star.

You do **not** want: **two prose SSOTs** that both change every time policy moves (double edits, guaranteed drift).

---

## Solution: one canonical tree, many *views*

| Layer | Role | Edit rule |
|--------|------|-----------|
| **Canonical (human law)** | NSSOT, Companion, `docs/projects/AMENDMENT_*.md`, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `CLAUDE.md` | Edit here when truth changes. Read-before-write rules apply to SSOT-class files. |
| **Derived (machine/agent packet)** | `docs/AGENT_RULES.compact.md` | **Do not hand-edit for policy.** Change `scripts/generate-agent-rules.mjs`, then `npm run gen:rules`. Token budget enforced by `.compact-rules-baseline`. |
| **Routing / queue (conductor)** | `docs/QUICK_LAUNCH.md`, `docs/CONTINUITY_INDEX.md`, lane logs, `docs/AI_COLD_START.md` | Update when priorities or lane facts change; regenerate cold-start when QUICK_LAUNCH shifts materially. |
| **Runtime capability matrix** | `docs/SYSTEM_CAPABILITIES.md`, `docs/ENV_REGISTRY.md` | Update when HTTP paths, scripts, or env gates change. |
| **Per-product spec** | Amendment body + optional `*.manifest.json` | Executable truth for a lane; CI/readiness scripts consume manifests where wired. |

**Rule:** If you catch yourself writing the same constitutional sentence in two markdown files, **stop** — put it in NSSOT or Companion once, then **link or generate**.

---

## Channel A — Agents helping you build (Conductor / IDE)

**Goal:** Minimum context to comply with Article II (especially §2.6, §2.11, §2.11c, §2.12, §2.15) and not drift.

**Read order (typical session):**

1. `docs/AGENT_RULES.compact.md` — generated enforcement packet (~800 tokens target).
2. `prompts/00-LIFEOS-AGENT-CONTRACT.md` — epistemic baseline (§2.6, §2.11, §2.15).
3. `prompts/00-SSOT-READ-SEQUENCE.md` — **ordered** SSOT reads (anti-hallucination / anti-drift).
4. `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think-tier vs execute-tier models (incl. builder `execution_only`).
5. `docs/QUICK_LAUNCH.md` — lane + current queue.
6. `docs/CONTINUITY_INDEX.md` → correct lane log → newest `## [TAG] Update`.
7. `prompts/<domain>.md` if working a domain.
8. Owning amendment: `## Agent Handoff Notes` + last 3–5 `## Change Receipts` rows.

**Non-human → TSOS (North Star §2.14):** Anything bound for **machinery** (not natural language to a person) uses **`docs/TSOS_SYSTEM_LANGUAGE.md`** and the platform **compression stack** on council traffic. **Exception:** plain language to **humans**, including **§2.11b** reports to Adam — see `prompts/00-LIFEOS-AGENT-CONTRACT.md`.

**When to open full NSSOT / Companion:** constitutional edits, conflicts, first-time onboarding, or any change that redefines mission, gates, or “what wins all conflicts.”

**Not duplicated here:** the text of Articles I–VII — that stays in NSSOT only.

---

## Channel B — System (whole picture / “get there”)

**Goal:** Everything an operator or architect needs to see how the platform implements the North Star: products, infra, self-serve APIs, gaps.

**Read order (architecture / audit):**

1. `docs/SSOT_NORTH_STAR.md` — mission, non-negotiables, priority law.
2. `docs/SSOT_COMPANION.md` — operations, enforcement, technical specs, gate-change HTTP, etc.
3. `docs/projects/INDEX.md` — amendment registry + revenue priority.
4. `docs/SYSTEM_CAPABILITIES.md` + `docs/ENV_REGISTRY.md` — what the running system can do and what it needs.
5. Per-lane: owning amendment + manifest (if present) + `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md` for “can this be built from spec alone?”

**Runtime / memory note:** Boot may load `docs/SOURCE_OF_TRUTH.md` into memory as a system fact for some AI paths; that is a **narrow operational SOT**, not a substitute for NSSOT + amendments. Packaging (e.g. Docker) must include the docs you rely on in production.

---

## Relationship to “NSSOT” naming

- **NSSOT** = **North Star SSOT** = `docs/SSOT_NORTH_STAR.md` only (constitution).
- **SSOT** in conversation = the whole canonical tree (NSSOT + Companion + amendments + operational docs above).
- **This file** = **routing document** only — it does not add new law.

---

## Maintenance cheatsheet

| You changed… | Also update… |
|--------------|----------------|
| Supreme law / Article text | NSSOT (and Companion if ops language must align); then consider whether `generate-agent-rules.mjs` needs a new row; `npm run gen:rules`. |
| Builder / preflight / GAP-FILL | Companion if formal; always `generate-agent-rules.mjs` + regen compact; `QUICK_LAUNCH` if queue changes. |
| A product feature’s spec | Owning amendment (+ manifest + Change Receipts); `SYSTEM_CAPABILITIES` if new routes/scripts; lane log. |
| Env / Railway self-serve | `ENV_REGISTRY.md`, `SYSTEM_CAPABILITIES.md`. |

**Avoid:** Editing `AGENT_RULES.compact.md` directly for policy — it will be overwritten on next `gen:rules` or pre-commit.

---

## SSOT

- **Amendment 36** — handoff + cold-start protocol (infrastructure owner for continuity tooling).
- **Amendment 21** — LifeOS founding SSOT (epistemic contract, LifeOS backlog).
