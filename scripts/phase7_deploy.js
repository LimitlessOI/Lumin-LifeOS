/**
 * SYNOPSIS: Exports deployToRailway — scripts/phase7_deploy.js.
 */
import { execSync } from 'child_process';

export function deployToRailway() {
  try {
    console.log('Deploying phase7-railway-probe branch to Railway...');
    execSync('git checkout phase7-railway-probe', { stdio: 'inherit' });
    execSync('railway up', { stdio: 'inherit' });
    console.log('Deployment successful. Initiating live mode for memory-pressure-test...');
    execSync('node scripts/memory-pressure-test.mjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('Deployment failed:', error.message);
    throw error;
  }
}

export const deploymentMessage = 'Deployment script executed. Check logs for potential errors or issues.';