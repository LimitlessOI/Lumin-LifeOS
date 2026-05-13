# Dashboard Layout Utilities Integration

This document outlines the integration of `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. These utilities provide client-side logic for dynamic layout adjustments based on user preferences and viewport characteristics.

## 1. `resolveThemeMode` Integration

The `resolveThemeMode` function provides a robust way to determine the user's preferred theme, including support for system-level preferences.

**Integration Point:** `public/overlay/lifeos-dashboard.html` - within the `<script type="module">` block, specifically in the `DOMContentLoaded` event listener for initial theme setup.

**Proposed Changes:**

1.  **Import:** Add an import statement for `resolveThemeMode` at the top of the `<script type="module">` block:
    ```javascript
    import { resolveThemeMode } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';
    ```
2.  **Initial Theme Resolution:** Modify the existing theme initialization logic within the `DOMContentLoaded` listener to use `resolveThemeMode`. This allows for a 'system' theme option, which the current `toggleTheme` does not explicitly support for initial load.

    *Current `DOMContentLoaded` theme logic:*
    ```javascript
    const savedTheme = localStorage.getItem('lifeos_theme');
    if (savedTheme) {
        document.documentElement.dataset.theme = savedTheme;
        // ... update meta tag and button text ...
    } else {
        // Default to dark if no theme saved
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('lifeos_theme', 'dark');
        $('btn-theme').textContent = '☀︎';
    }
    ```

    *Proposed `DOMContentLoaded` theme logic:*
    ```javascript
    const savedThemePref = localStorage.getItem('lifeos_theme');
    const initialTheme = resolveThemeMode(savedThemePref); // 'light', 'dark', or 'system'

    let effectiveTheme = initialTheme;
    if (initialTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.dataset.theme = effectiveTheme;
    localStorage.setItem('lifeos_theme', effectiveTheme); // Store the resolved theme, not 'system'
    const mc = document.getElementById('theme-color-meta');
    if (mc) mc.setAttribute('content', effectiveTheme === 'light' ? '#f6f7fb' : '#0a0a0f');
    $('btn-theme').textContent = effectiveTheme === 'light' ? '☾' : '☀︎';
    ```
    *(Note: The `toggleTheme` function itself would remain as-is, toggling between 'light' and 'dark' explicitly, unless a UI element for 'system' preference is introduced.)*

**DOM Hook:** The `document.documentElement.dataset.theme` attribute will continue to be the primary mechanism for applying the theme via CSS.

**SSR/Client Boundary:** This is a client-side operation, as theme preference is typically managed by the user's browser or OS settings.

## 2. `clampMobileWidgetCount` Integration

The `clampMobileWidgetCount` function ensures that the number of widgets displayed on mobile devices remains within a sensible range (1-6). This is particularly relevant for responsive layouts where too many widgets can overwhelm small screens.

**Integration Point:** `public/overlay/lifeos-dashboard.html` - within the `<script type="module">` block, as part of a new client-side function responsible for dynamically managing widget visibility.

**Proposed Changes:**

1.  **Import:** Add an import statement for `clampMobileWidgetCount`:
    ```javascript
    import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';
    ```
2.  **Dynamic Widget Rendering/Visibility:** Introduce a function (e.g., `updateWidgetVisibility()`) that runs on `DOMContentLoaded` and `window.onresize`. This function would:
    *   Identify all dashboard widgets (e.g., elements with class `dashboard-widget` or `card`).
    *   Get the current `window.innerWidth`.
    *   Determine a base widget count (e.g., total available widgets).
    *   Call `clampMobileWidgetCount(baseWidgetCount)` to get the effective number of widgets to display.
    *   Iterate through the widgets, showing only those up to the clamped count and hiding the rest.

**DOM Hook:**
*   Assign a unique identifier or `data-index` to each widget element (e.g., `<div id="lifeos-widget-mit" class="dashboard-widget card accent-border-today fade-up delay-3" data-widget-index="1">`).
*   Use CSS classes (e.g., `hidden-on-mobile`) or direct `style.display = 'none'` to control visibility based on the clamped count.

**SSR/Client Boundary:** This is a client-side operation, as it depends on the dynamic viewport width. Initial server-side rendering could include all widgets, with client-side JavaScript then hiding those beyond the clamped limit.

## 3. `pickDashboardDensity` Integration

The `pickDashboardDensity` function dynamically determines the appropriate visual density ('compact', 'airy', 'balanced') for the dashboard based on viewport size, widget count, and the state of the AI rail.

**Integration Point:** `public/overlay/lifeos-dashboard.html` - within the `<script type="module">` block, as part of a new client-side function that runs on `DOMContentLoaded` and `window.onresize`.

**Proposed Changes:**

1.  **Import:** Ensure `pickDashboardDensity` is imported (as shown in section 2).
2.  **Density Calculation Function:** Create a function (e.g., `updateDashboardDensity()`) that:
    *   Gets `window.innerWidth` for `viewportWidth`.
    *   Counts the number of visible `card` elements for `widgetCount`.
    *   Determines `hasPinnedRail`. This state would need to be exposed by the `lifeos-dashboard-ai-rail.js` script (e.g., via a global variable, a custom event, or by checking a class on `#lifeos-ai-rail-root`). For initial integration, a placeholder or default value can be used (e.g., `false`).
    *   Calls `pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail })`.
    *   Applies the resulting density string as a `data-density` attribute to the `<body>` element (e.g., `document.body.dataset.density = 'compact'`).
3.  **CSS Styling:** Add new CSS rules that respond to the `data-density` attribute to adjust spacing, font sizes, and other layout properties. These would augment or override existing styles.

    *Example CSS:*
    ```css
    body[data-density="compact"] .page { padding: 16px; }
    body[data-density="compact"] .card { padding: 16px; border-radius: var(--radius-md); }
    body[data-density="compact"] .greeting { font-size: clamp(22px, 4vw, 32px); }
    body[data-density="airy"] .page { padding: 40px; }
    body[data-density="airy"] .card { padding: 32px; border-radius: var(--radius-xl); }
    body[data-density="airy"] .greeting { font-size: clamp(30px, 6vw, 50px); }
    /* 'balanced' would typically be the default or current styling */
    ```
4.  **Event Listeners:** Call `updateDashboardDensity()` on `DOMContentLoaded` and `window.addEventListener('resize', ...)` with a debounce mechanism for performance.

**DOM Hook:**
*   The `<body>` element will receive a `data-density` attribute (e.g., `<body data-density="balanced">`).
*   Existing CSS classes (e.g., `.page`, `.card`, `.two-col`, `.greeting`) will need to be augmented with density-specific styles.

**SSR/Client Boundary:** This is primarily a client-side operation due to its reliance on `window.innerWidth`. An initial density could be inferred on the server based on user-agent, but dynamic adjustments require client-side JavaScript.

---
**Mockup PNG Reference for Density Study:**
(Note: The mockup PNG was not provided, so the specific visual implications of 'compact', 'airy', and 'balanced' are inferred based on common UI patterns for density adjustments.)
*   **Compact:** Characterized by reduced padding, smaller font sizes, and tighter spacing between elements, optimizing for information density on smaller screens or when more content needs to be visible.
*   **Airy:** Features increased padding, slightly larger font sizes, and more generous spacing, providing a more relaxed and spacious visual experience, often preferred on larger displays.
*   **Balanced:** Represents the default or intermediate state, providing a comfortable balance between information density and visual breathing room, similar to the dashboard's current styling.