# Dashboard Layout Utils Integration Guide

## Overview
The three pure functions in `dashboard-layout-utils.mjs` provide deterministic layout decisions for the dashboard shell. They are **stateless, zero-dependency helpers** that can be called client-side or server-side without modification.

## Function Purposes

### `clampMobileWidgetCount(count)`
- **What it does**: Ensures widget count stays in valid range [1..6]
- **When to call**: Before rendering widget grid on mobile, or when user adjusts widget visibility
- **Returns**: Integer between 1 and 6

### `resolveThemeMode(value)`
- **What it does**: Normalizes theme preference to canonical value
- **When to call**: On theme toggle, on boot (reading from localStorage), or when syncing with system preference
- **Returns**: `"light"` | `"dark"` | `"system"`

### `pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail })`
- **What it does**: Selects layout density based on viewport constraints and widget load
- **When to call**: On viewport resize, when widget count changes, or when AI rail is pinned/unpinned
- **Returns**: `"compact"` | `"balanced"` | `"airy"`

## Integration Points in `lifeos-dashboard.html`

### 1. Theme Mode Resolution
**Current state**: Theme toggle uses inline logic in `toggleTheme()`  
**Hook location**: Line ~450 (`function toggleTheme()`)  
**Proposed change**:
```javascript
import { resolveThemeMode } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';

function toggleTheme() {
  const curr = resolveThemeMode(document.documentElement.dataset.theme);
  const next = curr === 'light' ? 'dark' : 'light';
  // ... rest of toggle logic
}
```
**Boundary**: Client-only (no SSR needed — theme is always resolved at runtime)

### 2. Widget Count Clamping
**Current state**: Dashboard renders fixed 4-widget grid (scores)  
**Hook location**: Line ~650 (`loadScores()`)  
**Proposed change**:
```javascript
import { clampMobileWidgetCount } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';

async function loadScores() {
  const r = await API('/api/v1/lifeos/dashboard/scoreboard');
  const d = await r.json();
  const visibleCount = clampMobileWidgetCount(d.visible_widget_count || 4);
  const keys = SCORE_KEYS.slice(0, visibleCount);
  // ... render only `keys` tiles
}
```
**Boundary**: Client-only (widget visibility is a runtime preference)

### 3. Density Mode Selection
**Current state**: Dashboard uses fixed CSS spacing (no density switching)  
**Hook location**: New — add to viewport resize handler  
**Proposed change**:
```javascript
import { pickDashboardDensity } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';

function applyDensity() {
  const density = pickDashboardDensity({
    viewportWidth: window.innerWidth,
    widgetCount: document.querySelectorAll('.card').length,
    hasPinnedRail: false, // Will be true when AI rail is implemented
  });
  document.documentElement.dataset.density = density;
}

window.addEventListener('resize', applyDensity);
applyDensity(); // Call on load
```
**CSS hook**: Add density-specific spacing in `<style>`:
```css
[data-density="compact"] .card { padding: 14px; }
[data-density="compact"] .two-col { gap: 12px; }
[data-density="airy"] .card { padding: 28px; }
[data-density="airy"] .two-col { gap: 24px; }
```
**Boundary**: Client-only (density is a viewport-driven decision)

## AI Rail Placeholder (Not Yet Implemented)

When the AI rail is added:
1. Add `<aside id="ai-rail" class="ai-rail">...</aside>` to DOM
2. Add pin/unpin toggle button
3. Pass `hasPinnedRail: document.getElementById('ai-rail').classList.contains('pinned')` to `pickDashboardDensity()`
4. Rail should collapse to icon-only on mobile (< 640px) regardless of pin state

**Density study reference**: The mockup PNG (not in repo) shows:
- **Compact**: 14px card padding, 12px grid gap, rail collapsed
- **Balanced**: 20px card padding, 16px grid gap, rail visible but narrow
- **Airy**: 28px card padding, 24px grid gap, rail wide with full labels

## SSR/Client Boundaries

All three functions are **client-side only** in current architecture:
- Dashboard is served as static HTML (`public/overlay/lifeos-dashboard.html`)
- No server-side rendering pass exists yet
- All layout decisions happen in browser after DOM load

If SSR is added later:
- `resolveThemeMode()` could run server-side if theme preference is in session cookie
- `clampMobileWidgetCount()` and `pickDashboardDensity()` must remain client-side (viewport-dependent)

## Import Strategy

**Option A (Recommended)**: Add to existing `<script type="module">` block (line ~440)
```javascript
import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } 
  from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
```

**Option B**: Create separate `<script type="module" src="/overlay/dashboard-layout-controller.js">` that imports utils and attaches to window

**Do NOT**: Inline the functions into the HTML — they are tested, frozen, and reusable across other dashboard views

## Testing Hooks

To verify integration without full AI rail:
1. Open DevTools console
2. Manually call `pickDashboardDensity({ viewportWidth: 400, widgetCount: 5, hasPinnedRail: false })` → should return `"compact"`
3. Resize viewport and check `document.documentElement.dataset.density` updates
4. Toggle theme and verify `resolveThemeMode()` is called with correct input