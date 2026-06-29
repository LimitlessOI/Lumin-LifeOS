/**
 * SYNOPSIS: Lazy-load factory-staging arc modules (avoids boot crash if tree missing).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

let cached = null;

export async function loadFactoryArcModules() {
  if (cached) return cached;
  const [
    pointBTarget,
    pointBGate,
    builderEntryGate,
    gateEnforcement,
    missionPaths,
    runFoundation,
    idcExitGate,
  ] = await Promise.all([
    import('../factory-staging/factory-core/arc/foundation/point-b-target.js'),
    import('../factory-staging/factory-core/arc/point-b-gate.js'),
    import('../factory-staging/factory-core/arc/foundation/builder-entry-gate.js'),
    import('../factory-staging/factory-core/arc/gate-enforcement.js'),
    import('../factory-staging/factory-core/arc/mission-paths.js'),
    import('../factory-staging/factory-core/arc/run-foundation.js'),
    import('../factory-staging/factory-core/arc/foundation/idc-exit-gate.js'),
  ]);
  cached = {
    ...pointBTarget,
    ...pointBGate,
    ...builderEntryGate,
    ...gateEnforcement,
    ...missionPaths,
    ...runFoundation,
    ...idcExitGate,
  };
  return cached;
}
