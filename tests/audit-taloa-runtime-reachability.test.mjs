/**
 * SYNOPSIS: Independent audit artifact (2026-08-03). Adversarial tests for the Taloa
 * Constitutional Learning Architecture. These tests encode load-bearing claims as
 * assertions of the DESIRED state and record whether reality meets them. Failures are
 * the finding — do NOT "fix" the system to make them pass; that would be fabricating
 * the very integration the audit is measuring. Audit-only; not product code.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The load-bearing engines of the intended constitutional learning architecture.
const CORE_ENGINES = [
  'reality-alignment',
  'confidence-vectors',
  'human-constellation',
  'institutional-constellation',
  'causality-engine',
  'readiness-engine',
  'calibration-ledger',
  'office-trust-ledger',
  'chair-solomon-calibration',
  'solomon-wisdom-lab',
  'solomon-withheld-recommendation',
];

// Directories that constitute a real runtime request/boot/scheduler path.
const RUNTIME_DIRS = ['routes', 'startup', 'config', 'core', 'middleware'];

function runtimeImportersOf(engine) {
  // grep runtime dirs + server.js for the service filename; exclude the service itself.
  const importers = [];
  for (const dir of RUNTIME_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    try {
      const out = execSync(
        `grep -rl "services/${engine}.js" "${abs}" 2>/dev/null || true`,
        { encoding: 'utf8' }
      );
      out.split('\n').filter(Boolean).forEach((f) => importers.push(path.relative(ROOT, f)));
    } catch { /* no match */ }
  }
  try {
    const svr = execSync(`grep -l "services/${engine}.js" "${path.join(ROOT, 'server.js')}" 2>/dev/null || true`, { encoding: 'utf8' }).trim();
    if (svr) importers.push('server.js');
  } catch { /* ignore */ }
  return importers;
}

describe('AUDIT: Taloa engines are wired into a real runtime path', () => {
  for (const engine of CORE_ENGINES) {
    it(`${engine} is imported by at least one runtime file (route/startup/config/core/middleware/server)`, () => {
      const importers = runtimeImportersOf(engine);
      assert.ok(
        importers.length > 0,
        `EXPECTED services/${engine}.js to be imported by a runtime path, but found NONE. ` +
        `It is reachable only from tests/scripts — i.e. installed on paper, not in runtime.`
      );
    });
  }
});

describe('AUDIT: calibration ledger is durable institutional memory, not in-process scratch', () => {
  it('calibration-ledger.js persists via a database pool or a written file (survives restart)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'services/calibration-ledger.js'), 'utf8');
    const persists = /pool\.|INSERT\s+INTO|writeFileSync|fs\.write|appendFile/.test(src);
    const inMemoryOnly = /new Map\(\)/.test(src) && !persists;
    assert.ok(
      persists,
      inMemoryOnly
        ? 'calibration-ledger uses only in-memory Map()s: every prediction/outcome is lost on process restart. A ledger that does not survive restart is not institutional memory.'
        : 'calibration-ledger shows no persistence mechanism.'
    );
  });
});

describe('AUDIT (control): Solomon withheld-recommendation library logic exists', () => {
  it('withholds Solomon recommendation until a Chair preliminary decision is recorded', async () => {
    const mod = await import('../services/solomon-withheld-recommendation.js');
    const pkg0 = mod.createWithheldPackage({ evidence: ['x'] });
    const pkg1 = mod.addSolomonRecommendation(pkg0, { action: 'do-thing' });
    // Before Chair preliminary decision -> must NOT reveal (returns a withheld marker).
    const early = mod.revealRecommendation(pkg1, null);
    assert.equal(early.revealed, false, 'library must hide Solomon recommendation before Chair preliminary');
    // After Chair preliminary decision -> reveals the actual recommendation object.
    const late = mod.revealRecommendation(pkg1, { proposedDecision: 'chair-call' });
    assert.deepEqual(late, { action: 'do-thing' }, 'library must reveal the recommendation after Chair preliminary recorded');
  });
});
