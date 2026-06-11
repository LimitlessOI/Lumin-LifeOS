#!/usr/bin/env node
/** Run ACCEPTANCE_TESTS.json for a mission pack. Exit 0 only if all pass. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { detectFactoryLayout, missionDir as layoutMissionDir } from './factory-repo-layout.mjs';

const ROOT = process.cwd();
const missionId = process.argv[2];
if (!missionId) {
  console.error('Usage: node run-mission-acceptance.mjs FACTORY-REBOOT-0001');
  process.exit(1);
}

const layout = detectFactoryLayout(ROOT);
const missionDir = layoutMissionDir(layout, missionId);
const tests = JSON.parse(fs.readFileSync(path.join(missionDir, 'ACCEPTANCE_TESTS.json'), 'utf8'));

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function getField(obj, fieldPath) {
  return fieldPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

let passed = 0;
let failed = 0;

for (const test of tests) {
  const target = test.target ? path.join(ROOT, test.target) : null;
  let ok = false;
  let detail = '';

  try {
    switch (test.type) {
      case 'file_exists':
        ok = fs.existsSync(target);
        detail = ok ? 'exists' : 'missing';
        break;
      case 'json_parseable':
        ok = fs.existsSync(target);
        if (ok) JSON.parse(fs.readFileSync(target, 'utf8'));
        detail = ok ? 'parses' : 'missing or invalid json';
        break;
      case 'file_contains_string':
        ok = fs.existsSync(target) && fs.readFileSync(target, 'utf8').includes(test.expected);
        detail = ok ? 'contains expected string' : 'missing string';
        break;
      case 'file_sha256_matches': {
        ok = fs.existsSync(target) && sha256File(target) === test.expected_sha256;
        detail = ok ? 'sha256 match' : `sha256 mismatch (got ${fs.existsSync(target) ? sha256File(target) : 'missing'})`;
        break;
      }
      case 'json_field_equals': {
        const json = JSON.parse(fs.readFileSync(target, 'utf8'));
        const val = getField(json, test.field_path);
        ok = val === test.expected;
        detail = ok ? `${test.field_path}=${test.expected}` : `${test.field_path}=${val}`;
        break;
      }
      case 'json_step_ids_include': {
        const json = JSON.parse(fs.readFileSync(target, 'utf8'));
        const ids = (json.steps || []).map((s) => s.step_id);
        ok = test.expected_step_ids.every((id) => ids.includes(id));
        detail = ok ? 'step ids present' : `missing ${test.expected_step_ids.filter((id) => !ids.includes(id)).join(',')}`;
        break;
      }
      case 'acceptance_tests_cover_blueprint': {
        const acceptance = JSON.parse(fs.readFileSync(target, 'utf8'));
        const blueprintPath = path.join(missionDir, 'BLUEPRINT.json');
        const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
        const covered = new Set(acceptance.map((t) => t.step_id));
        const missing = blueprint.steps
          .filter((s) => s.exact_output_contract?.type !== 'derived_acceptance_tests')
          .map((s) => s.step_id)
          .filter((id) => !covered.has(id));
        ok = missing.length === 0;
        detail = ok ? 'all blueprint steps covered' : `missing coverage for ${missing.join(',')}`;
        break;
      }
      case 'shell_command': {
        const result = spawnSync(test.command, {
          shell: true,
          cwd: ROOT,
          encoding: 'utf8',
        });
        ok = result.status === 0;
        detail = ok ? 'exit 0' : `exit ${result.status}: ${(result.stderr || result.stdout || '').slice(0, 200)}`;
        break;
      }
      case 'node_syntax_check': {
        ok = fs.existsSync(target);
        if (ok) {
          const result = spawnSync(process.execPath, ['--check', target], { cwd: ROOT, encoding: 'utf8' });
          ok = result.status === 0;
          detail = ok ? 'syntax ok' : result.stderr?.slice(0, 200) || 'syntax fail';
        } else {
          detail = 'missing';
        }
        break;
      }
      default:
        detail = `unknown test type ${test.type}`;
        ok = false;
    }
  } catch (err) {
    ok = false;
    detail = err.message;
  }

  if (ok) {
    passed++;
    console.log(`PASS ${test.test_id} ${test.type} ${test.target || test.command || ''}`);
  } else {
    failed++;
    console.log(`FAIL ${test.test_id} ${test.type} ${test.target || test.command || ''} — ${detail}`);
  }
}

console.log(`\n${missionId}: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
