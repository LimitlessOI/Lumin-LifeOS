/**
 * SYNOPSIS: Exports setVapiEnvVar — scripts/setVapiEnvVar.mjs.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import { execSync } from 'child_process';

export function setVapiEnvVar(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    execSync(`railway env set VAPI_API_KEY=${apiKey}`);
    console.log('VAPI API key has been set successfully.');
  } catch (error) {
    console.error('Failed to set VAPI API key:', error);
  }
}