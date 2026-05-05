The specification is based on the task description and general UI/UX principles, as the referenced `DASHBOARD_BUILDER_BRIEF.md`, `DASHBOARD_DENSITY_INTEGRATION_NOTES.md`, and `DASHBOARD_CUSTOMIZATION_STATE.md` files were not found in the repository.

### Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes: `compact`, `balanced`, and `expanded`. It details the mapping to CSS variables, DOM data attributes, mobile constraints, and integration with the customization state.

#### 1. Density Modes

Three distinct density modes will be supported for dashboard cards:

*   **`compact`**: Optimized for displaying more information in a smaller space. Reduces internal padding, margins, and potentially font sizes.
*   **`balanced`**: The default, moderate density. Provides a good balance between information density and visual comfort.
*   **`expanded`**: Prioritizes readability and visual spaciousness. Increases internal padding, margins, and potentially font sizes.

#### 2. CSS Variable Mapping

New CSS variables will be introduced to control spacing and typography based on the active density mode. These variables will be defined within a parent scope (e.g., `:root` or a specific dashboard container) and will override base values based on the `data-density` attribute.

**Base Variables (derived from `--dash-space-unit` from `public/shared/lifeos-dashboard-tokens.css`):**

*   `--dash-card-padding-x-base`: `calc(var(--dash-space-unit) * 2)` (e.g., 16px)
*   `--dash-card-padding-y-base`: `calc(var(--dash-space-unit) * 1.5)` (e.g., 12px)
*   `--dash-card-gap-base`: `var(--dash-space-unit)` (e.g., 8px)
*   `--dash-font-size-card-title-base`: `1.125rem` (e.g., 18px)
*   `--dash-font-size-card-content-base`: `0.875rem` (e.g., 14px)

**Density-Specific Overrides:**

The following CSS variables will be used by dashboard components and will be dynamically set based on the `data-density` attribute.

```css
/* Default / Balanced Density */
:root[data-density="balanced"] {
  --dash-card-padding-x: var(--dash-card-padding-x-base);
  --dash-card-padding-y: var(--dash-card-padding-y-base);
  --dash-card-gap: var(--dash-card-gap-base);
  --dash-font-size-card-title: var(--dash-font-size-card-title-base);
  --dash-font-size-card-content: var(--dash-font-size-card-content-base);
}

/* Compact Density */
:root[data-density="compact"] {
  --dash-card-padding-x: calc(var(--dash-space-unit) * 1.5); /* e.g., 12px */
  --dash-card-padding-y: var(--dash-space-unit); /* e.g., 8px */
  --dash-card-gap: calc(var(--dash-space-unit) * 0.75); /* e.g., 6px */
  --dash-font-size-card-title: 1rem; /* e.g., 16px */
  --dash-font-size-card-content: 0.8125rem; /* e.g., 13px */
}

/* Expanded Density */
:root[data-density="expanded"] {
  --dash-card-padding-x: calc(var(--dash-space-unit) * 2.5); /* e.g., 20px */
  --dash-card-padding-y: calc(var(--dash-space-unit) * 2); /* e.g., 16px */
  --dash-card-gap: calc(var(--dash-space-unit) * 1.25); /* e.g., 10px */
  --dash-font-size-card-title: 1.25rem; /* e.g., 20px */
  --dash-font-size-card-content: 0.9375rem; /* e.g., 15px */
}
```

Dashboard components will consume these `--dash-card-*` variables for their internal layout and typography.

#### 3. DOM Data Attributes

The active density mode will be controlled by a `