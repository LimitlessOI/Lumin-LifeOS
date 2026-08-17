<!-- SYNOPSIS: Founder Packet — Taloa Founder Alpha Gap-Fill; historical mission id retained for lineage. -->

# Founder Packet — Taloa Founder Alpha Gap-Fill

**Mission ID:** `FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001` *(historical identifier retained; do not rename without a governed compatibility migration)*
**Current product identity:** **Taloa**
**Former product name:** Lumin
**Authority:** Alpha test findings from founder chat + UI probes (2026-06-28), amended by founder terminology/current-state direction 2026-08-17
**Receipt:** `products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json`

---

## Living-blueprint rule

This packet and its `BLUEPRINT.json` are not merely construction instructions. Together they must remain the canonical account of:

1. Point B / intended functioning outcome.
2. Current measured reality.
3. The already-authored path from current reality to Point B.
4. Material history: what changed, what evidence caused the change, why the prior state was insufficient, and which receipt/commit/artifact proves it.
5. Functional acceptance and any predefined diagnostic/repair branches required to reach it.

A material amendment updates current-state truth but MUST NOT erase the historical path that produced it. Factories do not author decisions or new slices. They execute already-authorized slices and emit evidence. Architect reconciles that evidence into the living blueprint under BuilderOS governance.

---

## Problem

When Adam talks to **Taloa** in the founder interface, it must feel like **Taloa knowing Adam** — not strategic theater, not Point B dumps, not pattern-matched counsel. Build commands must execute. General and system questions must answer from real context.

Historical origin: this mission was created when the product was named **Lumin**. The mission id, old receipts, file paths, code identifiers, and historical evidence may therefore still contain `Lumin`. Those occurrences are lineage/compatibility evidence, not current product naming.

Alpha testing originally found:

1. **P1** — UI prefixed user bubbles with literal `undefined` when focus prompts were missing.
2. **P1** — Identity questions ("who am I", "my priorities") routed strategic/Point B content because the former product name triggered product-build markers.
3. **P1** — `GMAIL_SIGNUP_EMAIL` on Railway was literal `null`, blocking alpha-auditor test account provision.
4. **P2** — Strategic brief sections still appended on personal turns in some paths.

Current evidence must be taken from the latest canonical acceptance receipt, not from stale narrative notes. If receipt evidence and blueprint prose disagree, Architect must reconcile the blueprint and preserve the superseded diagnosis in history.

---

## Desired Outcome / Point B

Taloa in the founder interface:

- Answers **who Adam is** using personal imprint/memory context — warm, specific, not meta-docs.
- Executes **`do:`** and natural-language UI builds with founder authority.
- Answers system questions (SMOS, BuilderOS path) from real knowledge — no clarify theater.
- Founder alpha battery includes an identity probe that fails on strategic dump language.
- Full functional acceptance passes against the canonical deployed runtime; completing construction slices alone is never mission completion.

---

## FOUNDER SUCCESS TEST

**Adam opens Taloa, asks "who am I to you — what are my priorities?", gets a personal answer grounded in his context (family, freedom, impact), with zero Point B / AGENT CONTINUITY / scoreboard language. A `do:` build completes with a valid PASS receipt, and the complete founder-alpha battery passes on the canonical deployed runtime.**

---

## Blueprint evolution authority

- **Factory:** executes exact pre-authored slices; records actions/evidence; makes no product or architecture decisions.
- **Sentry / acceptance:** measures reality and emits typed evidence.
- **Architect:** owns current-state reconciliation and blueprint amendments that are already within ratified intent/authority.
- **Material issue independent review:** Architect first forms and records a private candidate solution. It then withholds that solution and sends Conductor only the problem statement, evidence, constraints, Point B, and authority boundaries. Conductor independently solves the same problem. Only after both solutions are sealed do Architect and Conductor compare them in a documented **1+1=3 synthesis**. The synthesized result, including agreements, disagreements, rejected alternatives and evidence, is written into blueprint history before new factory slices become executable.
- **Founder:** receives only issues that cross the existing founder-escalation threshold or require new product intent/authority.

The Conductor review must be genuinely independent: no Architect proposed solution, conclusion, or preferred repair may be included in the Conductor prompt before Conductor seals its own answer.

---

## Scope boundary

- In scope: routing, chair/native-facts behavior, UI prompt guards, alpha battery, alpha-auditor env/provision, boot seeder null-email repair, current-state/repair-path blueprint closure, and Taloa-current terminology migration where it does not break compatibility contracts.
- Out of scope: unrelated product feature expansion.
- Naming migration rule: current founder-facing/product prose uses **Taloa**. Historical evidence retains **Lumin** where needed to explain prior reality. Code identifiers, env vars, paths, database objects, receipt ids, hashes, and mission ids are migrated only through explicit governed compatibility slices — never blind search-and-replace.

---

## Failure mode (unacceptable)

- Identity question returns Point B gaps, internal SSOT dumps, or generic GPT patterns.
- Build commands silently no-op or route to counsel-only.
- Test account cannot provision because email env is literal `null`.
- All authored build slices are marked complete while functional acceptance remains failed and no lawful diagnostic/repair slice exists.
- A factory invents a new slice or architectural decision because the blueprint failed to pre-author the next move.
- Blueprint current-state prose disagrees with newer canonical receipt evidence without recording/reconciling the discrepancy.

---

## Acceptance Command

`npm run lifeos:founder-chat:alpha:battery`

Must include identity probe PASS and full battery PASS against the canonical deployed runtime. Historical script/receipt names may retain the former naming until separately migrated under compatibility governance.
