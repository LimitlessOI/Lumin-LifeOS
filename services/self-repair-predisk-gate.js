/**
 * SYNOPSIS: Exports checkImportResolution — services/self-repair-predisk-gate.js.
 */
import fs from 'fs';
import path from 'path';

export function checkImportResolution({ absTargetPath, content, repoRoot }) {
  const regex = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]|require\(['"](\.[^'"]+)['"]\)/g;
  const missing = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const relativePath = match[1] || match[2];
    const resolvedPath = path.resolve(path.dirname(absTargetPath), relativePath);
    const possibleFiles = [
      resolvedPath,
      `${resolvedPath}.js`,
      `${resolvedPath}.mjs`,
      `${resolvedPath}.cjs`,
      path.join(resolvedPath, 'index.js'),
    ];
    if (!possibleFiles.some(fs.existsSync)) {
      missing.push(relativePath);
    }
  }

  return { ok: missing.length === 0, missing };
}

export function checkFounderLaneMount({ targetPath, autoRegisteredModulesPath, repoRoot }) {
  if (!targetPath.startsWith('routes/')) {
    return { ok: true, registered: false };
  }

  const configPath = path.resolve(repoRoot, autoRegisteredModulesPath);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const isRegistered = config.modules.includes(targetPath);

  return { ok: true, registered: isRegistered };
}