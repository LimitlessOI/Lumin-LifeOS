/**
 * SYNOPSIS: BP priority scheduler safety regressions.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateBpPrioritySchedulerPrerequisites,
  runBpPriorityExpansionOnce,
} from '../services/builderos-bp-priority-scheduler.js';

const ROOT = process.cwd();
const FOUNDER_STOP_PATH = path.join(ROOT, 'builderos-reboot/FOUNDER_STOP.json');
const RECEIPT_PATH = path.join(ROOT, 'data/builderos-bp-priority-scheduler-receipt.json');

function preserveFile(filePath) {
  if (!fs.existsSync(filePath)) return { existed: false, content: null };
  return { existed: true, content: fs.readFileSync(filePath, 'utf8') };
}

function restoreFile(filePath, snapshot) {
  if (snapshot.existed) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, snapshot.content);
  } else {
    fs.rmSync(filePath, { force: true });
  }
}

test('founder stop blocks scheduler even when never-stop is enabled', async () => {
  const env = {
    BUILDEROS_AUTOPILOT: process.env.BUILDEROS_AUTOPILOT,
    BUILDEROS_NEVER_STOP: process.env.BUILDEROS_NEVER_STOP,
    COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY,
  };
  const founderStop = preserveFile(FOUNDER_STOP_PATH);

  try {
    process.env.BUILDEROS_AUTOPILOT = '1';
    process.env.BUILDEROS_NEVER_STOP = '1';
    process.env.COMMAND_CENTER_KEY = 'test-command-key-with-length';
    fs.mkdirSync(path.dirname(FOUNDER_STOP_PATH), { recursive: true });
    fs.writeFileSync(FOUNDER_STOP_PATH, `${JSON.stringify({ stop: true }, null, 2)}\n`);

    const result = await evaluateBpPrioritySchedulerPrerequisites();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'founder_stop_active');
  } finally {
    restoreFile(FOUNDER_STOP_PATH, founderStop);
    for (const [key, value] of Object.entries(env)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('expansion lane is single-flight', async () => {
  const receipt = preserveFile(RECEIPT_PATH);
  let release;
  let calls = 0;
  const hold = new Promise((resolve) => { release = resolve; });

  try {
    const first = runBpPriorityExpansionOnce({
      expansionCycle: async () => {
        calls += 1;
        await hold;
        return { ok: true, task_id: 'test_expansion', detail: 'complete' };
      },
    });

    const second = await runBpPriorityExpansionOnce({
      expansionCycle: async () => {
        calls += 1;
        return { ok: true, task_id: 'should_not_run' };
      },
    });

    assert.deepEqual(second, { ok: false, skipped: true, reason: 'already_running' });
    assert.equal(calls, 1);

    release();
    const firstResult = await first;
    assert.equal(firstResult.ok, true);

    const third = await runBpPriorityExpansionOnce({
      expansionCycle: async () => {
        calls += 1;
        return { ok: true, task_id: 'after_release', detail: 'complete' };
      },
    });
    assert.equal(third.ok, true);
    assert.equal(calls, 2);
  } finally {
    restoreFile(RECEIPT_PATH, receipt);
  }
});
