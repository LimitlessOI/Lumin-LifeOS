/**
 * SYNOPSIS: LifeOS Capture Pipeline v2 — unit tests (no production required).
 * LifeOS Capture Pipeline v2 — unit tests (no production required).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLifeOSCapturePipeline } from '../services/lifeos-capture-pipeline.js';

function mockPool() {
  const items = [];
  let idSeq = 1;
  return {
    items,
    query(sql, params) {
      const s = String(sql);
      if (s.includes('FROM lifeos_users')) {
        return { rows: [{ id: 'user-1' }] };
      }
      if (s.includes('INSERT INTO action_inbox_items')) {
        const raw = params[3];
        const classification = /\bprivate\b/i.test(raw) ? 'private_no_save' : 'conversation';
        if (classification === 'private_no_save') {
          return { rows: [] };
        }
        const row = {
          id: `item-${idSeq++}`,
          user_id: params[0],
          session_id: params[1],
          source: params[2],
          raw_text: raw,
          classification: params[4],
          status: 'staged',
          metadata: params[5],
        };
        items.push(row);
        return { rows: [row] };
      }
      if (s.includes('SELECT * FROM action_inbox_items')) {
        return { rows: items };
      }
      return { rows: [] };
    },
  };
}

describe('lifeos capture pipeline v2', () => {
  it('stages non-private voice rail messages', async () => {
    const pool = mockPool();
    const pipeline = createLifeOSCapturePipeline({ pool, logger: null });
    const result = await pipeline.stageFromVoiceSubmit({
      userId: 'user-1',
      text: 'Remind me to call the client tomorrow',
      mode: 'conversation',
      sessionId: 'sess-1',
      voiceIntent: 'commitment',
      private: false,
      simulateOnly: false,
    });
    assert.equal(result.staged, true);
    assert.ok(result.inbox_item_id);
    assert.equal(result.source, 'voice_rail');
  });

  it('skips private mode', async () => {
    const pool = mockPool();
    const pipeline = createLifeOSCapturePipeline({ pool, logger: null });
    const result = await pipeline.stageFromVoiceSubmit({
      userId: 'user-1',
      text: 'secret thought',
      private: true,
    });
    assert.equal(result.staged, false);
    assert.equal(result.reason, 'private_mode');
  });

  it('skips simulate_only', async () => {
    const pool = mockPool();
    const pipeline = createLifeOSCapturePipeline({ pool, logger: null });
    const result = await pipeline.stageFromVoiceSubmit({
      userId: 'user-1',
      text: 'test message',
      simulateOnly: true,
    });
    assert.equal(result.staged, false);
    assert.equal(result.reason, 'simulate_only');
  });
});
