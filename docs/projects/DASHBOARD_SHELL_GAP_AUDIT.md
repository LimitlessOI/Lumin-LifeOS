# Gap Audit: LifeOS Dashboard vs `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`

**Supersedes:** prior `[system-build]` version that falsely claimed SSOT docs were absent (model ignored injected file contents).

**Evidence date:** KNOW from repo paths `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `public/overlay/lifeos-dashboard.html`, `public/overlay/lifeos-app.html`.

## Summary

`lifeos-dashboard.html` is a **standalone** dashboard overlay (deep-linked at `/overlay/lifeos-dashboard.html`) with MITs, calendar, goals, scores, embedded chat/voice strip, `html[data-theme="light"|"dark"]` tokens, Tailwind CDN, bootstrap. It does **not** mount inside `lifeos-app.html` sidebar/bottom-tab chrome.

`lifeos-app.html` is the **canonical shell**: desktop sidebar + mobile bottom nav + Lumin drawer/sheet (`PAGE_META`-driven routing).

The builder brief assumes **every dashboard shares the persistent shell layout** plus category dashboards and swipe; that is closer to **`lifeos-app.html`** evolution than to the standalone `lifeos-dashboard.html` page unless we explicitly unify them.

## Gaps vs brief (concrete)

1. **Shell parity** — Brief: desktop sidebar + mobile bottom tabs everywhere. **`lifeos-dashboard.html`**: no app shell chrome; standalone page layout. Gap: unify entry (dashboard inside app iframe/route) OR document standalone as legacy route pending merge.
2. **Category dashboards + horizontal swipe** — Brief: swipe between Today/Health/etc. **`lifeos-app.html`** has Bottom nav routing; **`lifeos-dashboard.html`** stacks sections vertically. Gap: swipe container not implemented per mockup density board.
3. **Persistent dockable AI rail (global)** — Brief: collapsible strip, dock top/bottom across all screens. **Partial**: dashboard embeds chat; app shell uses Lumin drawer — contract not consolidated as one “rail” component reused across overlays.
4. **Shared semantic tokens file** — Brief: deliberate light/dark. Dashboard has strong inline `:root` + `[data-theme]` (good); not yet consolidated with `scripts/builder-smoke/dashboard-layout-utils.mjs` density helpers wire-up.
5. **Mockups as gates** — `docs/mockups/*.png` exist per brief naming; overlays should visually cross-check (operator review), not purely automated yet.

## Recommended next builds (queued)

Ordered in `LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json`:

1. ✅ Audit (this document) → theme tokens CSS file → minimal wire into dashboard.
2. Then **either** refactor dashboard route to render inside **`lifeos-app.html`** iframe/slot OR add nav wrapper without breaking `/overlay/` static hosting.
3. Implement AI rail prototype as shared snippet behind feature flag (`localStorage`/`URLSearchParams`) — fail-closed rollback.

## Open questions

- Is `/overlay/lifeos-dashboard.html` retained as standalone product surface or deprecated into app-shell-only?
- Single source of truth for theme: `lifeos-theme.js` + page tokens vs centralized `public/shared/lifeos-dashboard-tokens.css` (recommended next commit).
