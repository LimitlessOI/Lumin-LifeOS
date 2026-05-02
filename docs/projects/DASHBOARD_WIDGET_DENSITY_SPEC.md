# Dashboard card density specification

**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`

**Naming (canonical):** The persisted `density` field **must** use the enum in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`: **`comfortable`** (default), **`compact`**, **`spacious`**. Reflect it on the dashboard `<body>` via **`data-density="<enum>"`**.

This document outlines how those modes affect cards and lists: tighter **compact**, baseline **comfortable**, and roomier **spacious**.

## Density modes

- **`comfortable` (default):** Balanced spacing; matches today’s readability-first baseline.
- **`compact`:** Tighter padding and margins; more information per viewport (power users / wide screens).
- **`spacious`:** Larger spacing and type; separation and relaxed reading first.

## Token mapping (CSS variables)

Controlled via semantic variables from `public/shared/lifeos-dashboard-tokens.css`, overridden per mode using `body[data-density="compact"]`, `body[data-density="comfortable"]`, and `body[data-density="spacious"]`.

Example variable set (implementations may unify names with existing `--dash-*` tokens in tokens + overlay `<style>`):

| CSS variable | Compact | Comfortable | Spacious | Purpose |
|---|---|---|---|---|
| `--dash-card-padding` | `12px` | `20px` | `28px` | Padding inside `.card` |
| `--dash-card-label-mb` | `8px` | `14px` | `20px` | Space below `.card-label` |
| `--dash-item-padding-y` | `6px` | `10px` | `14px` | Vertical padding for list rows |
| `--dash-item-gap` | `8px` | `12px` | `16px` | Gap between list items |
| `--dash-grid-gap` | `8px` | `12px` | `20px` | Gap in grids (e.g. `.scores-grid`) |
| `--dash-msg-gap` | `4px` | `8px` | `12px` | Chat message spacing |
| `--dash-font-size-base` | `14px` | `15px` | `16px` | Primary body size |
| `--dash-font-size-sm` | `13px` | `14px` | `15px` | Secondary titles |
| `--dash-font-size-xs` | `11px` | `12px` | `13px` | Muted / meta |

## Implementation sketch

```css
:root {
  /* comfortable defaults — also body[data-density="comfortable"] if needed */
  --dash-card-padding: 20px;
  --dash-card-label-mb: 14px;
  --dash-item-padding-y: 10px;
  --dash-item-gap: 12px;
  --dash-grid-gap: 12px;
  --dash-msg-gap: 8px;
  --dash-font-size-base: 15px;
  --dash-font-size-sm: 14px;
  --dash-font-size-xs: 12px;
}

body[data-density="compact"] {
  --dash-card-padding: 12px;
  --dash-card-label-mb: 8px;
  --dash-item-padding-y: 6px;
  --dash-item-gap: 8px;
  --dash-grid-gap: 8px;
  --dash-msg-gap: 4px;
  --dash-font-size-base: 14px;
  --dash-font-size-sm: 13px;
  --dash-font-size-xs: 11px;
}

body[data-density="spacious"] {
  --dash-card-padding: 28px;
  --dash-card-label-mb: 20px;
  --dash-item-padding-y: 14px;
  --dash-item-gap: 16px;
  --dash-grid-gap: 20px;
  --dash-msg-gap: 12px;
  --dash-font-size-base: 16px;
  --dash-font-size-sm: 15px;
  --dash-font-size-xs: 13px;
}
```

## Dom wiring & persistence

- On load and on control change: read **`lifeos_dashboard_layout`** from `localStorage`; validate `density`; set **`document.body.dataset.density`**.
- Fallback when missing / invalid: **`comfortable`**.
- Any density control updates `localStorage` and `data-density` together (debounce writes if needed).

## Mobile constraints

Below ~640px width, optionally pin **`comfortable`** or **`compact`** (or constrain **`spacious`**) to protect vertical scroll budget — explicit product decision when wiring JS. Respect **`env(safe-area-inset-*)`** and existing dashboard breakpoints.

## Rollout order

1. Define variables in **`lifeos-dashboard-tokens.css`** or a layered sheet keyed by **`data-density`**.
2. Default **`data-density="comfortable"`** on `public/overlay/lifeos-dashboard.html` until hydration applies stored preference.
3. Wire **`dashboard.density`** (or equivalent field per `DASHBOARD_CUSTOMIZATION_STATE.md`) on load + on control change.
4. Surface UI control once shell stable.
5. Test mobile clamps and reduced-motion interactions.
