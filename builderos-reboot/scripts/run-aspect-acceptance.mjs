#!/usr/bin/env node
/**
 * SYNOPSIS: Run ACCEPTANCE_TESTS.json for a mission aspect folder.
 * Run ACCEPTANCE_TESTS.json for a mission aspect folder.
 * Usage: node builderos-reboot/scripts/run-aspect-acceptance.mjs <path-to-ACCEPTANCE_TESTS.json>
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testsPath = process.argv[2];
if (!testsPath) {
  console.error('Usage: run-aspect-acceptance.mjs <ACCEPTANCE_TESTS.json>');
  process.exit(1);
}

const absTests = path.isAbsolute(testsPath) ? testsPath : path.join(ROOT, testsPath);
const tests = JSON.parse(fs.readFileSync(absTests, 'utf8'));

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function getField(obj, fieldPath) {
  return fieldPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

let passed = 0;
let failed = 0;
const results = [];

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
      case 'file_sha256_matches':
        ok = fs.existsSync(target) && sha256File(target) === test.expected_sha256;
        detail = ok ? 'sha256 match' : 'sha256 mismatch';
        break;
      case 'json_field_equals': {
        const json = JSON.parse(fs.readFileSync(target, 'utf8'));
        const val = getField(json, test.field_path);
        ok = val === test.expected;
        detail = ok ? `${test.field_path}=${test.expected}` : `${test.field_path}=${val}`;
        break;
      }
      case 'shell_command': {
        const result = spawnSync(test.command, { shell: true, cwd: ROOT, encoding: 'utf8' });
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
    }
  } catch (err) {
    ok = false;
    detail = err.message;
  }

  results.push({ test_id: test.test_id, type: test.type, pass: ok, detail });
  if (ok) {
    passed++;
    console.log(`PASS ${test.test_id} ${test.type}`);
  } else {
    failed++;
    console.log(`FAIL ${test.test_id} ${test.type} — ${detail}`);
  }
}

const summary = { passed, failed, total: tests.length, results };
console.log(JSON.stringify(summary));
process.exit(failed ? 1 : 0);
