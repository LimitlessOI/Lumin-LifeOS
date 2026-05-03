# Tailwind CDN exit — spike charter (**BUILD_NOW** triage **M02**)

**Status:** charter only — **no** production CSS swap in this doc.

## Problem

Live browser pass (**`LIFEOS_BROWSER_AND_PLATFORM_GRADE_2026-05-08.md`**) **KNOW:** `cdn.tailwindcss.com` emits **console ERROR** (“should not be used in production”) on **`lifeos-app.html`** and **`lifeos-dashboard.html`**.

## Spike outcomes (pick one after measuring)

1. **Tailwind CLI + PostCSS** — build hashed **`lifeos-shell.css`** / **`lifeos-dashboard.css`** into **`public/shared/`**; overlays swap `<script src="cdn…">` for `<link rel="stylesheet">`.
2. **Purge-lite** — if JIT build is heavy: ship **precompiled subset** matching classes-in-use (grep `class=` across overlays) — smaller diff, more manual drift risk.
3. **Defer** — only if Adam accepts console noise until wave-2 — **must** receipt in amendment (**honesty**).

## Acceptance

- [ ] Zero Tailwind CDN requests on `/overlay/lifeos-app.html` and `/overlay/lifeos-dashboard.html`.
- [ ] No regressions on **`npm run check:overlay`** + **`npm run lifeos:supervise:static`**.
- [ ] Light/dark still coherent (**tokens + theme script** unchanged in behavior).

## Queue hook

Add **`tailwind-exit-build`** (or merge into next **`dashboard-*`** codegen row) in **`LIFEOS_DASHBOARD_BUILDER_QUEUE.json`** after spike approval.

**Brainstorm session:** `docs/projects/BRAINSTORM_SESSIONS/lifeos/2026-05-08_operator-uplift/50_TRIAGE.md`.
