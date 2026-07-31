/**
 * SYNOPSIS: mjs — tests/chair-lumin-unified-cognitive.test.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChairNativeTurn } from '../services/chair-lumin-unified.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REASONING_LOG = path.resolve(__dirname, '..', 'data', 'chair-reasoning-log.jsonl');

function createFakePool() {
  const queries = [];
  return {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (/CREATE TABLE IF NOT EXISTS/i.test(sql)) return { rows: [] };
      if (/INSERT INTO founder_decision_log/i.test(sql)) return { rows: [{ id: 1, decided_at: new Date().toISOString() }] };
      if (/INSERT INTO model_capability_ledger/i.test(sql)) return { rows: [] };
      if (/SELECT .* FROM model_capability_ledger/i.test(sql)) return { rows: [] };
      return { rows: [] };
    },
    _queries: queries,
  };
}

function createFakeCallAI() {
  const calls = [];
  return async (member, prompt, options = {}) => {
    calls.push({ member, options });
    const usage = { prompt_tokens: 10, completion_tokens: 5, estimated_usd: 0.001 };
    if (options.taskType === 'cognitive_chair.lens') {
      return {
        content: JSON.stringify({
          lens_id: options.lens_id,
          responsibility: options.responsibility,
          summary: `${options.lens_id} summary`,
          position: `${options.lens_id} position`,
          confidence: 0.7,
          evidence: ['evidence'],
          disagreements: [],
          recommended_action: 'act',
        }),
        usage,
        member,
      };
    }
    if (options.taskType === 'cognitive_chair.synthesis') {
      return {
        content: JSON.stringify({
          chair_position: 'build the lens',
          tradeoffs: ['cost'],
          named_disagreements: [{ lens_id: 'competition', issue: 'scope' }],
          why_this_wins: 'aligned',
          risks: ['burn'],
          next_action: 'ship',
        }),
        usage: { prompt_tokens: 20, completion_tokens: 10, estimated_usd: 0.002 },
        member: 'claude_sonnet',
      };
    }
    return { content: 'Lumin reply.', usage: { prompt_tokens: 30, completion_tokens: 15, estimated_usd: 0.003 }, member };
  };
}

async function gatherFacts() {
  return { chair_note: 'test note', personal_turn: false };
}

async function translatePersonality({ systemFacts, userMessage }) {
  return `Reply for: ${userMessage} (reasoning=${systemFacts.chair_reasoning ? 'yes' : 'no'})`;
}

test('runChairNativeTurn triggers cognitive reasoning, records decision, scores model calls, persists disagreement', async () => {
  const pool = createFakePool();
  const callAI = createFakeCallAI();
  const input = 'I think we should build a new competition-tracking lens to reason through product priorities. What do you think?';
  const result = await runChairNativeTurn(input, {
    callAI,
    gatherFacts,
    translatePersonality,
    pool,
    userId: 'adam',
  }, { domain: 'build', account_role: 'founder' });

  assert.strictEqual(result.ok, true);
  assert.ok(result.chair_native_facts.chair_reasoning, 'chair_reasoning should be attached to systemFacts');
  assert.ok(Array.isArray(result.chair_native_facts.chair_reasoning.outputs), 'reasoning should have lens outputs');
  assert.ok(result.chair_native_facts.chair_reasoning.chair, 'reasoning should have chair synthesis');

  const decisionInserts = pool._queries.filter((q) => /INSERT INTO founder_decision_log/i.test(q.sql));
  assert.ok(decisionInserts.length >= 1, 'founder decision should be recorded');
  const decisionContext = JSON.parse(decisionInserts[0].params[1] || '{}');
  assert.ok(decisionContext.named_disagreements, 'named disagreements should be persisted in decision context');

  const ledgerInserts = pool._queries.filter((q) => /INSERT INTO model_capability_ledger/i.test(q.sql));
  assert.ok(ledgerInserts.length >= 3, 'model_capability_ledger should see lens + synthesis + translation calls');

  const logLines = fs.existsSync(REASONING_LOG)
    ? fs.readFileSync(REASONING_LOG, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  assert.ok(logLines.length >= 1, 'chair reasoning log should have an entry');
  const lastEntry = JSON.parse(logLines[logLines.length - 1]);
  assert.strictEqual(lastEntry.domain, 'build');
  assert.ok(lastEntry.transcript, 'log entry should contain full transcript');
});

test('runChairNativeTurn skips reasoning for short greetings and personal turns', async () => {
  const pool = createFakePool();
  const callAI = createFakeCallAI();
  const result = await runChairNativeTurn('hi', {
    callAI,
    gatherFacts,
    translatePersonality,
    pool,
    userId: 'adam',
  }, { domain: 'chair' });

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.chair_native_facts.chair_reasoning, undefined);
  const decisionInserts = pool._queries.filter((q) => /INSERT INTO founder_decision_log/i.test(q.sql));
  assert.strictEqual(decisionInserts.length, 0);
});
