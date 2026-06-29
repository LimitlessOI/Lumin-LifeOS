<!-- SYNOPSIS: Command Center Legacy Audit -->

# Command Center Legacy Audit

## Purpose

This audit separates older command/control/dashboard experiments from the canonical Command Center V2 cockpit so Builder and OIL do not duplicate stale surfaces or treat legacy operator tools as the new governed cockpit.

Canonical V2 target:
- `public/overlay/lifeos-command-center.html`

Canonical V2 backend:
- `/api/v1/lifeos/command-center/*`
- OIL receipt endpoints

## Classification Key

- `KEEP_AND_REUSE`
- `SALVAGE_IDEAS_ONLY`
- `LEGACY_ARCHIVE`
- `UNKNOWN_NEEDS_ADAM`

## Audit

| Path | Classification | Purpose | Mounted / Live | Endpoints Called or Exposed | UI ideas worth salvaging | Risk if left as-is |
|---|---|---|---|---|---|---|
| `public/overlay/lifeos-command-center.html` | `KEEP_AND_REUSE` | Canonical V2 executive oversight cockpit | Yes, via `/overlay/lifeos-command-center.html` | Reads `/api/v1/lifeos/builder/ready`, `/api/v1/lifeos/command-center/{phase14,mode,security}`, `/api/v1/oil/receipts*`, `/api/v1/gemini/proof/status`, `/api/v1/pending-adam`, `/api/v1/projects`, `/api/v1/builder/*`, `/api/health` | Executive snapshot cards, phase wheel, receipt-driven health, lower-input oversight layout | Low risk; this is the canonical target |
| `routes/lifeos-command-center-routes.js` | `KEEP_AND_REUSE` | Canonical V2 aggregate backend | Yes, mounted by `startup/register-runtime-routes.js` | Exposes `/api/v1/lifeos/command-center/phase14`, `/mode`, `/security` | Read-only aggregate pattern, `NOT_WIRED` tolerance, receipt-backed security panel | Low risk; canonical backend |
| `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md` | `KEEP_AND_REUSE` | V2 build blueprint | Doc only | N/A | Canonical V2 separation of oversight vs operations | Medium risk if not explicit about legacy boundaries; patched |
| `docs/products/command-center/PRODUCT_HOME.md` | `KEEP_AND_REUSE` | SSOT for command center project | Doc only | Documents both legacy and V2 owned files | Good inventory of owned surfaces and API scope | Medium risk because it still describes broad command center scope; acceptable if V2 blueprint stays canonical for Builder |
| `public/overlay/command-center.html` | `KEEP_AND_REUSE` | Older operational admin dashboard | Yes, via `/command-center` in `routes/public-routes.js` | Through `command-center.js`: ideas, history, twin proposals, Railway env, projects, pending-adam, builder control, council/chat, optimizer, tools status | Dense operator panel composition, auth bar pattern, quick actions, legacy panel grouping | High confusion risk if mistaken for V2 cockpit; patched with visible legacy notice |
| `public/overlay/command-center.js` | `KEEP_AND_REUSE` | Legacy operational dashboard client controller | Indirectly live via `command-center.html` | Calls `/api/v1/chat`, `/api/v1/council/*`, `/api/v1/task`, `/api/v1/system/self-program`, `/api/v1/admin/*`, `/api/v1/reality/snapshot`, `/api/health`, `/api/v1/tools/status`, `/api/v1/auto-builder/status`, plus other legacy operator endpoints | Fetch/auth helpers, panel refresh orchestration, operator shortcuts | High confusion risk if reused as V2 logic; too broad and mixes chat, ops, self-programming, and admin controls |
| `routes/command-center-routes.js` | `KEEP_AND_REUSE` | Legacy admin/ops backend for old dashboard and overlay utilities | Likely yes through `registerServerRoutes(app, ...)` composition in `server.js` | Exposes many legacy endpoints: `/api/v1/tasks/queue`, `/api/v1/admin/ai/*`, `/api/v1/reality/snapshot`, `/api/health`, `/internal/cron/autopilot`, `/internal/autopilot/build-now`, `/api/overlay/*`, backlog, optimizer, phone, trial, etc. | Useful endpoint inventory for legacy operator continuity | High confusion risk if treated as V2 backend; patched with legacy notice |
| `public/overlay/site-builder-command-center.html` | `KEEP_AND_REUSE` | Product-specific Site Builder control center | Available via `/overlay/site-builder-command-center.html` | Uses Site Builder and env-status flows | Good modal auth pattern, product-specific command center separation | Medium naming-confusion risk because it is another “command center,” but it is a different lane |
| `docs/projects/SITE_BUILDER_COMMAND_CENTER_AUDIT.md` | `KEEP_AND_REUSE` | Audit/history for Site Builder command center | Doc only | N/A | Product-specific audit pattern | Low risk if not confused with main cockpit |
| `public/overlay/control.html` | `SALVAGE_IDEAS_ONLY` | Older overlay/autopilot controller utility | Available via `/overlay/control.html` | Calls `/api/overlay/:sid/state`, `/internal/cron/autopilot`, `/internal/autopilot/build-now`, `/api/overlay/status` | Simple utility-console layout, explicit base/key inputs | Medium confusion risk if read as command center V2; patched with legacy notice |
| `public/overlay/lifeos-control-help.js` | `SALVAGE_IDEAS_ONLY` | Contextual help popover module for LifeOS controls | Not specific to Command Center; utility module | None directly; links to `/overlay/lifeos-feature.html?...` | Hover help/popover guidance pattern | Low risk; not a command center surface by itself |
| `public/overlay/command-center.css` | `LEGACY_ARCHIVE` | Stale standalone stylesheet for old command center | Not currently referenced by `command-center.html` | None | Possibly color tokens or small style fragments only | Medium drift/confusion risk because it looks authoritative but is not mounted |
| `public/overlay/voice-controls.html` | `LEGACY_ARCHIVE` | Placeholder voice-controls experiment | Not known to be mounted directly beyond generic overlay file serving | None meaningful; placeholder `startListening()` only | None beyond naming | Medium confusion risk because it looks like a product surface but is only a stub; patched with legacy notice |
| `docs/COMMAND_CENTER_QUICK_START.md` | `LEGACY_ARCHIVE` | Older user guide for the legacy command center | Doc only | References older `/overlay/command-center.html` workflows and self-programming claims | Historical prompt/routing examples only | High confusion risk; patched with legacy header |
| `docs/COMMAND_CENTER_TEST_REPORT.md` | `LEGACY_ARCHIVE` | Old automated test report for legacy command center assumptions | Doc only | References older endpoints and self-programming expectations | Historical bug/test context only | High confusion risk; patched with legacy header |

