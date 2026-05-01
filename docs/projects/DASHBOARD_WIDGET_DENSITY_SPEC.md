The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file could not be read. The specification for this task is contradictory. The "SPECIFICATION" section explicitly requests Markdown output, while the "INSTRUCTION" and "HTML FULL FILE — STRICT OUTPUT CONTRACT" sections imply a code output, specifically a full HTML file replacement. Given the task is to "Document how... should integrate," and the "SPECIFICATION" directly states "Markdown," I will prioritize the Markdown output as documentation. The HTML contract is interpreted as applying when the `target_file` is an HTML file and the mode is `code` for direct modification, which is not the case for this documentation task.

---
# Dashboard Density Specification

This document specifies the implementation details for dashboard card density modes (`compact`, `balanced`, `airy`), their mapping to CSS variables and DOM data attributes, considerations for mobile constraints, and their interaction with the dashboard customization state.

## 1. Density Modes

The LifeOS Dashboard will support three distinct visual density modes, as defined by the `DensityMode` enum in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`:

-   **`compact`**: Designed for maximum information density. This mode minimizes spacing, padding, and element sizes to fit more content within the viewport. It is suitable for users who prefer a data-rich view or smaller screens where space is at a premium.
-   **`balanced`**: The default, standard density mode. It provides a comfortable balance between information density and readability, aligning with the current visual design of `public/overlay/lifeos-dashboard.html`.
-   **`airy`**: Offers a more relaxed and spacious visual experience. This mode increases spacing, padding, and potentially element sizes, reducing information density but enhancing readability and visual comfort.

## 2. CSS Variable and DOM Data Attribute Mapping

Density modes will be applied via a `data-density` attribute on the `<body>` element. This attribute will control a set of CSS variables that dictate spacing, padding, and border-radius for dashboard cards and grid layouts.

**DOM Attribute:**
The `<body>` tag will receive a `data-density` attribute with one of the following values: `compact`, `balanced`, or `airy`.
Example: `<body data-density="compact">`

**CSS Variable Mapping:**
New CSS variables will be introduced to control density-specific properties. These variables will be defined in the main dashboard stylesheet (e.g., within the `<style>` block of `public/overlay/lifeos-dashboard.html` or potentially in `public/shared/lifeos-dashboard-tokens.css` for global availability).

| CSS Variable Name        | Purpose                               | `compact` Value | `balanced` Value (Default) | `airy` Value |
| :----------------------- | :------------------------------------ | :-------------- | :------------------------- | :----------- |
| `--dash-card-padding-y`  | Vertical padding for `.card` elements | `12px`          | `20px`                     | `28px`       |
| `--dash-card-padding-x`  | Horizontal padding for `.card` elements | `16px`          | `20px`                     | `32px`       |
| `--dash-grid-gap`        | Gap between grid items (e.g., `.two-col`) | `10px`          | `16px`                     | `24px`       |
| `--dash-card-radius`     | Border-radius for `.card` elements    | `var(--radius-md)` (`10px`) | `var(--radius-lg)` (`14px`) | `var(--radius-xl)` (`20px`) |

**Desktop Overrides (min-width: 1000px):**
To ensure a more pronounced difference on larger screens, the `balanced` and `airy` modes will have adjusted values within the desktop media query:

| CSS Variable Name        | `balanced` Value (Desktop) | `airy` Value (Desktop) |
| :----------------------- | :------------------------- | :--------------------- |
| `--dash-card-padding-y`  | `28px`                     | `36px`                 |
| `--dash-card-padding-x`  | `28px`                     | `40px`                 |
| `--dash-grid-gap`        | `32px`                     | `48px`                 |

**Implementation in CSS:**
The existing CSS rules for `.card` and `.two-col` will be updated to use these new variables:

```css
/* Default values (balanced) */
:root {
  --dash-card-padding-y: 20px;
  --dash-card-padding-x: 20px;
  --dash-grid-gap: 16px;
  --dash-card-radius: var(--radius-lg);
}

/* Compact mode */
body[data-density="compact"] {
  --dash-card-padding-y: 12px;
  --dash-card-padding-x: 16px;
  --dash-grid-gap: 10px;
  --dash-card-radius: var(--radius-md);
}

/* Airy mode */
body[data-density="airy"] {
  --dash-card-padding-y: 28px;
  --dash-card-padding-x: 32px;
  --dash-grid-gap: 24px;
  --dash-card-radius: var(--radius-xl);
}

