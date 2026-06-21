/**
 * SYNOPSIS: Exports legacyQuarantine — factory-staging/factory-core/readiness/legacy-quarantine.js.
 */
export function legacyQuarantine(entry) {
  return {
    legacyLiveConflict: entry.legacyLiveConflict,
    action: 'surface_blocker_or_warning'
  };
}
