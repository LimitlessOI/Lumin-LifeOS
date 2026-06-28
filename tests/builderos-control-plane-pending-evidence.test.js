/**
 * SYNOPSIS: Control-plane DONE gate accepts pending completion evidence during recordBuildComplete.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderOSControlPlaneService } from '../services/builderos-control-plane-service.js';

function createMockPool() {
  return {
    async query(sql, params = []) {
      const text = String(sql);

      if (text.includes("to_regclass('public.build_task_ledger')")) {
        return {
          rows: [{
            btl: true,
            tul: true,
            aue: true,
            uta: true,
            oil: true,
            lessons: true,
            routing: true,
          }],
        };
      }

      if (text.includes('FROM token_usage_log WHERE logged_at >=')) {
        return { rows: [{ n: 0, spend: 0 }] };
      }

      if (text.includes('FROM ai_unmetered_exceptions WHERE created_at >=')) {
        return { rows: [{ n: 0 }] };
      }

      if (text.includes('GROUP BY 1 ORDER BY total_tokens')) {
        return { rows: [] };
      }

      if (text.includes('FROM build_task_ledger WHERE start_time >=')) {
        return { rows: [{ builds_today: 0, longest_build_ms: null, without_proof: 0 }] };
      }

      if (text.includes('FROM build_task_ledger WHERE task_id = $1')) {
        return {
          rows: [{
            task_id: params[0],
            status: 'running',
            end_time: null,
            token_receipt_id: null,
            unmetered_exception_id: null,
            oil_receipt_id: null,
          }],
        };
      }

      throw new Error(`Unexpected SQL in test mock: ${text.slice(0, 120)}`);
    },
  };
}

test('canMarkBuildDone accepts pending end_time/token/oil evidence before row update', async () => {
  const service = createBuilderOSControlPlaneService({
    pool: createMockPool(),
    tokenAccounting: null,
    logger: { warn() {} },
  });

  const result = await service.canMarkBuildDone({
    task_id: 'task-pending-evidence',
    pending: {
      end_time: '2026-06-27T12:00:00.000Z',
      token_receipt_id: 'tok_123',
      oil_receipt_id: 'oil_456',
    },
  });

  assert.equal(result.allowed, true);
  assert.equal(result.proof_status, 'complete');
  assert.equal(result.build.end_time, '2026-06-27T12:00:00.000Z');
});
