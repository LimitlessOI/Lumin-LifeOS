/**
 * Foundation never-stop loop — phase repair unit tests.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  repairFounderPacket,
  ensureMissionOnBpPriority,
  repairForStage,
} from '../factory-staging/factory-core/arc/foundation/phase-repair.js';

describe('phase-repair', () => {
  it('scaffolds thin founder packet sections', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liferepair-'));
    const founderPath = path.join(dir, 'FOUNDER_PACKET.md');
    fs.writeFileSync(founderPath, '# Mission\n\nShort.\n');

    const result = repairFounderPacket(dir);
    assert.equal(result.ok, true);
    const text = fs.readFileSync(founderPath, 'utf8');
    assert.match(text, /## Problem/i);
    assert.match(text, /FOUNDER SUCCESS TEST/i);
    assert.match(text, /npm run/i);
  });

  it('repairs development violations with retry', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liferepair-'));
    fs.writeFileSync(
      path.join(dir, 'FOUNDER_PACKET.md'),
      `# Mission\n\n## Problem\n${'x'.repeat(200)}\n## Desired Outcome\nAlpha\n## FOUNDER SUCCESS TEST\nRun acceptance\n## Acceptance\nnpm run test:acceptance\n`,
    );
    const failure = {
      ok: false,
      violations: ['development:INTENT_BASELINE not HANDOFF_READY (missing)'],
    };
    const repair = repairForStage(dir, 'development', failure);
    assert.equal(repair.canRetry, true);
    assert.ok(repair.repairs.length > 0);
    assert.ok(fs.existsSync(path.join(dir, 'INTENT_BASELINE.json')));
  });

  it('always allows retry — stoppage only on cooking budget', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liferepair-'));
    fs.mkdirSync(dir, { recursive: true });
    const repair = repairForStage(dir, 'builder_entry', { ok: false, violations: ['post_arc:missing foo'] });
    assert.equal(repair.canRetry, true);
  });
});
