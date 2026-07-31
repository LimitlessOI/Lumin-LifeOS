/**
 * SYNOPSIS: Verify the never-stop / governed-autonomous-shipping commit path is
 * gated by file-placement + blueprint-priority authority in deployment-service.
 *
 * Usage:
 *   node scripts/verify-never-stop-gate.mjs [--dry-run]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOYMENT_SERVICE = path.join(ROOT, 'services', 'deployment-service.js');

const content = readFileSync(DEPLOYMENT_SERVICE, 'utf8');
const errors = [];

if (!content.includes('function assertFilePlacementAndBlueprintAuthority')) {
  errors.push('assertFilePlacementAndBlueprintAuthority not found in deployment-service.js');
}

const commitToGitHubFn = content.match(/async function commitToGitHub[\s\S]*?async function commitManyToGitHub/);
if (!commitToGitHubFn || !commitToGitHubFn[0].includes('assertFilePlacementAndBlueprintAuthority')) {
  errors.push('commitToGitHub does not call assertFilePlacementAndBlueprintAuthority');
}

const commitManyToGitHubFn = content.match(/async function commitManyToGitHub[\s\S]*?async function/);
if (!commitManyToGitHubFn || !commitManyToGitHubFn[0].includes('assertFilePlacementAndBlueprintAuthority')) {
  errors.push('commitManyToGitHub does not call assertFilePlacementAndBlueprintAuthority');
}

// Run the unit test suite as the dry-run proof.
if (process.argv.includes('--dry-run')) {
  try {
    execSync('node --test tests/never-stop-gate.test.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    errors.push('tests/never-stop-gate.test.js failed');
  }
}

if (errors.length) {
  for (const e of errors) console.error('❌', e);
  process.exit(1);
}

console.log('✅ never-stop gate verified: commitToGitHub and commitManyToGitHub enforce file-placement + blueprint-priority authority');
