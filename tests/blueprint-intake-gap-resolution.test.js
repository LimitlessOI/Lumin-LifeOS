/**
 * SYNOPSIS: js — tests/blueprint-intake-gap-resolution.test.js.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlueprintIntakeService } from '../services/blueprint-intake.js';
import { runPostIntakeDeployAndAcceptance } from '../services/intake-blueprint-executor.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPoolWithSession(session) {
  const state = { session: clone(session), updates: [] };
  return {
    state,
    async query(sql, params = []) {
      if (/SELECT \*/.test(sql)) {
        return { rows: state.session ? [clone(state.session)] : [] };
      }
      if (/UPDATE blueprint_intake_sessions SET/.test(sql)) {
        const setClause = sql.match(/SET (.*), updated_at = NOW\(\) WHERE id = \$1/s)?.[1] || '';
        const keys = setClause.split(',').map((part) => part.trim().split(' = ')[0]).filter(Boolean);
        for (let i = 0; i < keys.length; i += 1) {
          let value = params[i + 1];
          if (typeof value === 'string' && keys[i].endsWith('_json')) {
            try { value = JSON.parse(value); } catch {}
          }
          state.session[keys[i]] = value;
        }
        state.updates.push(clone(state.session));
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

function gapSession(overrides = {}) {
  return {
    id: 'session-1',
    product_name: 'WidgetOS',
    status: 'gap_collection',
    conversation_json: [],
    gap_answers_json: {},
    extracted_intent_json: { product_name: 'WidgetOS' },
    blueprint_json: {
      _meta: {
        product: 'WidgetOS',
        parent_ssot: 'docs/projects/AMENDMENT_04_AUTO_BUILDER.md',
        acceptance_cmd: 'node scripts/verify-widgetos.mjs',
      },
      steps: [],
    },
    gaps_json: [
      { id: 'gap_1', description: 'What should the intake collect?', resolved: false, answer: null },
      { id: 'gap_2', description: 'What should the report include?', resolved: false, answer: null },
    ],
    ...overrides,
  };
}

test('gap chat resolves only the current gap on a generic confirmation', async () => {
  const pool = createPoolWithSession(gapSession());
  const intake = createBlueprintIntakeService(pool, async () => 'Got it — I will use that for this gap.');

  const result = await intake.sendGapMessage({
    sessionId: 'session-1',
    userMessage: 'Collect client name and budget.',
  });

  assert.equal(result.allResolved, false);
  assert.equal(result.openGapCount, 1);
  assert.equal(pool.state.session.gaps_json[0].resolved, true);
  assert.equal(pool.state.session.gaps_json[1].resolved, false);
  assert.deepEqual(Object.keys(pool.state.session.gap_answers_json), ['gap_1']);
});

test('direct gap answer rejects stale non-gap-collection sessions', async () => {
  const pool = createPoolWithSession(gapSession({ status: 'ready' }));
  const intake = createBlueprintIntakeService(pool, async () => '{}');

  await assert.rejects(
    () => intake.answerGap({ sessionId: 'session-1', gapId: 'gap_1', answer: 'Updated answer' }),
    /SessionNotInGapCollection: status=ready/,
  );
  assert.equal(pool.state.updates.length, 0);
});

test('normal build words in gap answers do not replace regenerated blueprint with scaffold', async () => {
  const pool = createPoolWithSession(gapSession({
    gaps_json: [
      { id: 'gap_1', description: 'Which implementation pieces are needed?', resolved: false, answer: null },
    ],
  }));
  const regeneratedBlueprint = {
    _meta: { product: 'WidgetOS', acceptance_cmd: 'node scripts/verify-widgetos.mjs' },
    steps: [
      {
        id: 'WID-P1-001',
        file: 'services/widgetos-service.js',
        type: 'esm',
        purpose: 'Core WidgetOS service',
        deps: [],
        ssot_tag: 'docs/projects/AMENDMENT_04_AUTO_BUILDER.md',
      },
      {
        id: 'WID-P1-002',
        file: 'scripts/verify-widgetos.mjs',
        type: 'esm_script',
        purpose: 'Verify WidgetOS',
        deps: ['WID-P1-001'],
        ssot_tag: 'docs/projects/AMENDMENT_04_AUTO_BUILDER.md',
      },
    ],
  };
  const intake = createBlueprintIntakeService(pool, async () => JSON.stringify(regeneratedBlueprint));

  const result = await intake.answerGap({
    sessionId: 'session-1',
    gapId: 'gap_1',
    answer: 'Please add the migration and routes.js pieces.',
  });
  assert.equal(result.allResolved, true);

  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const files = pool.state.session.blueprint_json.steps.map((step) => step.file);
  assert.deepEqual(files, ['services/widgetos-service.js', 'scripts/verify-widgetos.mjs']);
});

test('post-intake redeploy is disabled by default inside execute flow', () => {
  const previous = process.env.INTAKE_AUTO_REDEPLOY;
  delete process.env.INTAKE_AUTO_REDEPLOY;
  try {
    const result = runPostIntakeDeployAndAcceptance({
      baseUrl: 'https://example.test',
      commandKey: 'test-key',
      acceptanceCmd: 'node scripts/verify-widgetos.mjs',
      hadCommits: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'INTAKE_AUTO_REDEPLOY disabled');
  } finally {
    if (previous === undefined) delete process.env.INTAKE_AUTO_REDEPLOY;
    else process.env.INTAKE_AUTO_REDEPLOY = previous;
  }
});
