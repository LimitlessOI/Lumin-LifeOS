The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing from the repository, leading to an incomplete specification.
---
## Dashboard Card Density Specification

This document specifies the visual density modes for dashboard cards, their mapping to CSS variables and DOM attributes, mobile constraints, and integration with the customization state.

### 1. Density Modes

Three primary density modes are supported, influencing card spacing, padding, and font sizes. These modes are resolved by the `pickDashboardDensity` utility and applied to the dashboard container.

#### 1.1. Compact
-   **Description:** Maximizes information density, ideal for power users or smaller screens. Reduces whitespace and element sizes.
-   **CSS Variable Mapping (Example Derivations):**
    -   `--card-padding-x`: `calc(2 * var(--dash-space-unit))` (e.g., 8px)
    -   `--card-padding-y`: `calc(1.5 * var(--dash-space-unit))` (e.g., 6px)
    -   `--card-gap`: `calc(2 * var(--dash-space-unit))` (e.g., 8px)
    -   `--card-font-size-multiplier`: `0.9` (e.g., 90% of base font size)
    -   `--card-header-height`: `calc(8 * var(--dash-space-unit))` (e.g., 32px)
-   **DOM Data Attribute:** `data-density="compact"`

#### 1.2. Balanced
-   **Description:** The default, balanced mode offering a good compromise between information density and readability.
-   **CSS Variable Mapping (Example Derivations):**
    -   `--card-padding-x`: `calc(3 * var(--dash-space-unit))` (e.g., 12px)
    -   `--card-padding-y`: `calc(2 * var(--dash-space-unit))` (e.g., 8px)
    -   `--card-gap`: `calc(3 * var(--dash-space-unit))` (e.g., 12px)
    -   `--card-font-size-multiplier`: `1.0` (e.g., 100% of base font size)
    -   `--card-header-height`: `calc(10 * var(--dash-space-unit))` (e.g., 40px)
-   **DOM Data Attribute:** `data-density="balanced"`

#### 1.3. Airy
-   **Description:** Provides a more relaxed visual experience with generous spacing, enhancing readability at the cost of density.
-   **CSS Variable Mapping (Example Derivations):**
    -   `--card-padding-x`: `calc(4 * var(--dash-space-unit))` (e.g., 16px)
    -   `--card-padding-y`: `calc(3 * var(--dash-space-unit))` (e.g., 12px)
    -   `--card-gap`: `calc(4 * var(--dash-space-unit))` (e.g., 16px)
    -   `--card-font-size-multiplier`: `1.1` (e.g., 110% of base font size)
    -   `--card-header-height`: `calc(12 * var(--dash-space-unit))` (e.g., 48px)
-   **DOM Data Attribute:** `data-density="airy"`

### 2. Mobile Constraints

On mobile viewports, the `clampMobileWidgetCount` utility ensures that the number of displayed widgets remains between 1 and 6. The `pickDashboardDensity` utility will inherently favor a more `compact` or `balanced` density on smaller `viewportWidth` values, regardless of user preference, to maintain usability. Mobile-specific media queries in CSS will override general density settings to ensure optimal layout.

### 3. Intersection with Customization State

-   **Persistence:** The user's preferred density mode is stored in `localStorage` under the key `lifeos-dashboard-density-mode` (e.g., `"compact"`, `"balanced"`, `"airy"`), as defined in `DASHBOARD_CUSTOMIZATION_STATE.md`.
-   **Resolution:** On client-side hydration, the `pickDashboardDensity` utility (from `dashboard-layout-utils.mjs`) will resolve the active density. This resolution considers:
    1.  The user's stored preference (`lifeos-dashboard-density-mode`).
    2.  Current `viewportWidth`.
    3.  Active `widgetCount`.
    4.  Presence of a `hasPinnedRail`.
-   **Application:** The resolved density will be applied as a `data-density` attribute to the main dashboard container element (e.g., `<div id="dashboard-main" data-density="balanced">`). This attribute will then drive the application of density-specific CSS variables and styles.
-   **SSR:** Server-Side Rendering can inject a default `data-density` attribute (e.g., `data-density="balanced"`) to prevent FOUC, which will be overridden by client-side resolution if a user preference exists or viewport conditions dictate a different density.

### 4. Rollout Order

1.  **CSS Variable Definition:** Define density-specific CSS variables (e.g., `--card-padding-x`, `--card-gap`) within a new stylesheet (e.g., `public/shared/lifeos-dashboard-layout.css`), scoped to `[data-density="compact"]`, `[data-density="balanced"]`, `[data-density="airy"]` selectors.
2.  **`pickDashboardDensity` Integration:** Ensure the client-side layout manager correctly calls `pickDashboardDensity` on initial load, `resize` events, and state changes (widget count, pinned rail).
3.  **DOM Attribute Application:** Implement the logic to apply the `data-density` attribute to the dashboard container based on the resolved density.
4.  **`localStorage` Integration:** Implement reading and writing of `lifeos-dashboard-density-mode` to `localStorage` for persistence.
5.  **Testing:** Thoroughly test across various screen sizes, widget counts, and user preferences.