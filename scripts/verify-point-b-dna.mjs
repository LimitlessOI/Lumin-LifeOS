#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Point B DNA locked — constitution, runtime, preflight (HARD).
 * @ssot docs/constitution/POINT_B_DNA.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertPointBDnaFilesExist, POINT_B_DNA_VERSION, stampPointBDna } from '../services/point-b-dna.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const filesCheck = assertPointBDnaFilesExist();
if (!filesCheck.ok) failures.push(...filesCheck.failures);

const REQUIRED_WIRING = [
  { file: 'services/truth-enforcement-spine.js', needles: ['stampPointBDna', 'point-b-dna.js'] },
  { file: 'services/lumin-chair-orchestrator.js', needles: ['POINT_B_DNA_VERSION', 'point_a_to_point_b'] },
  { file: 'services/lifeos-lumin.js', needles: ['getPointBDnaPromptBlock'] },
  { file: 'prompts/00-LIFEOS-AGENT-CONTRACT.md', needles: ['POINT_B_DNA', 'Point A → Point B'] },
  { file: 'docs/LUMIN_DOCTRINE.md', needles: ['Point B DNA', 'point_a_to_point_b'] },
  { file: 'builderos-reboot/governance/CHAIR_INTENT_PROTOCOL.json', needles: ['POINT_B_DNA'] },
  { file: 'builderos-reboot/POINT_B_TARGET.json', needles: ['point_b_dna'] },
];

for (const req of REQUIRED_WIRING) {
  const full = path.join(ROOT, req.file);
  if (!fs.existsSync(full)) {
    failures.push(`MISSING ${req.file}`);
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  for (const n of req.needles) {
    if (!src.includes(n)) failures.push(`${req.file} missing ${n}`);
  }
}

const stamped = stampPointBDna({
  pass_fail: 'PASS',
  ok: true,
  human_summary: 'Point B reached — governance complete and receipt scan pass.',
  founder_usability_pass: false,
  command_truth: 'NO_COMMAND_RAN',
});
if (stamped.pass_fail !== 'FAIL' || stamped.truth_gate_violation !== 'PROCESS_THEATER_AS_POINT_B') {
  failures.push('stampPointBDna must downgrade process theater claiming Point B');
}

const testRun = spawnSync('node', ['--test', 'tests/point-b-dna.test.js'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (testRun.status !== 0) {
  failures.push(`point-b-dna tests failed:\n${testRun.stdout}\n${testRun.stderr}`);
}

const report = {
  schema: 'point_b_dna_verify_v1',
  version: POINT_B_DNA_VERSION,
  at: new Date().toISOString(),
  ok: failures.length === 0,
  failures,
  supreme_authority: 'docs/constitution/POINT_B_DNA.md',
};

const outPath = path.join(ROOT, 'products/receipts/POINT_B_DNA_VERIFY.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('POINT_B_DNA_VERIFY FAIL');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}

console.log('POINT_B_DNA_VERIFY OK');
console.log(JSON.stringify(report, null, 2));
process.exit(0);
