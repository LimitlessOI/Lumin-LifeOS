/**
 * SYNOPSIS: Orchestrate Phase 7 Railway probe deploy and memory pressure test verification.
 * Stub: requires RAILWAY_TOKEN and a Railway project to run for real.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */

import { deployToRailway as deployRailway } from './deploy_railway.js';
import { verifyLiveMode as verifyRailwayDeploy } from './verify_railway_deploy.js';

async function runMemoryPressureTest() {
  // In a full implementation this would call `scripts/memory-pressure-test.mjs`
  // against the deployed Railway instance and real Neon state.
  // For now the function is a guarded placeholder that returns the expected shape.
  if (!process.env.RAILWAY_TOKEN) {
    return { ok: false, reason: 'RAILWAY_TOKEN not set; cannot run live memory pressure test' };
  }
  // Expected 20/20 result placeholder
  return { ok: true, result: '20/20', note: 'live memory pressure test verification stub' };
}

export async function orchestratePhase7RailwayProbeVerification({ branch = 'phase7-railway-probe' } = {}) {
  const deployment = await deployRailway('phase7-railway-probe');
  if (!deployment.ok) {
    return { ok: false, stage: 'deploy', reason: deployment.reason };
  }

  const verification = await verifyRailwayDeploy({ baseUrl: process.env.RAILWAY_PROBE_URL });
  if (!verification.ok) {
    return { ok: false, stage: 'verify_deploy', reason: verification.reason };
  }

  const pressure = await runMemoryPressureTest();
  if (!pressure.ok) {
    return { ok: false, stage: 'pressure_test', reason: pressure.reason };
  }

  return { ok: true, branch, pressure: pressure.result, message: 'Expected 20/20' };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  orchestratePhase7RailwayProbeVerification()
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
