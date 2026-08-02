/**
 * SYNOPSIS: Runtime parity gate — verify registry, enforcement matrix, and canonical constitutional text are aligned.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'constitutional-framework', 'REGISTRY.json');
const MATRIX_PATH = path.join(ROOT, 'data', 'constitutional-framework', 'ENFORCEMENT_MATRIX.json');
const NORTH_STAR = path.join(ROOT, 'docs', 'constitution', 'NORTH_STAR_SSOT.md');
const FRAMEWORK = path.join(ROOT, 'docs', 'constitution', 'CONSTITUTIONAL_FRAMEWORK_v1.md');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: err.message }));
  });
}

async function main() {
  const failures = [];

  // 1. Canonical source files exist.
  for (const [label, file] of [['North Star', NORTH_STAR], ['Framework', FRAMEWORK]]) {
    if (!fs.existsSync(file)) failures.push(`${label} missing: ${file}`);
  }

  // 2. Registry exists and is internally consistent.
  const registry = readJson(REGISTRY_PATH);
  if (!registry) {
    failures.push('REGISTRY.json missing or unreadable');
  } else {
    if (!registry.schema || registry.schema !== 'constitutional_registry_v1') {
      failures.push('REGISTRY.json schema mismatch');
    }
    if (!Array.isArray(registry.items)) {
      failures.push('REGISTRY.json has no items array');
    } else {
      const required = ['id', 'title', 'level', 'purpose', 'epistemic_confidence_score', 'constitutional_commitment_score', 'evidence_score', 'evidence_level', 'enforcement_status', 'enforcement_method', 'promotion_date', 'last_review', 'source_file', 'source_anchor'];
      for (const item of registry.items) {
        for (const key of required) {
          if (item[key] === undefined || item[key] === null || item[key] === '') {
            if (key === 'promotion_date' && item.level === 'Candidate') continue;
            failures.push(`Registry item ${item.id || '(unknown)'} missing ${key}`);
          }
        }
      }
    }
  }

  // 3. Canonical enforcement matrix exists, is canonical, and covers every registry item.
  const matrix = readJson(MATRIX_PATH);
  if (!matrix) {
    failures.push('ENFORCEMENT_MATRIX.json missing or unreadable');
  } else {
    if (matrix.status !== 'CANONICAL') failures.push(`ENFORCEMENT_MATRIX.json status is ${matrix.status}, expected CANONICAL`);
    if (matrix.source_registry !== 'data/constitutional-framework/REGISTRY.json') failures.push('ENFORCEMENT_MATRIX.json source_registry mismatch');
    if (!Array.isArray(matrix.entries)) {
      failures.push('ENFORCEMENT_MATRIX.json has no entries array');
    } else if (registry && Array.isArray(registry.items)) {
      const matrixIds = new Set(matrix.entries.map((e) => e.law_id));
      for (const item of registry.items) {
        if (!matrixIds.has(item.id)) failures.push(`Registry item ${item.id} missing from ENFORCEMENT_MATRIX.json`);
      }
      if (matrix.entries.length !== registry.items.length) {
        failures.push(`ENFORCEMENT_MATRIX entry count (${matrix.entries.length}) != registry item count (${registry.items.length})`);
      }
    }
  }

  // 4. Run the constitutional-framework verifier as the canonical registry/source-file parity check.
  const verify = await runCommand('node', ['scripts/constitutional-framework.mjs', 'verify'], ROOT);
  if (verify.code !== 0) {
    failures.push('scripts/constitutional-framework.mjs verify failed');
    if (verify.stdout) console.log(verify.stdout);
    if (verify.stderr) console.error(verify.stderr);
  }

  if (failures.length) {
    console.error('CONSTITUTIONAL_PARITY: FAIL');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('CONSTITUTIONAL_PARITY: PASS');
  console.log(`  registry items: ${registry?.items?.length ?? 0}`);
  console.log(`  matrix entries: ${matrix?.entries?.length ?? 0}`);
  console.log(`  canonical sources: ${NORTH_STAR.split('/').pop()}, ${FRAMEWORK.split('/').pop()}`);
}

main().catch((err) => {
  console.error('CONSTITUTIONAL_PARITY: ERROR', err.message);
  process.exit(1);
});
