<!-- SYNOPSIS: Dashboard Card Density Specification -->

The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md` files were not found, so the specification below infers details from `DASHBOARD_CUSTOMIZATION_STATE.md` and general UI/UX principles for density.

---
# Dashboard Card Density Specification

This document outlines the specification for implementing dashboard card density modes, including their mapping to CSS variables, DOM data attributes, mobile constraints, and integration with the dashboard customization state.

## 1. Density Modes

Three primary density modes are defined, as per `DensityEnum` in `DASHBOARD_CUSTOMIZATION_STATE.md`:

1.  **`COMPACT`**: Maximizes information density, reducing whitespace and element sizes. Ideal for power users or smaller screens where more content visibility is prioritized.
2.  **`STANDARD`**: The default, balanced mode. Offers a comfortable reading experience with moderate spacing.
3.  **`SPACIOUS`**: Increases whitespace and element sizes, providing a more relaxed, visually open layout. Suitable for touch interfaces or users preferring less visual clutter.

## 2. Visual Impact and CSS Variable Mapping

Density modes will primarily affect spacing (padding, margin), font sizes, and potentially border radii within and between dashboard cards. New CSS variables will be introduced or existing ones adjusted to control these properties.

The `html` element will carry a `data-dashboard-density` attribute, which CSS will use to apply mode-specific styles.

**DOM Attribute:**
`<html data-dashboard-density="[compact|standard|spacious]">`

**Proposed CSS Variables (to be defined in `public/shared/lifeos-dashboard-tokens.css` or `public/overlay/lifeos-dashboard.html`'s style block):**

| Variable Name                     | Purpose                                   | `COMPACT` Example Value | `STANDARD` Example Value | `SPACIOUS` Example Value |
| :-------------------------------- | :---------------------------------------- | :---------------------- | :----------------------- | :----------------------- |
| `--dash-card-padding`             | Internal padding of `.card` elements      | `12px`                  | `20px`                   | `28px`                   |
| `--dash-card-margin-bottom`       | Vertical spacing between card rows/sections | `12px`                  | `24px`                   | `32px`                   |
| `--dash-card-label-margin-bottom` | Spacing below `.card-label`               | `8px`                   | `14px`                   | `18px`                   |
| `--dash-font-size-card-label`     | Font size for `.card-label`               | `9px`                   | `10px`                   | `11px`                   |
| `--dash-font-size-body-sm`        | Smaller body text (e.g., `greeting-sub`)  | `13px`                  | `14px`                   | `15px`                   |
| `--dash-font-size-body-md`        | Main body text (e.g., `mit-text`)         | `14px`                  | `15px`                   | `16px`                   |
| `--dash-radius-card`              | Border-radius for `.card` elements        | `10px`                  | `14px`                   | `18px`                   |
| `--dash-grid-gap`                 | Gap for `.two-col` grid                   | `12px`                  | `16px`                   | `24px`                   |

**Example CSS Structure:**

```css
/* Default (STANDARD) */
:root {
  --dash-card-padding: 20px;
  --dash-card-margin-bottom: 24px;
  --dash-card-label-margin-bottom: 14px;
  --dash-font-size-card-label: 10px;
  --dash-font-size-body-sm: 14px;
  --dash-font-size-body-md: 15px;
  --dash-radius-card: 14px;
  --dash-grid-gap: 16px;
}

/* COMPACT mode */
html[data-dashboard-density="compact"] {
  --dash-card-padding: 12px;
  --dash-card-margin-bottom: 12px;
  --dash-card-label-margin-bottom: 8px;
  --dash-font-size-card-label: 9px;
  --dash-font-size-body-sm: 13px;
  --dash-font-size-body-md: 14px;
  --dash-radius-card: 10px;
  --dash-grid-gap: 12px;
}

/* SPACIOUS mode */
html[data-dashboard-density="spacious"] {
  --dash-card-padding: 28px;
  --dash-card-margin-bottom: 32px;
  --dash-card-label-margin-bottom: 18px;
  --dash-font-size-card-label: 11px;
  --dash-font-size-body-sm: 15px;
  --dash-font-size-body-md: 16px;
  --dash-radius-card: 18px;
  --dash-grid-gap: 24px;
}

