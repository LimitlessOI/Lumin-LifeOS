#!/usr/bin/env node
/**
 * SYNOPSIS: Verify mission CONTENT pins — existing CONTENT sha256 must match exact_output_contract.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSIONS = path.join(ROOT, 'builderos-reboot/MISSIONS');
const enforceMissing = process.argv.includes('--enforce-missing');

const mismatches = [];
const missing = [];
let checked = 0;

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

for (const mission of fs.readdirSync(MISSIONS)) {
  const bpPath = path.join(MISSIONS, mission, 'BLUEPRINT.json');
  if (!fs.existsSync(bpPath)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  } catch {
    continue;
  }
  for (const step of data.steps || []) {
    const contract = step.exact_output_contract || {};
    const sha = contract.sha256;
    const src =
      step.content_source_path ||
      step.exact_inputs?.content_source_path ||
      null;
    if (!sha || !src) continue;
    const file = resolveContent(path.join(MISSIONS, mission), src);
    if (!file) {
      missing.push({ mission, src });
      continue;
    }
    checked += 1;
    const disk = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (disk !== sha) {
      mismatches.push({ mission, src, pin: sha.slice(0, 12), disk: disk.slice(0, 12) });
    }
  }
}

if (mismatches.length || (enforceMissing && missing.length)) {
  console.error('CONTENT PIN TRUTH: FAIL');
  for (const m of mismatches) console.error(`  MISMATCH ${m.mission} ${m.src} pin=${m.pin} disk=${m.disk}`);
  if (enforceMissing) {
    for (const m of missing) console.error(`  MISSING ${m.mission} ${m.src}`);
  } else if (missing.length) {
    console.log(`CONTENT PIN TRUTH: ${missing.length} missing CONTENT path(s) noted (not enforced; use --enforce-missing)`);
  }
  process.exit(1);
}

console.log(
  `CONTENT PIN TRUTH: PASS (checked=${checked}, missing_noted=${missing.length}, mismatches=0)`,
);
process.exit(0);
