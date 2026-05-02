## Dashboard Layout Utilities Integration

This document outlines the integration of `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. These utilities provide deterministic UI state management for theme resolution and dashboard density, without requiring the full AI rail implementation.

### 1. Importing Utilities

The functions from `dashboard-layout-utils.mjs` are pure client-side utilities and should be imported into the main `<script type="module">` block within `public/overlay/lifeos-dashboard.html`.

```javascript
// Inside public/overlay/lifeos-dashboard.html, within the <script type="module"> block
import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';
```

### 2. Theme Mode Resolution (`resolveThemeMode`)

The `resolveThemeMode` function ensures that the stored theme preference is always one of "light", "dark", or "system". This can be integrated into the existing theme initialization and toggle logic.

**DOM Hooks / Client Boundaries:**

*   **Initial Load:** Modify the `DOMContentLoaded` listener to use `resolveThemeMode` when retrieving the theme from `localStorage`.
*   **Theme Toggle:** Update the `toggleTheme` function to normalize the `localStorage` value before setting it.

**Example Integration (Conceptual):**

```javascript
// Existing toggleTheme function
function toggleTheme() {
  const curr = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const next = curr === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('lifeos_theme', next); // Store normalized value
  const mc = document.getElementById('theme-color-meta');
  if (mc) mc.setAttribute('content', next === 'light' ? '#f6f7fb' : '#0a0a0f');
  $('btn-theme').textContent = next === 'light' ? '☾' : '☀︎';
}

// Inside document.addEventListener('DOMContentLoaded', ...)
document.addEventListener('DOMContentLoaded', () => {
  initVoice();
  // Use resolveThemeMode to ensure a valid theme is applied on load
  const storedTheme = localStorage.getItem('lifeos_theme');
  const initialTheme = resolveThemeMode(storedTheme || 'system'); // Default to 'system' if not set
  document.documentElement.dataset.theme = initialTheme;
  $('btn-theme').textContent = initialTheme === 'light' ? '☾' : '☀︎';
  // ... other initializations
});
```

### 3. Dashboard Density (`pickDashboardDensity`)

The `pickDashboardDensity` function determines the optimal dashboard layout ("compact", "balanced", "airy") based on viewport width, widget count, and the presence of a pinned AI rail. This output should be applied as a class to the `body` or main `.page` container to trigger CSS adjustments.

**DOM Hooks / Client Boundaries:**

*   **Main Container:** The `body` element or the `.page` div (`<div class="page">`) is a suitable target for applying density classes (e.g., `body.density-compact`).
*   **Widget Count:** The `widgetCount` parameter should reflect the number of primary content cards visible on the dashboard. In the current `lifeos-dashboard.html`, these are the MITs, Calendar, Goals, Scores, and Chat cards. This count can be determined by querying `.card` elements.
*   **Pinned AI Rail:** The `hasPinnedRail` parameter should be a boolean indicating if the AI rail (`#lifeos-ai-rail-root`) is active and pinned. This state will likely be managed by the `lifeos-dashboard-ai-rail.js` module once fully implemented. For initial integration, a placeholder check (e.g., checking for a specific class on `#lifeos-ai-rail-root`) can be used.
*   **Event Listeners:** The density should be calculated and applied on `DOMContentLoaded` and whenever the window is resized (`window.addEventListener('resize', ...)`) to adapt to layout changes.

**Example Integration (Conceptual):**

```javascript
// Inside public/overlay/lifeos-dashboard.html, within the <script type="module"> block
import { pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

function updateDashboardDensity() {
  const viewportWidth = window.innerWidth;
  const widgetCount = document.querySelectorAll('.card').length; // Count visible cards
  // Placeholder for AI rail state. Replace with actual state from AI rail module.
  const hasPinnedRail = document.getElementById('lifeos-ai-rail-root')?.classList.contains('ai-rail-pinned') || false;

  const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

  // Apply density class to the body or .page element
  document.body.classList.remove('density-compact', 'density-balanced', 'density-airy');
  document.body.classList.add(`density-${density}`);

  // Note: CSS rules for .density-compact, .density-balanced, .density-airy
  // would need to be defined in lifeos-dashboard-tokens.css or the inline style block.
  // (Refer to mockup PNG for density study - not provided in this context)
}

// Call on initial load
document.addEventListener('DOMContentLoaded', updateDashboardDensity);
// Call on window resize
window.addEventListener('resize', updateDashboardDensity);
```

### 4. Mobile Widget Count (`clampMobileWidgetCount`)

The `clampMobileWidgetCount` function is designed to constrain the number of widgets displayed on mobile devices.

**DOM Hooks / Client Boundaries:**

*   This utility does not have a direct integration point in the current static dashboard layout.
*   It would be utilized by a future dynamic widget rendering system that allows users to customize or the system to automatically adjust the number of visible widgets, particularly on smaller screens. For example, if a feature allowed users to add/remove dashboard cards, this function would ensure the count remains within a sensible mobile range (1-6).