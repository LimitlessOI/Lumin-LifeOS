/**
 * SYNOPSIS: Runtime repo layout — standalone Lumin-Factory vs LifeOS monorepo host.
 * @authority Canonical factory runtime — see factory-staging/AGENTS.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER_MISSION = 'FACTORY-REBOOT-0001';

const LAYOUT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FACTORY_ROOT = path.resolve(LAYOUT_DIR, '../..');
export const REPO_ROOT = path.resolve(FACTORY_ROOT, '..');

export function detectLayout(repoRoot = REPO_ROOT) {
  const hasLifeosSpine = fs.existsSync(path.join(repoRoot, 'server.js'));
  const monorepoMarker = path.join(repoRoot, 'builderos-reboot', 'MISSIONS', MARKER_MISSION, 'BLUEPRINT.json');

  if (fs.existsSync(monorepoMarker) && hasLifeosSpine) {
    return {
      mode: 'monorepo_legacy',
      missionsRel: 'builderos-reboot/MISSIONS',
      machineRel: 'builderos-reboot',
      legacyHost: true,
    };
  }

  const standaloneMarker = path.join(repoRoot, 'missions', MARKER_MISSION, 'BLUEPRINT.json');
  if (
    fs.existsSync(standaloneMarker) &&
    fs.existsSync(path.join(repoRoot, 'factory-staging', 'server.js')) &&
    !fs.existsSync(path.join(repoRoot, 'builderos-reboot'))
  ) {
    return {
      mode: 'standalone',
      missionsRel: 'missions',
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