## Salvage Ideas

- From `public/overlay/command-center.html`:
  - compact auth bar pattern
  - dense card/grid operations layout for secondary admin surfaces
  - quick refresh / pause / resume interactions
- From `public/overlay/command-center.js`:
  - lightweight auth header helpers
  - periodic refresh orchestration
  - multi-panel update sequencing
- From `public/overlay/control.html`:
  - explicit base URL + key controls for maintenance utilities
  - small “status / action / output” utility-console pattern
- From `public/overlay/lifeos-control-help.js`:
  - control help popovers for advanced cockpit actions
- From `public/overlay/site-builder-command-center.html`:
  - product-lane-specific command center separation instead of overloading the main cockpit

## Confusion Risks Removed

- Old `/command-center` surface is now explicitly marked legacy operational admin, not V2 canonical cockpit.
- Old quick-start and test-report docs are now explicitly legacy/reference only.
- Legacy route file is explicitly marked non-canonical for V2 backend work.
- V2 blueprint now explicitly points Builder and OIL at:
  - `public/overlay/lifeos-command-center.html`
  - `/api/v1/lifeos/command-center/*`
  - OIL receipt endpoints

## Recommended Handling

- Keep legacy operational surfaces live until V2 is complete.
- Do not build new work on top of:
  - `public/overlay/command-center.html`
  - `public/overlay/command-center.js`
  - `routes/command-center-routes.js`
- Treat them as operator continuity surfaces and idea mines only.
