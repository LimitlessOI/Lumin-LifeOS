# Integrating Dashboard Layout Utilities

This document outlines how to integrate the utility functions from `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. These utilities provide deterministic helpers for UI state management, specifically for theme resolution and dashboard density.

## 1. Importing Utilities

The `dashboard-layout-utils.mjs` module exports functions that should be imported into the main client-side script block of `lifeos-dashboard.html`. This should occur within the `<script type="module">` block to leverage ESM imports.

```javascript
// public/overlay/lifeos-dashboard.html (within <script type="module">)
import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
```

## 2. `resolveThemeMode` Integration

The `resolveThemeMode` function normalizes a theme string to "light", "dark", or "system". The existing `lifeos-dashboard.html` already handles theme toggling and persistence via `localStorage`. `resolveThemeMode` can be used to ensure consistency when reading the stored theme.

**Current Pattern:**
The `DOMContentLoaded` listener reads `localStorage.getItem('lifeos_theme')` and sets `document.documentElement.dataset.theme`. The `toggleTheme` function also directly manipulates this.

**Integration Suggestion:**
When retrieving the theme from `localStorage`, pass it through `resolveThemeMode` to handle any unexpected values gracefully. The current `toggleTheme` function only supports 'light' and 'dark', so 'system' would only apply if the stored value was explicitly 'system' or an invalid value defaulted to 'system'.

**DOM Hook:**
- Read from `localStorage.getItem('lifeos_theme')`.
- Apply to `document.documentElement.dataset.theme`.

**SSR/Client Boundary:**
This integration is purely client-side. If server-side rendering were introduced, `resolveThemeMode` could be used on the server to set the initial `data-theme` attribute on the `<html>` tag based on user preferences (e.g., from a cookie) before the page is sent to the client.

## 3. `pickDashboardDensity` Integration

The `pickDashboardDensity` function determines the optimal dashboard density ("compact", "balanced", "airy") based on `viewportWidth`, `widgetCount`, and `hasPinnedRail`. This allows for more nuanced layout adjustments than simple media queries.

**Integration Steps:**

### a. Determining `viewportWidth`
This parameter should be sourced directly from the browser's viewport.

**DOM Hook:** `window.innerWidth`

### b. Determining `widgetCount`
The `widgetCount` represents the number of primary content blocks on the dashboard. For the current `lifeos-dashboard.html` structure, a reasonable approach is to count the visible `.card` elements, as these represent distinct dashboard components.

**DOM Hook:** `document.querySelectorAll('.card').length`

### c. Determining `hasPinnedRail`
The `hasPinnedRail` parameter indicates whether the AI rail is active and pinned, which would influence available screen real estate. The `lifeos-ai-rail-root` div exists in the HTML. A class on the `body` or `html` element could signify its active state.

**DOM Hook (Suggestion):** Check for a specific class on the `body` element, e.g., `document.body.classList.contains('ai-rail-active')`. This class would be toggled by the AI rail's own activation logic.

### d. Applying Density to DOM
Once `pickDashboardDensity` returns a density string, it should be applied as a data attribute to a high-level element, such as the `<body>` tag.

**DOM Hook:** `document.body.dataset.density = resolvedDensity;`

This logic should run on `DOMContentLoaded` and also be re-evaluated on `window.resize` events to adapt to layout changes.

### e. CSS Considerations
The `data-density` attribute can then be used in CSS to apply density-specific styles. This allows for granular control over spacing, font sizes, and component layouts based on the calculated density.

**Example CSS Pattern:**
```css
/* Default (balanced) styles */
.page {
  padding: 24px 16px;
}
.card {
  padding: 20px;
}

/* Compact density adjustments */
body[data-density="compact"] .page {
  padding: 16px 12px;
}
body[data-density="compact"] .card {
  padding: 14px;
  border-radius: var(--radius-md); /* Smaller radius */
}

/* Airy density adjustments */
body[data-density="airy"] .page {
  padding: 40px 32px;
  max-width: 1200px; /* Wider content area */
}
body[data-density="airy"] .card {
  padding: 32px;
  border-radius: var(--radius-xl); /* Larger radius */
}
```
*(Note: The specific values for density adjustments would be informed by the mockup PNG for density study, which was not provided for this task.)*

**SSR/Client Boundary:**
This integration is inherently client-side due to its reliance on `window.innerWidth` and dynamic DOM state.

## 4. `clampMobileWidgetCount` Integration

The `clampMobileWidgetCount` function ensures a widget count is between 1 and 6. This utility is primarily useful when the `widgetCount` for `pickDashboardDensity` is dynamic, potentially coming from user preferences, AI suggestions, or a configurable setting.

**Integration Suggestion:**
If the `widgetCount` passed to `pickDashboardDensity` is not a static count of visible elements but rather a configurable value (e.g., from a user setting or an AI model's output), `clampMobileWidgetCount` should be applied to that value before it's used in `pickDashboardDensity`.

**Example:**
```javascript
// public/overlay/lifeos-dashboard.html (within <script type="module">)
// ...
let dynamicWidgetCount = getUserConfiguredWidgetCount(); // Or AI-suggested count
const clampedCount = clampMobileWidgetCount(dynamicWidgetCount);

const density = pickDashboardDensity({
  viewportWidth: window.innerWidth,
  widgetCount: clampedCount,
  hasPinnedRail: document.body.classList.contains('ai-rail-active')
});
document.body.dataset.density = density;
// ...
```

**DOM Hook:** Not a direct DOM hook, but a utility applied to a parameter before it's used in `pickDashboardDensity`.

**SSR/Client Boundary:** Client-side, as it processes client-side derived or configured values.