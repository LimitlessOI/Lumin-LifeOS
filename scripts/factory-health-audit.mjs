#!/usr/bin/env node
/**
 * SYNOPSIS: Health audit for a factory lane. Answers one question per check —
 * can this lane actually build, and can it verify what it built?
 *
 * Written before duplicating factory-1, on the founder's instruction to audit
 * first: cloning an unhealthy lane produces two unhealthy lanes and twice the
 * confusion about which one is wrong.
 *
 * Every check executes something. "The directory exists" is not health; writing
 * a real file through a real path, verifying its hash, and running a real test
 * is. Checks clean up after themselves so the audit leaves no residue in the
 * lane it is auditing.
 *
 * Usage: node scripts/factory-health-audit.mjs [--factory <id>]
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { knownFactoryIds, factoryStatus } from '../config/factory-registry.js';
import { workspaceRootFor, resolveWorkspacePath, checkWriteScope, PRIMARY_FACTORY_ID } from '../config/factory-workspace.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/FACTORY_HEALTH_RECEIPT.json';

function check(name, why, fn) {
  try {
    const r = fn();
    return { check: name, why, healthy: r.healthy !== false, detail: r.detail ?? null, ...(r.extra || {}) };
  } catch (err) {
    return { check: name, why, healthy: false, detail: `threw: ${err.message}` };
  }
}

export function auditFactory(factoryId) {
  const root = workspaceRootFor(factoryId);
  const checks = [];

  checks.push(
    check('workspace_exists', 'A lane with no working tree cannot build anything.', () => ({
      healthy: fs.existsSync(root),
      detail: root,
    }))
  );

  checks.push(
    check('index_is_independent', 'Two factories sharing one git index is the lock contention this repo has already hit.', () => {
      if (factoryId === PRIMARY_FACTORY_ID) return { healthy: true, detail: 'primary lane owns the repository index' };
      const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, encoding: 'utf8' }).trim();
      return { healthy: gitDir.includes('worktrees'), detail: gitDir };
    })
  );

  checks.push(
    check('has_dependencies', 'A factory that cannot run its own tests cannot verify its own work.', () => {
      const nm = path.join(root, 'node_modules');
      const present = fs.existsSync(nm);
      return {
        healthy: present,
        detail: present ? `present (${fs.lstatSync(nm).isSymbolicLink() ? 'symlink' : 'directory'})` : 'missing',
      };
    })
  );

  checks.push(
    check('can_write_and_verify', 'The core factory act: write an exact file and prove the bytes landed.', () => {
      const rel = `.factory-health/${factoryId}-${Date.now()}.txt`;
      const abs = resolveWorkspacePath(factoryId, rel);
      const content = `health probe ${crypto.randomUUID()}\n`;
      const want = crypto.createHash('sha256').update(content).digest('hex');
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
      const got = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
      fs.rmSync(path.dirname(abs), { recursive: true, force: true });
      return { healthy: got === want, detail: got === want ? 'byte-exact write verified' : 'sha mismatch after write' };
    })
  );

  checks.push(
    check('cannot_write_into_a_peer', 'Isolation is only real if the guard refuses; a rule nobody enforces is a preference.', () => {
      const peers = knownFactoryIds().filter((id) => id !== factoryId);
      if (peers.length === 0) return { healthy: true, detail: 'no peers registered' };
      const peerFile = path.join(workspaceRootFor(peers[0]), 'services', 'intruded.js');
      const verdict = checkWriteScope(factoryId, peerFile, { knownFactoryIds: knownFactoryIds() });
      return { healthy: verdict.allowed === false, detail: verdict.reason || 'PEER WRITE WAS ALLOWED' };
    })
  );

  checks.push(
    check('can_run_its_own_verification', 'Building without being able to test is half a factory.', () => {
      if (!fs.existsSync(path.join(root, 'node_modules'))) {
        return { healthy: false, detail: 'skipped — no dependencies installed in this lane' };
      }
      execFileSync(process.execPath, ['--test', 'tests/step-dependencies.test.js'], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      return { healthy: true, detail: 'ran a real test file inside the lane' };
    })
  );

  const unhealthy = checks.filter((c) => !c.healthy);
  return {
    factory_id: factoryId,
    workspace_root: root,
    status: factoryStatus(factoryId),
    checks,
    unhealthy_count: unhealthy.length,
    verdict: unhealthy.length === 0 ? 'HEALTHY' : 'DEFECTS_PRESENT',
  };
}

function main() {
  const i = process.argv.indexOf('--factory');
  const ids = i > -1 ? [process.argv[i + 1]] : knownFactoryIds();
  const results = ids.map(auditFactory);

  const receipt = {
    schema: 'factory_health_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/factory-health-audit.mjs',
    purpose: 'Audit a lane before trusting it with work. Every check executes something; existence is not health.',
    independent_reproduction_command: 'node scripts/factory-health-audit.mjs',
    factories: results,
    verdict: results.every((r) => r.verdict === 'HEALTHY') ? 'ALL_HEALTHY' : 'DEFECTS_PRESENT',
  };
  fs.mkdirSync(path.dirname(path.join(ROOT, RECEIPT_REL)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, RECEIPT_REL), `${JSON.stringify(receipt, null, 2)}\n`);

  for (const r of results) {
    console.log(`\n${r.factory_id} (${r.status}) — ${r.verdict}`);
    for (const c of r.checks) console.log(`  ${c.healthy ? 'ok  ' : 'FAIL'}  ${c.check}: ${c.detail}`);
  }
  console.log(`\n=== ${receipt.verdict} ===`);
  if (receipt.verdict !== 'ALL_HEALTHY') process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('factory-health-audit.mjs')) {
  main();
}
