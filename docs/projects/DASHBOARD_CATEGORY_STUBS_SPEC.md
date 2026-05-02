# Category stubs specification — Today · Health · Family · Purpose (draft)

**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/mockups/` (PNG names in brief)

**Gap note (2026-05-06):** Prior builder output pasted **`lifeos-dashboard.html`** markup into this **markdown** SSOT path. **GAP-FILL** restores intent: **spec-only** stubs for expansion categories — not a second copy of dashboard HTML.

## Objective

Expose **consistent placeholder sections** inside **`public/overlay/lifeos-dashboard.html`** (via future implementation task) for non-Today pillars so Brief “expansion stack” reads true without faking detailed domain UX.

## Stubs per category

Each stub block must:

- Reuse **`card` / semantic tokens** (`lifeos-dashboard-tokens.css`) so light/dark stay coherent.
- Name a **human title + one-line Purpose** aligned with LifeOS pillars (identity/family/regulation — see Brief).
- Link **“Open [domain]”** to existing overlay routes where they exist (**THINK**: map routes from `lifeos-*` overlays / program map) — or **`#`** with **`data-stub-unwired=true`** until route ships.
- Avoid duplicating sidebar — shell chrome remains **`lifeos-app.html`** parent.

### Health

- Sections: summaries for sleep/movement placeholders, link to **`lifeos-health`** / wearable tiles when wired.

### Family

- Sections: household pulse, dependents snapshot, mediation shortcut if applicable.

### Purpose

- Sections: quarterly theme, values mirror teaser, coaching entry.

## Empty / loading states

Skeleton rows use same density contract as **`DASHBOARD_WIDGET_DENSITY_SPEC.md`** when implemented.

## Out of scope

Full domain implementations — those belong to **Amendment 21 backlog** slices with routes + tables.