/* Apply variables to elements */
.card {
  padding: var(--dash-card-padding-y) var(--dash-card-padding-x);
  border-radius: var(--dash-card-radius);
}
.two-col {
  gap: var(--dash-grid-gap);
}

/* Desktop-specific overrides for density */
@media (min-width: 1000px) {
    body[data-density="balanced"] {
        --dash-card-padding-y: 28px;
        --dash-card-padding-x: 28px;
        --dash-grid-gap: 32px;
    }
    body[data-density="airy"] {
        --dash-card-padding-y: 36px;
        --dash-card-padding-x: 40px;
        --dash-grid-gap: 48px;
    }
}
```

## 3. Mobile Constraints

The `pickDashboardDensity` utility function (from `scripts/builder-smoke/dashboard-layout-utils.mjs`) is crucial for handling mobile constraints.

-   **Viewport Width:** `pickDashboardDensity` takes `viewportWidth` as an input. For smaller viewports (e.g., below 640px where `.two-col` collapses), the function should primarily return `compact` or `balanced` to ensure usability and prevent excessive scrolling. `airy` density is generally not recommended for small mobile screens unless explicitly chosen by the user.
-   **`clampMobileWidgetCount`:** While not directly controlling density, `clampMobileWidgetCount` (also from `dashboard-layout-utils.mjs`) ensures a reasonable number of widgets are displayed on mobile. This indirectly supports density goals by managing the overall content footprint.
-   **Responsive Design:** The density modes will work in conjunction with existing media queries in `public/overlay/lifeos-dashboard.html`. For example, the `grid-gap` variable will be less impactful on single-column mobile layouts, but card padding will remain relevant. The `pickDashboardDensity` function's logic should prioritize `compact` for very small screens, even if a user has a `balanced` preference, to maintain a functional layout.

## 4. Intersection with Customization State

The dashboard density integrates directly with the `lifeos_dashboard_density_mode` key defined in `docs/projects/DASHBOARD_CUSTOMIZATION_STATE.md`.

-   **User Preference Override:** If `lifeos_dashboard_density_mode` is explicitly set by the user (e.g., via a UI control) and stored in `localStorage`, this value will take precedence. The `applyDensity` function (as described in `docs/projects/DASHBOARD_DENSITY_INTEGRATION_NOTES.md`) will read this stored preference and apply it directly to the `data-density` attribute, overriding any auto-detection by `pickDashboardDensity`.
-   **Auto-Detection Fallback:** If `lifeos_dashboard_density_mode` is `null` or `undefined`, the `pickDashboardDensity` utility function will be used to dynamically determine the optimal density based on `viewportWidth`, `widgetCount`, and `hasPinnedRail`. The result of this function will then be applied to the `data-density` attribute.
-   **`DensityMode` Enum:** The values stored in `lifeos_dashboard_density_mode` (`compact`, `balanced`, `airy`) directly correspond to the `data-density` attribute values and the CSS variable definitions.

## 5. Rollout Order

1.  **Define CSS Variables:** Introduce the new density-specific CSS variables (`--dash-card-padding-y`, `--dash-card-padding-x`, `--dash-grid-gap`, `--dash-card-radius`) and their `compact`, `balanced`, and `airy` values within the `<style>` block of `public/overlay/lifeos-dashboard.html`. Include the desktop media query overrides.
2.  **Update Existing CSS:** Modify the `.card` and `.two-col` CSS rules in `public/overlay/lifeos-dashboard.html` to utilize these new CSS variables.
3.  **Integrate `pickDashboardDensity`:** Implement the client-side JavaScript in `public/overlay/lifeos-dashboard.html`'s `<script type="module">` block to:
    *   Import `pickDashboardDensity` from `../scripts/builder-smoke/dashboard-layout-utils.mjs`.
    *   Create an `applyDensity` function that reads `lifeos_dashboard_density_mode` from `localStorage`.
    *   If a user preference exists, use it. Otherwise, call `pickDashboardDensity` with current `window.innerWidth`, a fixed `widgetCount` (e.g., 5), and a default `hasPinnedRail` (e.g., `false`).
    *   Apply the resulting density string to `document.body.dataset.density`.
    *   Call `applyDensity()` on `DOMContentLoaded` and `window.addEventListener('resize', applyDensity)`.
4.  **Implement User Control (Future):** Add a UI element (e.g., a button or dropdown) to the dashboard that allows users to explicitly select their preferred density. This control will update the `lifeos_dashboard_density_mode` key in `localStorage`.