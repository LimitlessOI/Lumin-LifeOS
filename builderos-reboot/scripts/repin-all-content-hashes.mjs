#!/usr/bin/env node
/**
 * SYNOPSIS: Wave 0 #6 — re-pin all mission exact_output_contract.sha256 to current CONTENT/disk bytes.
 * Truth = files on disk; pins must match or verify-content-pin-truth fails.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSIONS = path.join(ROOT, 'builderos-reboot/MISSIONS');
const dryRun = process.argv.includes('--dry-run');

function resolveContent(missionDir, src) {
  const candidates = [
    path.isAbsolute(src) ? src : path.join(ROOT, src),
    path.join(missionDir, src),
    path.join(missionDir, 'CONTENT', path.basename(src)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

let missionsTouched = 0;
let pinsUpdated = 0;
let missing = 0;

for (const mission of fs.readdirSync(MISSIONS).sort()) {
  const missionDir = path.join(MISSIONS, mission);
  const bpPath = path.join(missionDir, 'BLUEPRINT.json');
  if (!fs.existsSync(bpPath)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  } catch {
    continue;
  }
  let missionUpdated = 0;
  for (const step of data.steps || []) {
    const contract = step.exact_output_contract || {};
    if (!contract.sha256) continue;
    const src =
      step.content_source_path ||
      step.exact_inputs?.content_source_path ||
      null;
    if (!src) continue;
    const file = resolveContent(missionDir, src);
    if (!file) {
      missing += 1;
      console.warn(`MISSING ${mission} ${src}`);
      continue;
    }
    const disk = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (disk !== contract.sha256) {
      console.log(
        `${mission} ${step.step_id || '?'} ${src}: ${contract.sha256.slice(0, 12)} -> ${disk.slice(0, 12)}`,
      );
      contract.sha256 = disk;
      missionUpdated += 1;
      pinsUpdated += 1;
    }
  }
  if (missionUpdated > 0) {
    missionsTouched += 1;
    if (!dryRun) {
      fs.writeFileSync(bpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    }
  }
}

console.log(
  `${dryRun ? 'DRY-RUN ' : ''}REPIN: missions=${missionsTouched} pins=${pinsUpdated} missing=${missing}`,
);
process.exit(0);
