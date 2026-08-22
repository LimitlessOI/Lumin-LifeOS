<!-- SYNOPSIS: Emergency cold-start pointer for the single active BuilderOS engine. Generated packet should replace this when cold-start:gen next runs. -->

# AI Cold Start — Abbott

> **CURRENT OPERATING POINTER — 2026-08-22**
> Abbott is the sole active BuilderOS engine. Costello is parked/reference-only.
> This file had drifted into generic AI-project boilerplate and was unsafe as an agent entry point. `scripts/generate-cold-start.mjs` remains the canonical generator and may replace this pointer with the full generated packet.

## Read order

1. `docs/AGENT_RULES.compact.md` — compact enforcement packet.
2. `docs/constitution/NORTH_STAR_SSOT.md` — supreme law when the compact packet is insufficient or a load-bearing interpretation is required.
3. `docs/constitution/FOUNDER_AI_OPERATING_PROTOCOL.md` — current operating direction; subordinate to North Star.
4. `prompts/00-HIST-LEGACY-BOUNDARY.md` — distinguish active systems from salvage/history.
5. `builderos-reboot/POINT_B_TARGET.json` — what Abbott is building now.
6. The target mission's `FOUNDER_PACKET.md`, `BLUEPRINT.json`, acceptance command, and receipts.
7. `docs/products/builderos/PRODUCT_HOME.md` and owning product `PRODUCT_HOME.md` only as needed for context and product governance.
8. Runtime evidence and receipts decide what is actually working. Prose never upgrades a failed or unproven runtime to PASS.

## Dumb-AI rules

- **One engine:** Abbott. Do not repair, schedule, or advance Costello unless the founder explicitly reactivates it.
- Costello is a **parts car / lessons source** only. Port a Costello idea into Abbott only after verifying it against Abbott's current architecture and target.
- Do not infer authority from filenames containing `constitution`, `framework`, `protocol`, `master`, `current`, or `SSOT`. Follow the authority chain above.
- Dated governance snapshots, red-team reports, recommendations, conversation dumps, and legacy-history files are evidence/history, not current authority unless a current authoritative file explicitly incorporates them.
- If two active-looking files disagree about Point B, engine identity, PASS/FAIL state, or execution authority, **HALT the conflicting action and resolve against the North Star + current Point B + receipts/runtime evidence.** Do not average the documents.
- Do not create a second implementation merely because an older path exists. Prefer the current Abbott path; archive/retire stale duplicates once callers and enforcement references are checked.

## Current objective

Make Abbott reliable enough to build continuously from authored blueprints, detect its own failures, repair the fixer when possible, and report typed blockers instead of silently stopping or fabricating success.

Costello can teach Abbott. Costello is not the project.
