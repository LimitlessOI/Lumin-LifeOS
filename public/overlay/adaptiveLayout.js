/**
 * SYNOPSIS: Exports getAdaptiveLayoutSettings — public/overlay/adaptiveLayout.js.
 */
const flourishing_prefs = {};

export function getAdaptiveLayoutSettings() {
  return flourishing_prefs.adaptiveLayout || {};
}

export function saveAdaptiveLayoutSettings(settings) {
  flourishing_prefs.adaptiveLayout = settings;
}
