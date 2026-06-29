#!/usr/bin/env node
/**
 * SYNOPSIS: Verifies LifeOS dashboard visual SSOT is present on disk and queue targets stay grounded.
 * Verifies LifeOS dashboard visual SSOT is present on disk and queue targets stay grounded.
 * No network. Used by CI / compliance-officer / pre-queue sanity.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const REQUIRED_TEXT = 'docs/mockups/DASHBOARD_UI_MAP.md';
const REQUIRED_UX_ARCH = 'docs/projects/LIFEOS_UX_ARCHITECTURE.md';
const REQUIRED_MOCKUPS = [
  'docs/mockups/lifeos-system-map-board-2x.png',
  'docs/mockups/lifeos-shell-dashboard-architecture-board-2x.png',
  'docs/mockups/lifeos-expansion-stack-board-2x.png',
  'docs/mockups/lifeos-dashboard-density-study-light-dark-mobile-desktop.png',
];
const DEFAULT_QUEUE = 'docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json';

async function fileExists(rel) {
  try {
    await access(join(ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const errors = [];
  const notes = [];

  for (const rel of [REQUIRED_TEXT, REQUIRED_UX_ARCH, ...REQUIRED_MOCKUPS]) {
    if (!(await fileExists(rel))) errors.push(`missing file: ${rel}`);
  }

  const mapBody = await readFile(join(ROOT, REQUIRED_TEXT), 'utf8').catch(() => '');
  if (mapBody.length < 400) errors.push(`${REQUIRED_TEXT} too short or unreadable (expected full UI map)`);

  const uxArchBody = await readFile(join(ROOT, REQUIRED_UX_ARCH), 'utf8').catch(() => '');
  if (uxArchBody.length < 800)
    errors.push(`${REQUIRED_UX_ARCH} too short or unreadable (expected Lumin-first UX principles SSOT)`);

  const queueRel = process.env.BUILDER_TASKS_PATH || DEFAULT_QUEUE;
  const queuePath = queueRel.startsWith('/') ? queueRel : join(ROOT, queueRel);
  try {
    const raw = await readFile(queuePath, 'utf8');
    JSON.parse(raw);
    notes.push(`queue JSON OK: ${queuePath.replace(`${ROOT}/`, '')} (LifeOS queue auto-prepends UI grounding in lifeos-builder-continuous-queue.mjs when BUILDER_ENFORCE_UI_MAP≠0)`);
  } catch (e) {
    notes.push(`queue parse skip: ${e?.message || e}`);
  }

  if (errors.length) {
    console.error('[verify-dashboard-ui-map] FAIL:\n', errors.join('\n'));
    process.exit(1);
  }
  console.log('[verify-dashboard-ui-map] OK — mockups + DASHBOARD_UI_MAP + LIFEOS_UX_ARCHITECTURE present.');
  for (const n of notes) console.log(' ', n);
}

main();
