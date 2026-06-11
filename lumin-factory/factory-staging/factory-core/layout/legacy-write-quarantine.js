/**
 * Block factory blueprint writes into LifeOS product spine when hosted in monorepo.
 * @ssot docs/architecture/factory-v1-blueprint-pack/FACTORY_REBUILD_MANIFEST_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';

const LEGACY_WRITE_PREFIXES = [
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

export function isLifeosMonorepoHost(repoRoot) {
  return (
    fs.existsSync(path.join(repoRoot, 'server.js')) &&
    fs.existsSync(path.join(repoRoot, 'routes/lifeos-council-builder-routes.js'))
  );
}

export function isLegacyWriteTarget(relativePath, repoRoot) {
  if (!isLifeosMonorepoHost(repoRoot)) return false;
  const normalized = relativePath.replace(/\\/g, '/');
  return LEGACY_WRITE_PREFIXES.some(
    (prefix) => normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix),
  );
}
