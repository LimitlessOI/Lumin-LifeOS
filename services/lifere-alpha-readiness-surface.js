/**
 * SYNOPSIS: LifeRE alpha readiness surface — machine status for founder UI + API.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'PRODUCT-LIFERE-OS-V1-0001';

function readJson(rel, fallback = null) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return fallback;
  }
}

export function getLifeREAlphaReadinessSurface({ pool = null, pgTablesOk = null } = {}) {
  const verdict = readJson(`builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`, {});
  const readiness = readJson('products/receipts/LIFERE_ALPHA_READINESS.json', {});
  const html = fs.existsSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html'))
    ? fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), 'utf8')
    : '';

  const uiMarkers = [
    'daily-command-center',
    'top-3-priorities',
    'nightly-debrief',
    'chair-brief',
    'content-brief',
    'alpha-daily-cycle',
    'alpha-ready-banner',
  ].map((id) => ({
    id,
    present: html.includes(`data-lifere="${id}"`) || html.includes(`id="lifere-${id}"`),
  }));

  const technicalPass = ['TECHNICAL_PASS', 'PASS'].includes(String(verdict.verdict || '').toUpperCase());
  const machineReady = readiness.ready_for_alpha_testing === true || readiness.ok === true;
  const founderPass = verdict.founder_usability_pass === true;

  const checklist = [
    { id: 'technical_pass', label: 'Machine acceptance PASS', ok: technicalPass },
    { id: 'alpha_readiness', label: 'Alpha readiness gate PASS', ok: machineReady },
    { id: 'live_pg', label: 'Live PostgreSQL connected', ok: pgTablesOk === true ? true : (pool === false ? false : null) },
    { id: 'ui_markers', label: 'Founder UI markers present', ok: uiMarkers.every((m) => m.present) },
    { id: 'founder_confirm', label: 'Founder usability confirmed', ok: founderPass },
  ];

  const readyForTesting = technicalPass && checklist.find((c) => c.id === 'ui_markers')?.ok !== false;
  const readyForGate = readyForTesting && founderPass;

  return {
    ok: true,
    schema: 'lifere_alpha_readiness_surface_v1',
    mission_id: MISSION_ID,
    at: new Date().toISOString(),
    verdict: verdict.verdict || null,
    founder_usability_pass: founderPass,
    ready_for_alpha_testing: readyForTesting,
    ready_for_alpha_gate: readyForGate,
    founder_success_test: verdict.founder_success_test
      || 'Open lifeos-app LifeRE path; run Alpha Daily Cycle; confirm PASS with quote',
    canonical_url: '/overlay/lifeos-app.html?page=lifeos-lifere.html',
    checklist,
    ui_markers: uiMarkers,
    next_action: founderPass
      ? 'Alpha gate closed — continue Record Mode v1 + SMOS depth'
      : readyForTesting
        ? 'Run Alpha Daily Cycle → Confirm Alpha PASS with your quote (12+ chars)'
        : 'Fix failing machine gates — run npm run lifeos:lifere-alpha-readiness',
    label: founderPass ? 'KNOW' : readyForTesting ? 'THINK' : 'GUESS',
  };
}

export function runLocalAlphaReadinessCheck() {
  const r = spawnSync('npm', ['run', 'lifeos:lifere-alpha-readiness'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    exit: r.status ?? 1,
    ok: r.status === 0,
    stdout_tail: r.stdout?.slice(-400) || '',
  };
}
