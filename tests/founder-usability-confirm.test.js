/**
 * SYNOPSIS: js — tests/founder-usability-confirm.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { confirmFounderUsability } from '../services/founder-usability-confirm.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-LIFERE-OS-V1-0001';
const VERDICT_PATH = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

test('confirmFounderUsability rejects pass without quote', () => {
  const result = confirmFounderUsability({
    missionId: MISSION,
    pass: true,
    quote: 'short',
    root: REPO_ROOT,
  });
  assert.equal(result.ok, false);
});

test('confirmFounderUsability records fail without long quote', () => {
  const before = JSON.parse(fs.readFileSync(VERDICT_PATH, 'utf8'));
  const result = confirmFounderUsability({
    missionId: MISSION,
    pass: false,
    quote: '',
    root: REPO_ROOT,
  });
  assert.equal(result.ok, true);
  assert.equal(result.founder_usability_pass, false);
  fs.writeFileSync(VERDICT_PATH, `${JSON.stringify(before, null, 2)}\n`);
});

console.log('✅ founder-usability-confirm.test.js passed');
