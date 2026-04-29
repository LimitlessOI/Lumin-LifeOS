# LifeOS Dashboard Builder Brief

| Field | Value |
|---|---|
| Owner | LifeOS / AMENDMENT_21 |
| Status | Active build brief |
| Updated | 2026-04-28 |
| Canonical for | Dashboard shell, builder prompts, overnight queue |

## Purpose

This brief constrains the builder so dashboard work is grounded in the LifeOS SSOT, the current shell architecture, and the approved mockup boards. It exists to remove ambiguity before unattended overnight builds.

## Remote truth

- GitHub is source truth.
- Railway is runtime truth.
- Neon is data truth.
- Local repo and shell are mirrors only.

## Required source reads

The builder must treat these as primary grounding inputs before modifying dashboard code:

1. `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
2. `docs/BRAINSTORM_SESSIONS_IDEAS_CATALOG.md`
3. `public/overlay/lifeos-app.html`
4. `public/overlay/lifeos-dashboard.html`
5. `routes/public-routes.js`
6. `startup/register-runtime-routes.js`

## Visual source boards

The builder must follow these boards as visual direction and structure constraints:

- `docs/mockups/lifeos-system-map-board-2x.png`
- `docs/mockups/lifeos-shell-dashboard-architecture-board-2x.png`
- `docs/mockups/lifeos-expansion-stack-board-2x.png`
- `docs/mockups/lifeos-dashboard-density-study-light-dark-mobile-desktop.png`

These boards are not decorative references. They establish required product direction:

- desktop keeps the left sidebar shell
- mobile keeps bottom tabs
- category dashboards may swipe horizontally on mobile
- widgets scroll vertically inside a category dashboard
- persistent AI rail is global, dockable, and collapsible
- both light mode and dark mode are required

## Product intent

The dashboard is not a generic analytics page. It is the operational front door for LifeOS:

- truth-forward daily mirror
- customizable by category
- fast on mobile
- low-clutter under stress
- persistent Lumin access
- able to grow into relationship, health, work, family, commerce, and purpose surfaces without becoming one giant screen

## Hard constraints

The builder must obey all of these:

- Build on the existing LifeOS shell. Do not replace the app architecture casually.
- Preserve working routes, auth assumptions, and bootstrap patterns unless the task explicitly requires a fix.
- Treat desktop and mobile as first-class. Mobile is not a shrunk desktop.
- Support both `light` and `dark` themes.
- Prefer extension over rewrite when existing code is functional.
- Keep navigation stable: desktop sidebar, mobile bottom tabs.
- Make the dashboard customizable by widget visibility, order, and density.
- Assume the persistent AI rail will exist on every dashboard.
- Do not invent hidden backend capabilities. If an API is missing, report it plainly.

## Required dashboard shape

### Desktop

- left sidebar remains
- main content area supports modular widget grid
- AI rail can dock top or bottom
- cards can present compact, balanced, or expanded density

### Mobile

- bottom tabs remain
- each category dashboard is vertically scrollable
- horizontal swipe between category dashboards is allowed and expected
- AI rail can collapse to a one-line strip and expand into transcript view

## Suggested category dashboards

- `Today`
- `Health`
- `Inner`
- `Family`
- `Purpose`
- `Work`
- `Money`

Not every category must ship immediately, but the shell should not block them.

## AI rail requirements

- pinned by default
- dock top or bottom
- collapsed one-line state
- expandable transcript state
- dictation-friendly
- voice/text parity
- supports read-aloud responses

## Light and dark rules

- both themes must be designed, not auto-inverted
- contrast must remain readable in both modes
- card hierarchy and focus states must work in both modes
- the same layout system should support both themes cleanly

## Build philosophy

Use the system to build this incrementally:

1. fix routing and supervision first
2. lock dashboard shell constraints
3. validate the builder on small deterministic objectives
4. then run larger dashboard implementation tasks overnight

Do not jump straight to a giant rewrite.

## Acceptance bar for unattended builds

An overnight dashboard task is acceptable only if:

- target files are named explicitly
- the spec references this brief
- the spec references both light and dark mode
- the spec references mobile and desktop behavior
- the spec states what must not be broken
- the result is validated after commit

