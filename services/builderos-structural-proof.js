/**
 * SYNOPSIS: @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const getExpectedAuthorityPaths = () => {
  return {
    routes: [
      'routes/lifeos-council-builder-routes.js',
      'routes/lifeos-builderos-command-control-routes.js',
      'routes/tsos-efficiency-routes.js',
      'routes/autonomous-telemetry-routes.js'
    ],
    services: [
      'services/builderos-system-alpha-readiness.js',
      'services/builderos-build-pipeline.js',
      'services/builderos-precommit-governance.js',
      'services/builderos-patch-mode-policy.js',
      'services/oil-proof-freshness.js'
    ],
    scripts: [
      'scripts/builderos-groq-antipattern-scan.mjs',
      'scripts/builderos-builder-output-verifier.mjs',
      'scripts/verify-builder-output.mjs'
    ],
    legacy_surfaces: ['routes/command-center-routes.js']
  };
};

const getLiveAuthorityPaths = () => {
  try {
    const routes = readdirSync('routes')
      .filter(file => file.includes('builder') || file.includes('builderos') || file.includes('command-control') || file.includes('tsos-efficiency') || file.includes('autonomous-telemetry'))
      .map(file => join('routes', file));
    const services = readdirSync('services')
      .filter(file => file.includes('builderos') || file.includes('oil-') || file.includes('alpha-readiness'))
      .map(file => join('services', file));
    const scripts = readdirSync('scripts')
      .filter(file => file.includes('builderos') || file.includes('verify-builder'))
      .map(file => join('scripts', file));
    const legacy_surfaces = readdirSync('routes')
      .filter(file => file.includes('command-center') && !file.includes('builderos'))
      .map(file => join('routes', file));
    return { routes, services, scripts, legacy_surfaces };
  } catch (error) {
    return { routes: [], services: [], scripts: [], legacy_surfaces: [] };
  }
};

const detectDuplicateAuthority = (expected, live) => {
  const findings = [];
  for (const key in expected) {
    for (const file of live[key]) {
      if (!expected[key].some(fileExpected => fileExpected.endsWith(file))) {
        findings.push({ path: file, type: key, signal: 'unexpected_live' });
      }
    }
    for (const file of expected[key]) {
      if (!live[key].some(fileLive => fileLive.endsWith(file))) {
        findings.push({ path: file, type: key, signal: 'expected_missing' });
      }
    }
  }
  return findings;
};

const detectLegacyLiveConflicts = (live) => {
  const conflicts = [];
  for (const file of live.legacy_surfaces) {
    const exists = existsSync(join(ROOT, 'routes', file));
    conflicts.push({ file, exists, risk: exists ? 'LEGACY_LIVE' : 'LEGACY_REMOVED' });
  }
  return conflicts;
};

const runStructuralProofCheck = () => {
  const expected = getExpectedAuthorityPaths();
  const live = getLiveAuthorityPaths();
  const authority_drift = detectDuplicateAuthority(expected, live);
  const legacy_conflicts = detectLegacyLiveConflicts(live);
  const drift_detected = authority_drift.length > 0 || legacy_conflicts.some(conflict => conflict.exists);
  return {
    checked_at: new Date().toISOString(),
    expected,
    live,
    authority_drift,
    legacy_conflicts,
    drift_detected,
    summary: authority_drift.length + ' authority drift signals, ' + legacy_conflicts.length + ' legacy-live conflicts'
  };
};

export { runStructuralProofCheck, getExpectedAuthorityPaths, getLiveAuthorityPaths, detectDuplicateAuthority, detectLegacyLiveConflicts };