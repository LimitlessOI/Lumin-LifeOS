/**
 * SYNOPSIS: Exports verifyLiveModePressureTest — scripts/memory-pressure-test.mjs.
 */
import { deployBranch, runPressureTest } from 'phase7-railway-probe';
import { getNeonState, verifyResults } from 'neon-state-utils';

export async function verifyLiveModePressureTest() {
  try {
    await deployBranch('phase7-railway-probe');
    const neonState = await getNeonState();
    const results = await runPressureTest(neonState);
    return verifyResults(results, 20); // Ensure 20/20 passing result
  } catch (error) {
    console.error('Pressure test verification failed:', error);
    return false;
  }
}
