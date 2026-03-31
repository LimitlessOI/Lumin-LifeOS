#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * Uses an active local Railway CLI session to read **COMMAND_CENTER_KEY** from a
 * **linked** project directory, then runs **`tc-r4r-do-upload.mjs`** (mailbox → TD → optional seller reject).
 *
 * Prerequisite — one-time per machine (opens browser or use `railway login --browserless`):
 *   railway login
 *
 * Point at the directory where `railway link` was run for the **production** LifeOS service
 * (defaults to `RAILWAY_VARS_PROJECT_DIR` or `~/lumin-railway` if it exists):
 *
 *   RAILWAY_VARS_PROJECT_DIR=/path/to/linked/repo \
 *     node scripts/tc-r4r-from-railway.mjs --address=Mahogany --record-seller-reject
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function defaultRailwayDir() {
  const env = process.env.RAILWAY_VARS_PROJECT_DIR;
  if (env && fs.existsSync(env)) return env;
  const home = process.env.HOME || '';
  const cand = path.join(home, 'lumin-railway');
  if (fs.existsSync(cand)) return cand;
  return repoRoot;
}

function pullCommandCenterKey(projectDir) {
  const r = spawnSync('railway', ['variables', '--json'], {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const msg = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`;
    throw new Error(
      `${msg}\n\nFix: run \`railway login\` then \`railway link\` in ${projectDir} (or set RAILWAY_VARS_PROJECT_DIR).`
    );
  }
  let vars;
  try {
    vars = JSON.parse(r.stdout);
  } catch {
    throw new Error(`railway variables --json did not return JSON (stdout first 200): ${r.stdout.slice(0, 200)}`);
  }
  const k = vars.COMMAND_CENTER_KEY || vars.LIFEOS_KEY || vars.API_KEY;
  if (!k || !String(k).trim()) {
    throw new Error(
      'Railway variables did not include COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY). Check the linked service.'
    );
  }
  return String(k).trim();
}

function main() {
  const projectDir = defaultRailwayDir();
  const key = pullCommandCenterKey(projectDir);
  process.env.TC_API_KEY = key;
  process.env.COMMAND_CENTER_KEY = key;

  const doUpload = path.join(repoRoot, 'scripts/tc-r4r-do-upload.mjs');
  const passArgs = process.argv.slice(2);
  const child = spawnSync(process.execPath, [doUpload, ...passArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(child.status ?? 1);
}

main();
