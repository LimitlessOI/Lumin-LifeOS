/**
 * SYNOPSIS: Continuous Verification Heartbeat unit tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { promises as fs, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  runContinuousVerification,
  pauseAutonomy,
  createContinuousVerificationScheduler,
} from '../services/continuous-verification.mjs';

const TEST_DIR = join(process.cwd(), '.tmp-cv-test');
const STOP_PATH = join(TEST_DIR, 'builderos-reboot/FOUNDER_STOP.json');

function resetTestDir() {
  if (existsSync(TEST_DIR)) {
    fs.rm(TEST_DIR, { recursive: true, force: true });
  }
}

describe('continuous-verification', () => {
  beforeEach(async () => {
    resetTestDir();
    await fs.mkdir(join(TEST_DIR, 'products/receipts'), { recursive: true });
  });

  afterEach(async () => {
    resetTestDir();
  });

  it('returns ok when all checks pass', async () => {
    const result = await runContinuousVerification({
      repoRoot: process.cwd(),
      checks: [{ name: 'pass', command: ['node', '--eval', "console.log('ok')"], timeout: 10_000 }],
    });
    assert.equal(result.ok, true);
    assert.equal(result.paused, false);
    assert.equal(result.checks[0].ok, true);
  });

  it('returns not ok and pauses when a check fails', async () => {
    let pauseCalled = false;
    const result = await runContinuousVerification({
      repoRoot: process.cwd(),
      checks: [{ name: 'fail', command: ['node', '--eval', 'process.exit(1)'], timeout: 10_000 }],
      pauseFn: async ({ reason }) => {
        pauseCalled = true;
        return { paused: true, reason };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.paused, true);
    assert.equal(pauseCalled, true);
  });

  it('pauseAutonomy writes FOUNDER_STOP.json and a receipt', async () => {
    const result = await pauseAutonomy({
      reason: 'test pause',
      repoRoot: TEST_DIR,
      receiptDir: 'products/receipts',
    });
    assert.equal(result.paused, true);
    assert.ok(existsSync(STOP_PATH));
    const stop = JSON.parse(await fs.readFile(STOP_PATH, 'utf8'));
    assert.equal(stop.stop, true);
    assert.equal(stop.paused_by, 'continuous-verification');
  });

  it('scheduler skips when FOUNDER_STOP.json is active', async () => {
    await fs.mkdir(join(TEST_DIR, 'builderos-reboot'), { recursive: true });
    await fs.writeFile(STOP_PATH, JSON.stringify({ stop: true }));

    const guard = createContinuousVerificationScheduler({
      repoRoot: TEST_DIR,
      createUsefulWorkGuard: ({ prerequisites }) => async () => {
        const pre = await prerequisites();
        if (!pre.ok) return { skipped: true, reason: pre.reason };
        return { skipped: false };
      },
    });

    const result = await guard();
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'founder_stop_active');
  });
});
