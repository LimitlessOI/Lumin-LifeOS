/**
 * SYNOPSIS: Exports deployPhase7 — scripts/railway_verification.mjs.
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function deployPhase7() {
  try {
    // Deploy phase7-railway-probe branch to Railway
    await execAsync('railway deploy --branch phase7-railway-probe');
    
    // Run live mode of memory-pressure-test.mjs
    await execAsync('node --input-type=module scripts/memory-pressure-test.mjs --live');
    
    // Verify 20/20 result against real Neon state and mounted routes
    const { stdout } = await execAsync('neon verify --expect 20/20');
    
    if (stdout.includes('20/20')) {
      console.log('Verification successful: 20/20 result achieved.');
    } else {
      throw new Error('Verification failed: 20/20 result not achieved.');
    }
  } catch (error) {
    console.error('Deployment and verification failed:', error);
    throw error;
  }
}
