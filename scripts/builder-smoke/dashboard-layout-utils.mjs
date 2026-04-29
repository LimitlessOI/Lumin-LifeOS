/**
 * @fileoverview Dashboard layout utilities (pure, deterministic, no deps)
 * @module utils/dashboard-layout-utils
 */

/**
 * Clamps mobile widget count to valid range [1..6]
 * @param {number} count - Raw widget count
 * @returns {number} Clamped integer
 */
export function clampMobileWidgetCount(count) {
  const parsed = parseInt(count, 10);
  if (isNaN(parsed)) return 1;
  return Math.max(1, Math.min(6, parsed));
}

/**
 * Resolves theme mode to canonical value
 * @param {string} value - User-provided theme preference
 * @returns {"light"|"dark"|"system"} Normalized theme mode
 */
export function resolveThemeMode(value) {
  if (typeof value !== 'string') return 'system';
  const normalized = value.toLowerCase().trim();
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
  // Compact: small viewport with many widgets
  if (viewportWidth < 640 && widgetCount >= 4) {
    return 'compact';
  }
  
  // Compact: pinned rail with many widgets
  if (hasPinnedRail === true && widgetCount >= 5) {
    return 'compact';
  }
  
  // Airy: large viewport, few widgets, no pinned rail
  if (viewportWidth >= 1280 && widgetCount <= 3 && hasPinnedRail === false) {
    return 'airy';
  }
  
  return 'balanced';
}