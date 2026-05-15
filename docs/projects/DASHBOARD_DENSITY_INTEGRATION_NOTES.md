## Dashboard Layout Utilities Integration

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. The utilities provide client-side logic for responsive layout adjustments and theme resolution.

### 1. `clampMobileWidgetCount` Integration

**Purpose**: To ensure the number of widgets displayed on mobile viewports is within a reasonable range (1-6), preventing excessive scrolling or an overwhelming interface.

**Integration**: This utility should be called client-side when determining the number of widgets to render or display, specifically for mobile layouts. It acts as a guardrail for dynamic widget loading or visibility toggling.

**DOM Hook Suggestions**:
- **Widget Rendering Logic**: When the dashboard's client-side JavaScript fetches or dynamically creates widgets, before appending them to the DOM, the total count should be passed through `clampMobileWidgetCount`.
- **Example**: If a user's profile specifies 10 widgets, on a mobile viewport, the rendering logic would call `clampMobileWidgetCount(10)`, receive `6`, and only render the first 6 widgets.
- **CSS**: No direct CSS changes are needed, but the resulting clamped count would inform the number of visible `.dashboard-widget` elements.

### 2. `resolveThemeMode` Integration

**Purpose**: To normalize user-selected or system-preferred theme values ('light', 'dark', 'system') into a consistent format, defaulting to 'system' for invalid inputs.

**Integration**: This utility should be used client-side during the initial theme loading sequence and whenever the theme is explicitly changed by the user. It ensures that the `document.documentElement.dataset.theme` attribute receives a valid value.

**DOM Hook Suggestions**:
- **Initial Load**: Modify the `DOMContentLoaded` listener in `public/overlay/lifeos-dashboard.html` to use `resolveThemeMode` when reading `localStorage.getItem('lifeos_theme')`.
    ```javascript
    // Existing:
    // const savedTheme = localStorage.getItem('lifeos_theme');
    // if (savedTheme) { document.documentElement.dataset.theme = savedTheme; ... }
    //
    // Proposed:
    import { resolveThemeMode } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
    // ...
    document.addEventListener('DOMContentLoaded', () => {
        const savedThemeRaw = localStorage.getItem('lifeos_theme');
        const resolvedTheme = resolveThemeMode(savedThemeRaw); // Use the utility
        document.documentElement.dataset.theme = resolvedTheme;
        // ... rest of theme application logic ...
        $('btn-theme').textContent = resolvedTheme === 'light' ? '☾' : '☀︎';
    });
    ```
- **Theme Toggle**: Update the `toggleTheme()` function to use `resolveThemeMode` to derive the next theme state, ensuring consistency.

### 3. `pickDashboardDensity` Integration

**Purpose**: To dynamically adjust the dashboard's visual density ('compact', 'airy', 'balanced') based on viewport width, the number of active widgets, and the presence of a pinned AI rail. This allows for an optimized layout across various screen sizes and content loads.

**Integration**: This utility should be invoked client-side on initial page load and whenever relevant parameters change (e.g., `window.resize` event, widget count changes, AI rail state changes). The returned density string should be applied as a data attribute to a high-level container element, allowing CSS to adapt the layout.

**DOM Hook Suggestions**:
- **Root Container**: Apply the density as a `data-density` attribute to the `<div class="page">` element.
    ```html
    <div class="page" data-density="balanced">
    ```
- **Client-side Script**:
    ```javascript
    import { pickDashboardDensity } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
    // ...
    function applyDashboardDensity() {
        const viewportWidth = window.innerWidth;
        // Assuming 'dashboard-widget' elements represent active widgets
        const widgetCount = document.querySelectorAll('.dashboard-widget:not([hidden])').length;
        // hasPinnedRail will be false until AI rail is fully implemented and pinned state is managed
        const hasPinnedRail = document.getElementById('lifeos-ai-rail-root')?.classList.contains('pinned') || false;

        const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
        document.querySelector('.page').dataset.density = density;
    }

    document.addEventListener('DOMContentLoaded', applyDashboardDensity);
    window.addEventListener('resize', applyDashboardDensity);
    // Also call applyDashboardDensity() after widgets are loaded/added/removed
    ```
- **CSS Adaptation**: Define CSS rules that respond to the `data-density` attribute.
    ```css
    .page[data-density="compact"] .card {
        padding: 16px; /* Smaller padding */
        border-radius: var(--radius-md); /* Tighter corners */
    }
    .page[data-density="airy"] .card {
        padding: 32px; /* Larger padding */
        border-radius: var(--radius-xl); /* Softer corners */
    }
    /* Default (balanced) styles would be the base or explicitly defined */
    ```

### 4. SSR/Client Boundaries

All three utilities (`clampMobileWidgetCount`, `resolveThemeMode`, `pickDashboardDensity`) are designed for client-side execution. They rely on browser-specific APIs (`window.innerWidth`, `localStorage`) and dynamic DOM state. Therefore, their integration should occur entirely within the client-side JavaScript loaded by `public/overlay/lifeos-dashboard.html`. There are no immediate SSR integration points required for these specific utilities given their current scope and the existing client-side rendering patterns.