/* Update existing styles to use variables */
.card {
  padding: var(--dash-card-padding);
  border-radius: var(--dash-radius-card);
}
.card-label {
  font-size: var(--dash-font-size-card-label);
  margin-bottom: var(--dash-card-label-margin-bottom);
}
.page > .two-col { /* Target direct children of .page that are .two-col */
  margin-bottom: var(--dash-card-margin-bottom);
}
.two-col {
  gap: var(--dash-grid-gap);
}
/* ... and other elements as needed */
```

## 3. Mobile Constraints

On smaller screens (e.g., below `640px` viewport width), the `SPACIOUS` density mode may lead to a suboptimal user experience due to limited screen real estate.

-   **Default Behavior:** For viewports smaller than `640px`, the dashboard will default to `STANDARD` density, regardless of the user's saved `densityMode` preference.
-   **Override:** If the user explicitly selects `COMPACT` mode, it will apply on mobile. If `SPACIOUS` is selected, it will be overridden by `STANDARD` on mobile.
-   This mobile-specific override will be implemented via CSS media queries, ensuring that the `data-dashboard-density` attribute is respected for `COMPACT` and `STANDARD`, but `SPACIOUS` is effectively downgraded.

**Example Mobile CSS Override:**

```css
@media (max-width: 639px) {
  /* Force STANDARD density on small screens if SPACIOUS is active */
  html[data-dashboard-density="spacious"] {
    --dash-card-padding: 20px;
    --dash-card-margin-bottom: 24px;
    --dash-card-label-margin-bottom: 14px;
    --dash-font-size-card-label: 10px;
    --dash-font-size-body-sm: 14px;
    --dash-font-size-body-md: 15px;
    --dash-radius-card: 14px;
    --dash-grid-gap: 16px;
  }
}
```

## 4. Intersection with Customization State Document

The `DASHBOARD_CUSTOMIZATION_STATE.md` document already defines the `densityMode` field within the `DashboardState` interface:

```typescript
interface DashboardState {
  // ... other fields
  densityMode: DensityEnum; // Current display density
}

enum DensityEnum {
  COMPACT = 'compact',
  STANDARD = 'standard',
  SPACIOUS = 'spacious',
}
```

**Integration Steps:**

1.  **Initial Load:** On `DOMContentLoaded`, the dashboard's JavaScript (`public/overlay/lifeos-dashboard.html`'s script block) will read the `densityMode` from `localStorage` (under `lifeos_dashboard_state`).
2.  **Apply to DOM:** The retrieved `densityMode` value (e.g., `'compact'`, `'standard'`, `'spacious'`) will be applied directly to the `html` element as a `data-dashboard-density` attribute.
    ```javascript
    // In the DOMContentLoaded listener
    const dashboardState = JSON.parse(localStorage.getItem('lifeos_dashboard_state') || '{}');
    const densityMode = dashboardState.densityMode || 'standard'; // Default to STANDARD
    document.documentElement.setAttribute('data-dashboard-density', densityMode);
    ```
3.  **User Interaction:** When a user changes the density preference (via a future UI control), the JavaScript will:
    a.  Update the `densityMode` field in the `lifeos_dashboard_state` object in `localStorage`.
    b.  Update the `data-dashboard-density` attribute on the `html` element to reflect the new choice.

## 5. Rollout Order (Specification Phase)

1.  **Finalize Visuals:** Confirm the specific pixel values for padding, margins, font sizes, and radii for each density mode.
2.  **CSS Variable Definition:** Define the new CSS variables and their values for each density mode within `public/shared/lifeos-dashboard-tokens.css` or the main HTML style block.
3.  **CSS Application:** Update existing CSS rules in `public/overlay/lifeos-dashboard.html` to utilize these new density-aware CSS variables.
4.  **Mobile Override:** Implement the mobile-specific CSS media queries to ensure appropriate density on small screens.
5.  **JS Integration:** Implement the JavaScript logic to read `densityMode` from `localStorage` and apply it to the `html` element's `data-dashboard-density` attribute on page load.
6.  **UI Control (Future Task):** A separate task will involve building the user interface for selecting density modes and updating the `localStorage` state.