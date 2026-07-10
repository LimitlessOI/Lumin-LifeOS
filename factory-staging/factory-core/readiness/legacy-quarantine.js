/**
 * SYNOPSIS: Exports legacyQuarantine — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/readiness/legacy-quarantine.js.
 */
export function legacyQuarantine(entry) {
  return {
    legacyLiveConflict: entry.legacyLiveConflict,
    action: 'surface_blocker_or_warning'
  };
}
