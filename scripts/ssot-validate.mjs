#!/usr/bin/env node
/**
 * Replacement for missing scripts/ssot-validate.js (package.json `ssot:validate`).
 * Delegates to `ssot-check.js` default mode: changed-files + SSOT amendment alignment.
 *
 * @ssot docs/projects/INDEX.md
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'ssot-check.js')], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r.status == null ? 1 : r.status);
