/**
 * @fileoverview Dashboard layout utilities (pure, deterministic, no deps)
 * @module utils/dashboard-layout-helpers
 */

/**
 * Clamps mobile widget count to valid range [1..6]
 * @param {number} count - Raw widget count
 * @returns {number} Clamped integer
 */
export function clampMobileWidgetCount(count) {
  const n = Math.floor(Number(count) || 1);
  return Math.max(1, Math.min(6, n));
}

/**
 * Resolves theme mode to canonical value
 * @param {string} value - User preference string
 * @returns {"light"|"dark"|"system"} Normalized theme mode
 */
export function resolveThemeMode(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'light') return 'light';
  if (normalized === 'dark') return 'dark';
  return 'system';
}

/**
 * Picks dashboard density based on viewport and widget state
 * @param {Object} opts
 * @param {number} opts.viewportWidth - Viewport width in pixels
 * @param {number} opts.widgetCount - Number of active widgets
 * @param {boolean} opts.hasPinnedRail - Whether sidebar is pinned
 * @returns {"compact"|"balanced"|"airy"} Density mode
 */
export function pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) {
  // Compact: mobile with many widgets OR pinned rail with many widgets
  if (viewportWidth < 640 && widgetCount >= 4) return 'compact';
  if (hasPinnedRail && widgetCount >= 5) return 'compact';
  
  // Airy: wide viewport with few widgets and no pinned rail
  if (viewportWidth >= 1280 && widgetCount <= 3 && !hasPinnedRail) return 'airy';
  
  // Default: balanced
  return 'balanced';
}