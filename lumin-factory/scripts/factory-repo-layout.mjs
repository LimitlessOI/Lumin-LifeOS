/**
 * Detect factory repo layout: standalone Lumin-Factory vs legacy LifeOS monorepo.
 * @ssot docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER_MISSION = 'FACTORY-REBOOT-0001';

export function repoRootFromScriptMeta(metaUrl) {
  const scriptDir = path.dirname(fileURLToPath(metaUrl));
  const parent = path.resolve(scriptDir, '..');
  const grandparent = path.resolve(scriptDir, '../..');

  const standaloneAtParent =
    fs.existsSync(path.join(parent, 'missions', MARKER_MISSION, 'BLUEPRINT.json')) &&
    fs.existsSync(path.join(parent, 'factory-staging', 'server.js')) &&
    !fs.existsSync(path.join(parent, 'builderos-reboot'));

  if (standaloneAtParent) {
    return parent;
  }

  if (fs.existsSync(path.join(grandparent, 'builderos-reboot', 'MISSIONS', MARKER_MISSION, 'BLUEPRINT.json'))) {
    return grandparent;
  }

  if (fs.existsSync(path.join(parent, 'missions', MARKER_MISSION, 'BLUEPRINT.json'))) {
    return parent;
  }

  return grandparent;
}

export function detectFactoryLayout(repoRoot = process.cwd()) {
  const hasLifeosSpine = fs.existsSync(path.join(repoRoot, 'server.js'));
  const monorepoMarker = path.join(repoRoot, 'builderos-reboot', 'MISSIONS', MARKER_MISSION, 'BLUEPRINT.json');
  const standaloneMarker = path.join(repoRoot, 'missions', MARKER_MISSION, 'BLUEPRINT.json');

  if (fs.existsSync(monorepoMarker) && hasLifeosSpine) {
    return {
      mode: 'monorepo_legacy',
      repoRoot,
      missionsRel: 'builderos-reboot/MISSIONS',
      missionsDir: path.join(repoRoot, 'builderos-reboot', 'MISSIONS'),
      scriptsRel: 'builderos-reboot/scripts',
      scriptsDir: path.join(repoRoot, 'builderos-reboot', 'scripts'),
      factoryStagingRel: 'factory-staging',
      machineRel: 'builderos-reboot',
      legacyHost: true,
    };
  }

  if (fs.existsSync(standaloneMarker) && fs.existsSync(path.join(repoRoot, 'factory-staging', 'server.js'))) {
    return {
      mode: 'standalone',
      repoRoot,
      missionsRel: 'missions',
      missionsDir: path.join(repoRoot, 'missions'),
      scriptsRel: 'scripts',
      scriptsDir: path.join(repoRoot, 'scripts'),
      factoryStagingRel: 'factory-staging',
      machineRel: '',
      legacyHost: false,
    };
  }

  throw new Error(
    `Unknown factory layout under ${repoRoot}: expected builderos-reboot/MISSIONS/${MARKER_MISSION} (monorepo) or missions/${MARKER_MISSION} (standalone)`,
  );
}

export function machinePath(repoRoot, layout, ...parts) {
  return layout.machineRel
    ? path.join(repoRoot, layout.machineRel, ...parts)
    : path.join(repoRoot, ...parts);
}

export function missionDir(layout, missionId) {
  return path.join(layout.missionsDir, missionId);
}

export function scriptPath(layout, scriptName) {
  return path.join(layout.scriptsDir, scriptName);
}

/** Paths that must never be write targets from factory blueprints in monorepo mode. */
export const LEGACY_WRITE_PREFIXES = [
  'routes/',
  'services/',
  'public/',
  'startup/',
  'config/',
  'db/',
  'server.js',
  'package.json',
  'scripts/deliberation-',
  'scripts/lifeos-',
];

export function isLegacyWriteTarget(relativePath, layout) {
  if (!layout.legacyHost) return false;
  const normalized = relativePath.replace(/\\/g, '/');
  return LEGACY_WRITE_PREFIXES.some(
    (prefix) => normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix),
  );
}
