# Dashboard card density specification

**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`

This document outlines dashboard card density modes: **compact**, **balanced**, and **expanded**.

## Density modes

- **Compact:** Tighter padding and margins; more information per viewport. Suited for power users or wide screens.
- **Balanced:** Default; comfortable readability.
- **Expanded:** Larger spacing and type; readability and separation first. Prefer on touch-heavy or low-fatigue UX.

## Token mapping (CSS variables)

Controlled via semantic variables from `public/shared/lifeos-dashboard-tokens.css`, overridden per mode using a high-level selector (recommended: `body` or dashboard root).

| CSS variable | Compact | Balanced | Expanded | Purpose |
|---|---|---|---|---|
| `--dash-card-padding-x` | `12px` | `20px` | `28px` | Horizontal padding inside cards |
| `--dash-card-padding-y` | `10px` | `16px` | `24px` | Vertical padding inside cards |
| `--dash-card-margin-bottom` | `12px` | `16px` | `24px` | Vertical spacing between cards |
| `--dash-card-label-margin-bottom` | `8px` | `14px` | `18px` | Space below labels |
| `--dash-font-size-card-label` | `9px` | `10px` | `11px` | Label size |
| `--dash-font-size-card-content` | `13px` | `14px` | `15px` | Primary body size in cards |
| `--dash-radius-lg` | `10px` | `14px` | `18px` | Card radius (mode-tuned) |

## DOM wiring

Prefer `body` attribute `data-density="compact"|"balanced"|"expanded"` driving the selectors above (`body[data-density="compact"]`, etc.), aligned with customization state (`docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`).

## Mobile constraints

Below ~640px width, default enforcement may pin **compact** (or clamp **expanded**) to preserve vertical budget; ship as explicit product decision when wiring JS.

## Rollout order

1. Define overrides in **`lifeos-dashboard-tokens.css`** (or layered sheet) keyed by **`data-density`**.
2. Set default **`data-density="balanced"`** on dashboard shell (`public/overlay/lifeos-dashboard.html`).
3. Read/write **`dashboard.densityMode`** from customization contract — apply on load + on control change.
4. Add surfaced control once shell stable.
5. Add mobile overrides / guards.
