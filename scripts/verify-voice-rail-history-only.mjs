#!/usr/bin/env node
/**
 * Fail-closed verification that Voice Rail remains history-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relPath) {
  const abs = path.join(ROOT, relPath);
  return fs.readFileSync(abs, 'utf8');
}

function fail(msg) {
  console.error(`VOICE_RAIL_HISTORY_ONLY_FAIL: ${msg}`);
  process.exit(1);
}

const runtimeRoutes = read('startup/register-runtime-routes.js');
if (runtimeRoutes.includes('createLifeOSVoiceRailRoutes')) {
  fail('runtime still imports Voice Rail route factory');
}
if (/\/api\/v1\/lifeos\/voice-rail/.test(runtimeRoutes) && !runtimeRoutes.includes('intentionally not mounted')) {
  fail('runtime appears to mount /api/v1/lifeos/voice-rail');
}

const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const blockedScripts = [
  'lifeos:voice-rail:v1-acceptance',
  'lifeos:voice-rail:capability-proof',
];
for (const key of blockedScripts) {
  if (!scripts[key]) continue;
  if (!String(scripts[key]).includes('hist-voice-rail-retired.mjs')) {
    fail(`package.json script "${key}" is not routed to retired guard`);
  }
}

console.log('VOICE_RAIL_HISTORY_ONLY_PASS');
