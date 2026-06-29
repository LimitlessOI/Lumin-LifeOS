/**
 * SYNOPSIS: TSOS Platform Kernel — Phase 0 execution syscall layer.
 * TSOS Platform Kernel — Phase 0 execution syscall layer.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import crypto from 'crypto';

const VALID_KINDS = new Set(['ai', 'build', 'review', 'operator', 'unknown']);

function envBool(name, fallback = false) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return v === '1' || v === 'true';
}

function newTaskId(prefix = 'kernel') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function createTSOSPlatformKernel({
  pool,
  tokenAccounting,
  builderControlPlane,
  savingsLedger,
  memorySvc,
  oilReceipts,
  logger = console,
} = {}) {
  const log = logger;
  const defaultStrict = envBool('TOKEN_ACCOUNTING_STRICT', false);

  async function verifyTokenReceipt({ task_id, sinceMs = Date.now() - 120_000 }) {
    if (!pool) {
      return { verified: false, reason: 'no_database_pool' };
    }
    if (task_id) {
      const tok = await pool
        .query(
          `SELECT id FROM token_usage_log
           WHERE request_id = $1 OR session_id = $1
           ORDER BY logged_at DESC LIMIT 1`,
          [task_id]
        )
        .catch(() => ({ rows: [] }));
      if (tok.rows[0]?.id) {
        return { verified: true, type: 'token', id: tok.rows[0].id };
      }
      const exc = await pool
        .query(`SELECT id FROM ai_unmetered_exceptions WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`, [
          task_id,
        ])
        .catch(() => ({ rows: [] }));
      if (exc.rows[0]?.id) {
        return { verified: true, type: 'unmetered_exception', id: exc.rows[0].id };
      }
    }
    const since = new Date(sinceMs).toISOString();
    const recent = await pool
      .query(
        `SELECT id FROM token_usage_log WHERE logged_at >= $1::timestamptz ORDER BY logged_at DESC LIMIT 1`,
        [since]
      )
      .catch(() => ({ rows: [] }));
    if (recent.rows[0]?.id) {
      return { verified: true, type: 'token_recent', id: recent.rows[0].id, note: 'matched by time window' };
    }
    const recentExc = await pool
      .query(
        `SELECT id FROM ai_unmetered_exceptions WHERE created_at >= $1::timestamptz ORDER BY created_at DESC LIMIT 1`,
        [since]
      )
      .catch(() => ({ rows: [] }));
    if (recentExc.rows[0]?.id) {
      return {
        verified: true,
        type: 'unmetered_recent',
        id: recentExc.rows[0].id,
        note: 'matched by time window',
      };
    }
    return { verified: false, reason: 'no_token_receipt_or_exception' };
  }

  async function verifyOilReceipt({ task_id }) {
    if (!pool || !task_id) return { verified: false, reason: 'no_pool_or_task_id' };
    const oil = await pool
      .query(
        `SELECT id::text AS id FROM security_receipts
         WHERE payload->>'task_id' = $1 OR payload->>'build_task_id' = $1
            OR payload->'details'->>'task_id' = $1 OR payload->'details'->>'build_task_id' = $1
         ORDER BY created_at DESC LIMIT 1`,
        [task_id]
      )
      .catch(() => ({ rows: [] }));
    if (oil.rows[0]?.id) {
      return { verified: true, id: oil.rows[0].id };
    }
    return { verified: false, reason: 'no_oil_receipt' };
  }

  /** CCL Phase 0 — no-op placeholder */
  function cclPlaceholder() {
    return { ccl_used: false, status: 'phase0_noop' };
  }

  /** Decision Ledger Phase 0 — stub only */
  function decisionLedgerStub(spec) {
    return {
      status: 'stub',
      controlling_ssot: spec.metadata?.controlling_ssot || null,
      note: 'Decision Ledger not implemented — authority chain incomplete',
    };
  }

  async function kernelExecute(spec = {}) {
    const kind = VALID_KINDS.has(spec.kind) ? spec.kind : 'unknown';
    const task_id = spec.task_id || newTaskId(kind);
    const strict = spec.strict ?? defaultStrict;
    const startedAt = Date.now();
    const kernelTiming = () => ({
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    });
    const receipts = {
      task_id,
      kind,
      ccl: cclPlaceholder(),
      authority: decisionLedgerStub(spec),
      token: null,
      oil: null,
      build: null,
    };

    if (typeof spec.fn !== 'function') {
      throw new Error('KERNEL: fn is required');
    }

    if (kind === 'ai' || kind === 'review') {
      if (tokenAccounting?.checkBudgetGate) {
        const budget = await tokenAccounting.checkBudgetGate();
        receipts.budget = budget;
        if (!budget.allowed && strict) {
          const err = new Error(`KERNEL_AI_BLOCKED: ${budget.reason || 'budget_gate'}`);
          err.code = 'KERNEL_AI_BLOCKED';
          err.receipts = receipts;
          throw err;
        }
      }

      const result = await spec.fn();
      const tokenProof = await verifyTokenReceipt({ task_id, sinceMs: startedAt - 5000 });

      if (!tokenProof.verified) {
        if (tokenAccounting?.recordUnmeteredException) {
          const excId = await tokenAccounting.recordUnmeteredException({
            source: spec.source || kind,
            task_id,
            task_type: spec.product_lane,
            reason: 'kernel_post_verify_no_receipt',
            payload: { kind, metadata: spec.metadata },
          });
          receipts.token = { verified: true, type: 'kernel_unmetered_exception', id: excId };
        } else if (strict) {
          const err = new Error(`KERNEL_AI_RECEIPT_MISSING: ${tokenProof.reason}`);
          err.code = 'KERNEL_AI_RECEIPT_MISSING';
          err.receipts = receipts;
          throw err;
        } else {
          receipts.token = { verified: false, ...tokenProof, warning: 'kernel_fallback_unverified' };
          log.warn?.({ task_id, kind }, '[KERNEL] AI call completed without token receipt');
        }
      } else {
        receipts.token = tokenProof;
      }

      if (memorySvc && spec.metadata?.record_memory) {
        try {
          await memorySvc.recordAgentPerformance?.({
            agentId: spec.metadata?.agent_id || 'kernel',
            taskType: spec.product_lane || kind,
            outcome: receipts.token?.verified ? 'partial' : 'unknown',
            notes: 'kernelExecute ai path',
          });
        } catch {
          /* advisory only */
        }
      }

      return { ok: true, result, receipts, kernel: true, ...kernelTiming() };
    }

    if (kind === 'build') {
      if (builderControlPlane?.getMeasurementHealth) {
        const health = await builderControlPlane.getMeasurementHealth();
        receipts.control_plane_health = health;
        if (health.status === 'RED' && strict) {
          const err = new Error('KERNEL_BUILD_BLOCKED: measurement_coverage_red');
          err.code = 'KERNEL_BUILD_BLOCKED';
          err.statusCode = 409;
          err.receipts = receipts;
          throw err;
        }
      }

      if (builderControlPlane?.recordBuildStart) {
        try {
          receipts.build = {
            start: await builderControlPlane.recordBuildStart({
              task_id,
              blueprint_id: spec.blueprint_id,
              product_lane: spec.product_lane,
              source: spec.source || 'builderos',
              model_used: spec.metadata?.model,
              agent_used: spec.metadata?.agent,
              metadata: spec.metadata || {},
            }),
          };
        } catch (startErr) {
          log.warn?.({ err: startErr.message, task_id }, '[KERNEL] recordBuildStart failed');
          receipts.build = { start_error: startErr.message };
        }
      }

      const result = await spec.fn();
      const committed = result?.committed === true;

      const tokenProof = await verifyTokenReceipt({ task_id, sinceMs: startedAt - 5000 });
      receipts.token = tokenProof;

      const oilProof = await verifyOilReceipt({ task_id });
      receipts.oil = oilProof;

      if (committed && builderControlPlane?.recordBuildComplete) {
        try {
          const token_receipt_id =
            tokenProof.verified && tokenProof.type === 'token' ? tokenProof.id : null;
          const unmetered_exception_id =
            tokenProof.verified && String(tokenProof.type || '').includes('unmetered') ? tokenProof.id : null;
          const complete = await builderControlPlane.recordBuildComplete({
            task_id,
            status: result?.body?.ok === false ? 'failed' : 'done',
            token_receipt_id,
            oil_receipt_id: oilProof.verified ? oilProof.id : null,
            unmetered_exception_id,
            files_changed: result?.body?.target_file ? [result.body.target_file] : null,
            metadata: { kernel: 'phase0', committed, ...(spec.metadata || {}) },
            enforce: strict,
            allow_exception: !strict,
          });
          receipts.build = { ...(receipts.build || {}), complete };
        } catch (completeErr) {
          if (String(completeErr.message || '').includes('BUILDEROS_DONE_BLOCKED') || strict) {
            const err = new Error(completeErr.message);
            err.code = 'KERNEL_BUILD_BLOCKED';
            err.statusCode = 409;
            err.receipts = receipts;
            err.kernelMeta = { task_id, committed, token: tokenProof, oil: oilProof };
            throw err;
          }
          receipts.build = { ...(receipts.build || {}), complete_error: completeErr.message };
          log.warn?.({ err: completeErr.message, task_id }, '[KERNEL] recordBuildComplete soft-fail');
        }
      }

      if (builderControlPlane?.canMarkBuildDone && committed) {
        const gate = await builderControlPlane.canMarkBuildDone({
          task_id,
          allow_exception: !strict,
        });
        receipts.done_gate = gate;
        if (!gate.allowed && strict) {
          const err = new Error(`KERNEL_BUILD_DONE_BLOCKED: ${gate.reason}`);
          err.code = 'KERNEL_BUILD_BLOCKED';
          err.statusCode = 409;
          err.receipts = receipts;
          throw err;
        }
      }

      return { ok: true, result, receipts, kernel: true, ...kernelTiming() };
    }

    if (kind === 'operator') {
      const result = await spec.fn();
      receipts.token = await verifyTokenReceipt({ task_id, sinceMs: startedAt - 5000 });
      return { ok: true, result, receipts, kernel: true, ...kernelTiming() };
    }

    const result = await spec.fn();
    return { ok: true, result, receipts, kernel: true, note: 'unknown_kind_passthrough', ...kernelTiming() };
  }

  function wrapCouncilMember(rawCallCouncilMember) {
    if (typeof rawCallCouncilMember !== 'function') {
      log.warn?.('[KERNEL] wrapCouncilMember: raw function missing — passthrough disabled');
      return rawCallCouncilMember;
    }
    return async function kernelWrappedCallCouncilMember(member, prompt, options = {}) {
      const task_id = options.requestId || options.task_id || newTaskId('council');
      const mergedOptions = {
        ...options,
        requestId: task_id,
        task_id,
      };
      const wrapped = await kernelExecute({
        kind: options.kind === 'review' ? 'review' : 'ai',
        task_id,
        blueprint_id: options.blueprint_id,
        product_lane: options.product_lane || options.taskType || options.task_type,
        source: options.source || 'council',
        strict: options.strict,
        metadata: { member, route: options.source_route || 'callCouncilMember' },
        fn: () => rawCallCouncilMember(member, prompt, mergedOptions),
      });
      return wrapped.result;
    };
  }

  function wrapBuild(rawBuildHandler) {
    if (typeof rawBuildHandler !== 'function') {
      return rawBuildHandler;
    }
    return async function kernelWrappedBuild(req, res) {
      const body = req.body || {};
      const task_id = body.task_id || newTaskId('build');
      req.body = { ...body, task_id };
      req.__kernel_managed_build = true;

      let statusCode = 200;
      let responseBody = null;
      const captureRes = {
        status(code) {
          statusCode = code;
          return captureRes;
        },
        json(data) {
          responseBody = data;
          return captureRes;
        },
        setHeader() {
          return captureRes;
        },
        get headersSent() {
          return false;
        },
      };

      try {
        const kernelResult = await kernelExecute({
          kind: 'build',
          task_id,
          blueprint_id: body.blueprint_id,
          product_lane: body.domain || body.product_lane || 'builderos',
          source: 'builder',
          strict: body.kernel_strict === true || defaultStrict,
          metadata: {
            route: '/api/v1/lifeos/builder/build',
            task: String(body.task || '').slice(0, 120),
          },
          fn: async () => {
            await rawBuildHandler(req, captureRes);
            return {
              committed: responseBody?.committed === true,
              httpStatus: statusCode,
              body: responseBody,
            };
          },
        });

        if (!responseBody) {
          return res.status(500).json({ ok: false, error: 'kernel_build_no_response', task_id });
        }

        return res.status(statusCode).json({
          ...responseBody,
          task_id,
          kernel_receipts: kernelResult.receipts,
        });
      } catch (err) {
        const code = err.statusCode || (err.code === 'KERNEL_BUILD_BLOCKED' ? 409 : 500);
        return res.status(code).json({
          ok: false,
          error: err.message,
          code: err.code || 'KERNEL_ERROR',
          task_id,
          kernel_receipts: err.receipts || null,
          ...(responseBody && typeof responseBody === 'object' ? { partial: responseBody } : {}),
        });
      } finally {
        delete req.__kernel_managed_build;
      }
    };
  }

  async function getKernelHealth() {
    const health = {
      status: 'RED',
      kernel: 'phase0',
      strict: defaultStrict,
      token_accounting: null,
      control_plane: null,
      savings_ledger: Boolean(savingsLedger),
      pool: Boolean(pool),
      blind_spots: [],
    };

    if (tokenAccounting?.getHealth) {
      health.token_accounting = await tokenAccounting.getHealth();
    } else {
      health.blind_spots.push('token_accounting_unavailable');
    }

    if (builderControlPlane?.getMeasurementHealth) {
      health.control_plane = await builderControlPlane.getMeasurementHealth();
    } else {
      health.blind_spots.push('control_plane_unavailable');
    }

    const taOk = health.token_accounting?.status === 'GREEN' || health.token_accounting?.status === 'YELLOW';
    const cpOk = health.control_plane?.status !== 'RED';
    health.status = taOk && cpOk && pool ? 'YELLOW' : health.token_accounting ? 'RED' : 'RED';
    if (pool && savingsLedger) health.status = health.status === 'RED' ? 'YELLOW' : health.status;

    return health;
  }

  return {
    kernelExecute,
    wrapCouncilMember,
    wrapBuild,
    getKernelHealth,
    verifyTokenReceipt,
  };
}
