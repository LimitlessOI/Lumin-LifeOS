#!/usr/bin/env node
/**
 * SYNOPSIS: Verifies Voice Rail stays API-only while founder UI routes through lifeos-app.
 * Verifies Voice Rail stays API-only while founder UI routes through lifeos-app.
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
if (!runtimeRoutes.includes('createLifeOSVoiceRailRoutes')) {
  fail('runtime no longer imports Voice Rail route factory');
}
if (!/\/api\/v1\/lifeos\/voice-rail/.test(runtimeRoutes)) {
  fail('runtime no longer mounts /api/v1/lifeos/voice-rail');
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

const publicRoutes = read('routes/public-routes.js');
if (!publicRoutes.includes('app.get("/voice-rail"')) {
  fail('public /voice-rail redirect is missing');
}
if (!publicRoutes.includes('res.redirect(301, "/lifeos?direct_system=1")')) {
  fail('public /voice-rail no longer redirects to /lifeos?direct_system=1');
}
if (!publicRoutes.includes('app.get("/overlay/lifeos-voice-rail-v1.html"')) {
  fail('legacy Voice Rail overlay redirect is missing');
}

console.log('VOICE_RAIL_HISTORY_ONLY_PASS');
