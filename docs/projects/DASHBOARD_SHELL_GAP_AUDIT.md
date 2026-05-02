# Dashboard shell gap audit (refreshed)

**Updated:** 2026-05-03  
**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/LIFEOS_PROGRAM_MAP_SSOT.md`

## Context (correcting the prior draft)

An earlier version of this file claimed `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` was missing; that was **stale / wrong**. The brief lives at **`docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`**.

**Architecture:** `public/overlay/lifeos-app.html` is the **shell** (desktop sidebar, mobile bottom tabs, Lumin drawer). `public/overlay/lifeos-dashboard.html` is **iframe content** — it correctly does **not** duplicate the global sidebar; chrome comes from the parent shell.

## Current wiring (verified paths)

| Concern | Where it lives |
|---------|----------------|
| Desktop sidebar + mobile tabs | `lifeos-app.html` |
| Dashboard page body + widgets | `lifeos-dashboard.html` |
| Shared tokens | `public/shared/lifeos-dashboard-tokens.css` |
| AI rail styles / script | `public/shared/lifeos-dashboard-ai-rail.css`, `public/shared/lifeos-dashboard-ai-rail.js` |
| Theme | `lifeos-theme.js` (shell + iframe messaging) |

## Fixes applied (2026-05-03)

- **`lifeos-dashboard.html` — invalid CSS “comments”** using `/ … /` were replaced with proper `/* … */`. Trailing `/ comment /` after declarations in the `min-width: 1000px` block were removed or converted. This was breaking parse/fallback for following rules in some engines.
- **`@keyframes ring-fill`** no longer animates `stroke-dashoffset` (conflicted with **inline** `stroke-dashoffset` from `makeRing()`). It now does a short **opacity** intro only.

## Remaining gaps vs brief (human check)

Use the mockup PNGs under `docs/mockups/` and the **Required dashboard shape** section of the brief for pixel/IA parity. Items still typically tracked in the builder queue (not all shipped):

- Full **persistent AI rail** behavior vs contract (`docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md`).
- **Category** model (Today / Health / Family / Purpose stubs) vs brief “expansion stack.”
- **Density** modes (compact / balanced / expanded) across cards.

## Recommended next steps

1. Re-run a **queue** task that produces a gap table against the **current** brief + injected `lifeos-dashboard.html` + `lifeos-app.html` (avoid ENOENT assumptions).
2. Add a **lint** step for overlay `<style>` blocks (reject lines matching `^/\s+[─\-]`) in CI or `scripts/` smoke.
