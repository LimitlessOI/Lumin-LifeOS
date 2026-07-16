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
      console.error('Deployment failed:', deploymentStatus?.error || 'Unknown error');
      return false;
    }
    console.log('Branch deployed successfully to Railway.');

    console.log('Fetching neon state...');
    const neonState = await getNeonState();
    if (!neonState) {
      console.error('Failed to retrieve neon state.');
      return false;
    }
    
    console.log('Running pressure test...');
    const results = await runPressureTest(neonState);
    if (!results) {
      console.error('No results returned from pressure test.');
      return false;
    }
    
    console.log('Verifying results...');
    const isVerified = verifyResults(results, 20);
    if (isVerified) {
      console.log('Pressure test passed successfully.');
    } else {
      console.error('Pressure test did not meet the expected criteria.');
    }
    
    return isVerified;
  } catch (error) {
    console.error('Pressure test verification failed:', error);
    return false;
  }
}
