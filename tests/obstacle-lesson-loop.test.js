/**
 * SYNOPSIS: Obstacle lesson loop tests.
 * Obstacle lesson loop tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordObstacle, loadObstacleLedger } from '../factory-staging/factory-core/arc/foundation/obstacle-lesson-loop.js';
import { loadPointBTarget } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

describe('obstacle-lesson-loop', () => {
  it('records obstacle with lesson and route strategy', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-'));
    fs.mkdirSync(path.join(dir, 'receipts'), { recursive: true });
    const obs = recordObstacle(dir, {
      phase: 'development',
      violations: ['development:INTENT_BASELINE not HANDOFF_READY'],
      attempt: 1,
    });
    assert.ok(obs.obstacle_id);
    assert.match(obs.lesson, /Point B|LifeRE/i);
    assert.ok(obs.route_strategy);
    assert.ok(obs.fix_steps.length >= 2);
    assert.equal(obs.stopping_is_failure, true);

    const ledger = loadObstacleLedger(dir);
    assert.equal(ledger.obstacles.length, 1);
  });

  it('Point B target is LifeRE Alpha', () => {
    const target = loadPointBTarget();
    assert.ok(target);
    assert.equal(target.mission_id, 'PRODUCT-LIFERE-OS-V1-0001');
    assert.match(target.label, /LifeRE/i);
  });
});
