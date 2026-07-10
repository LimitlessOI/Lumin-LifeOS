#!/usr/bin/env node
/**
 * SYNOPSIS: Copy mission CONTENT → target_file for every byte_exact_copy step (truth alignment after re-pin).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MISSIONS = path.join(ROOT, 'builderos-reboot/MISSIONS');
const dryRun = process.argv.includes('--dry-run');
const missionFilter = process.argv.find((a) => a.startsWith('--mission='))?.slice('--mission='.length);

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

let copied = 0;
let skipped = 0;
let missing = 0;

for (const mission of fs.readdirSync(MISSIONS).sort()) {
  if (missionFilter && mission !== missionFilter) continue;
  // Product mission CONTENT is often stale vs live code — only rematerialize factory reboot pins by default.
  if (!missionFilter && !mission.startsWith('FACTORY-REBOOT-')) continue;
  const missionDir = path.join(MISSIONS, mission);
  const bpPath = path.join(missionDir, 'BLUEPRINT.json');
  if (!fs.existsSync(bpPath)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  } catch {
    continue;
  }
  for (const step of data.steps || []) {
    const contract = step.exact_output_contract || {};
    if (contract.type !== 'byte_exact_copy' || !contract.sha256 || !step.target_file) continue;
    if (String(step.target_file).endsWith('/ACCEPTANCE_TESTS.json')) continue;
    const src =
      step.content_source_path ||
      step.exact_inputs?.content_source_path ||
      null;
    if (!src) continue;
    const contentPath = resolveContent(missionDir, src);
    if (!contentPath) {
      missing += 1;
      console.warn(`MISSING_CONTENT ${mission} ${src}`);
      continue;
    }
    const buf = fs.readFileSync(contentPath);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (sha !== contract.sha256) {
      console.warn(`PIN_DRIFT ${mission} ${step.step_id} content!=pin (skip — re-pin first)`);
      skipped += 1;
      continue;
    }
    const target = path.join(ROOT, step.target_file);
    let same = false;
    if (fs.existsSync(target)) {
      const tsha = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
      same = tsha === sha;
    }
    if (same) {
      skipped += 1;
      continue;
    }
    console.log(`${dryRun ? 'WOULD ' : ''}COPY ${mission} ${step.step_id} → ${step.target_file}`);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
    }
    copied += 1;
  }
}

console.log(`${dryRun ? 'DRY-RUN ' : ''}REMATERIALIZE: copied=${copied} skipped=${skipped} missing=${missing}`);
process.exit(0);
