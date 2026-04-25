#!/usr/bin/env node
/**
 * Flags manifests with build_ready: true whose linked amendment lacks
 * Pre-Build Readiness / Gate markers (from AMENDMENT_READINESS_CHECKLIST.md).
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const dir = path.join(ROOT, 'docs/projects');
  const entries = await fs.readdir(dir);
  const manifests = entries.filter((f) => f.endsWith('.manifest.json'));
  let violations = 0;

  for (const m of manifests) {
    const mp = path.join(dir, m);
    const raw = await fs.readFile(mp, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!data.build_ready) continue;
    const amdRel = data.amendment;
    if (!amdRel || typeof amdRel !== 'string') continue;
    const amdPath = path.join(ROOT, amdRel);
    let text;
    try {
      text = await fs.readFile(amdPath, 'utf8');
    } catch {
      console.warn(`[READINESS] ${m} → missing amendment ${amdRel}`);
      violations++;
      continue;
    }
    const hasGates =
      text.includes('## Pre-Build Readiness') ||
      (text.includes('### Gate 1') && text.includes('### Gate 5'));
    if (!hasGates) {
      console.warn(
        `[READINESS] ${m} has build_ready:true but ${amdRel} lacks Pre-Build Readiness / Gate 1–5 markers — see docs/projects/AMENDMENT_READINESS_CHECKLIST.md`
      );
      violations++;
    }
  }

  if (violations) {
    console.warn(`\n[READINESS] ${violations} manifest(s) flagged (warn-only).`);
  } else {
    console.log('[READINESS] OK — no build_ready manifest missing readiness gates.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
