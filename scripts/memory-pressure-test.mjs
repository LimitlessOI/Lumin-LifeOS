/**
 * SYNOPSIS: Exports verifyLiveModePressureTest — scripts/memory-pressure-test.mjs.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
export async function verifyLiveModePressureTest() {
  console.log('Starting live mode pressure test verification...');

  try {
    console.log('Deploying branch to Railway platform...');
    const deploymentStatus = await deployBranch('phase7-railway-probe');
    if (!deploymentStatus || deploymentStatus.error) {
      console.error('Deployment failed:', deploymentStatus?.error || 'Unknown error', 'Branch:', 'phase7-railway-probe');
      return false;
    }
    console.log('Branch deployed successfully to Railway.');

    console.log('Fetching Neon state...');
    const neonState = await getNeonState();
    if (!neonState) {
      console.error('Failed to retrieve Neon state.');
      return false;
    }
    console.log('Neon state retrieved successfully.');

    console.log('Running pressure test with live mode verification...');
    const results = await runPressureTest(neonState);
    if (!results) {
      console.error('No results returned from pressure test.');
      return false;
    }

    console.log('Verifying live mode results against expected criteria...');
    const isVerified = verifyResults(results, 20);
    if (isVerified) {
      console.log('Live mode pressure test passed successfully.');
    } else {
      console.error('Live mode pressure test did not meet the expected criteria.');
    }

    return isVerified;
  } catch (error) {
    console.error('Live mode pressure test verification failed:', error.message || error, 'Stack:', error.stack || 'No stack trace');
    return false;
  }
}
