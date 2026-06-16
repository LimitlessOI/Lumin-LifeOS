#!/usr/bin/env node
/**
 * LifeOS version overnight — run foundation pipeline on each versioned mission.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runFoundationPipeline } from '../factory-staging/factory-core/arc/run-foundation.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_PATH = path.join(ROOT, 'builderos-reboot/LIFEOS_VERSION_QUEUE.json');
const LOG_PATH = path.join(ROOT, 'data/lifeos-version-overnight-log.json');

const force = process.argv.includes('--force');
const skipAcceptance = process.argv.includes('--skip-acceptance');
const onlyMission = process.argv.find((a) => a.startsWith('--mission='))?.split('=')[1];

const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
const versions = onlyMission
  ? queue.versions.filter((v) => v.mission_id === onlyMission)
  : queue.versions;

const log = {
  schema: 'lifeos_version_overnight_v1',
  started_at: new Date().toISOString(),
  machine_alpha: queue.machine_alpha_definition,
  runs: [],
};

for (const ver of versions) {
  const entry = {
    version: ver.version,
    mission_id: ver.mission_id,
    name: ver.name,
    at: new Date().toISOString(),
  };

  const foundation = runFoundationPipeline(ver.mission_id, { force });
  entry.foundation = {
    ok: foundation.ok,
    awaiting_alpha: foundation.report?.awaiting_alpha,
    status: foundation.report?.stages?.final_gate?.status,
  };

  if (foundation.ok && ver.acceptance_command && !skipAcceptance) {
    const cmd = ver.acceptance_command.replace(/^npm run /, '');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const scriptBody = pkg.scripts?.[cmd];
    if (scriptBody) {
      const acc = spawnSync('npm', ['run', cmd], {
        cwd: ROOT,
        encoding: 'utf8',
        env: process.env,
        timeout: 300_000,
      });
      entry.acceptance = {
        command: ver.acceptance_command,
        ok: acc.status === 0,
        exit: acc.status,
        stderr: String(acc.stderr || '').slice(0, 500),
      };
    } else {
      entry.acceptance = { ok: false, error: 'script_not_in_package_json', command: cmd };
    }
  }

  entry.pass = entry.foundation.ok && (entry.acceptance?.ok !== false);
  log.runs.push(entry);
  console.log(JSON.stringify(entry, null, 2));
}

log.finished_at = new Date().toISOString();
log.summary = {
  total: log.runs.length,
  foundation_pass: log.runs.filter((r) => r.foundation?.ok).length,
  acceptance_pass: log.runs.filter((r) => r.acceptance?.ok).length,
  full_pass: log.runs.filter((r) => r.pass).length,
};
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
fs.writeFileSync(LOG_PATH, `${JSON.stringify(log, null, 2)}\n`);
console.log(JSON.stringify(log.summary, null, 2));
process.exit(log.runs.every((r) => r.foundation?.ok) ? 0 : 1);
