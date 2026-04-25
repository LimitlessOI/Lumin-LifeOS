/**
 * services/lcl-monitor.js
 *
 * LCL Drift Monitor — guards the LifeOS Compression Language layer against
 * quality degradation and model confusion.
 *
 * What it watches for:
 *   1. SYMBOL LEAKAGE — LCL symbols appear in the response (e.g. model outputs
 *      "*pq" instead of "pool.query"). This means the model failed to decode the
 *      symbol from the inline key. Immediate drift event.
 *
 *   2. EMPTY RESPONSE RATE — compressed prompts that cause the model to return
 *      nothing. Could mean the key confused the model about what to generate.
 *
 *   3. DRIFT RATE THRESHOLD — if leakage rate for a (member, taskType) pair
 *      exceeds 5% over the last 20 calls, LCL is automatically disabled for that
 *      pair. It auto-re-enables after 50 more calls to test if it was transient.
 *
 * How rollback works:
 *   shouldSkipLCL(member, taskType) → true  → Layer 1.5 skips compression for this call
 *   inspect(response, ...) is called AFTER every response to update drift state
 *
 * The monitor is non-blocking — all DB writes are fire-and-forget. A monitor
 * failure never affects the response path.
 *
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

// ── Config ────────────────────────────────────────────────────────────────────

const DRIFT_THRESHOLD       = 0.05;  // 5% leakage rate → disable for this pair
const MIN_CALLS_BEFORE_GATE = 10;    // need at least 10 calls before auto-disable fires
const RE_ENABLE_AFTER_CALLS = 50;    // calls after disabling before auto-re-enable test

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 *   - pool   {pg.Pool}  — Neon DB pool (nullable; monitor degrades gracefully)
 *   - logger {object}   — pino-compatible logger
 */
export function createLCLMonitor({ pool = null, logger } = {}) {
  const log = logger || console;

  // Per-(member:taskType) drift state — in-memory, survives within a Railway instance.
  // Structure: Map<pair, { calls, driftEvents, emptyResponses, disabled, disabledAt }>
  const tracker = new Map();

  function _getState(member, taskType) {
    const key = `${member}:${taskType}`;
    if (!tracker.has(key)) {
      tracker.set(key, {
        key,
        calls: 0,
        driftEvents: 0,
        emptyResponses: 0,
        disabled: false,
        disabledAt: 0,
        lastDriftAt: null,
        lastLeaked: [],
      });
    }
    return tracker.get(key);
  }

  // ── Public: should we skip LCL for this call? ─────────────────────────────

  /**
   * Returns true if LCL compression should be skipped for this (member, taskType)
   * pair because drift was detected above the threshold.
   *
   * Called before Layer 1.5 fires in council-service.js.
   */
  function shouldSkipLCL(member, taskType) {
    const state = _getState(member, taskType);
    if (!state.disabled) return false;

    // Auto re-enable: give it another chance after RE_ENABLE_AFTER_CALLS
    if (state.calls - state.disabledAt >= RE_ENABLE_AFTER_CALLS) {
      state.disabled = false;
      log.info({ pair: state.key }, '[LCL-MONITOR] Auto re-enabling LCL — drift window passed, testing again');
      return false;
    }

    return true; // still disabled
  }

  // ── Public: inspect a response for drift signals ──────────────────────────

  /**
   * Inspect a model response for drift signals. Call this after every response
   * where LCL compression was active.
   *
   * @param {string} response        — the raw text returned by the model
   * @param {object} opts
   *   - member       {string}   — council member key (e.g. 'groq_llama')
   *   - taskType     {string}   — task type (e.g. 'codegen')
   *   - symbolsFired {string[]} — the actual symbol strings that were used (e.g. ['*pq', '*uid'])
   *   - lclWasActive {boolean}  — whether LCL compression ran on this call
   * @returns {{ driftDetected: boolean, leaked: string[], driftRate: string, action: string }}
   */
  function inspect(response, { member, taskType, symbolsFired = [], lclWasActive = false }) {
    if (!lclWasActive) return { driftDetected: false };

    const state = _getState(member, taskType);
    state.calls++;

    // ── Check 1: symbol leakage ────────────────────────────────────────────
    // If the compressed symbol (e.g. *pq) appears in the response, the model
    // failed to decode it from the inline key. That's drift.
    const leaked = symbolsFired.filter(sym => response.includes(sym));
    const leakageDetected = leaked.length > 0;

    // ── Check 2: empty response ────────────────────────────────────────────
    const isEmpty = !response || response.trim().length < 10;
    if (isEmpty) {
      state.emptyResponses++;
    }

    const driftDetected = leakageDetected || isEmpty;

    if (driftDetected) {
      state.driftEvents++;
      state.lastDriftAt = new Date().toISOString();
      state.lastLeaked = leaked;

      const driftRate = state.driftEvents / state.calls;

      log.warn({
        pair: state.key,
        leaked,
        isEmpty,
        driftRate: `${(driftRate * 100).toFixed(1)}%`,
        calls: state.calls,
      }, '[LCL-MONITOR] ⚠️  Drift signal detected');

      // ── Auto-disable if threshold exceeded ────────────────────────────────
      if (state.calls >= MIN_CALLS_BEFORE_GATE && driftRate > DRIFT_THRESHOLD) {
        if (!state.disabled) {
          state.disabled = true;
          state.disabledAt = state.calls;
          log.error({
            pair: state.key,
            driftRate: `${(driftRate * 100).toFixed(1)}%`,
            threshold: `${DRIFT_THRESHOLD * 100}%`,
          }, '[LCL-MONITOR] 🚨 LCL DISABLED — drift rate exceeded threshold. Will auto-re-enable after 50 calls.');
        }
      }

      // Persist to DB — fire and forget, never blocks response path
      _persistDriftEvent({
        member, taskType, leaked, isEmpty,
        driftRate: state.driftEvents / state.calls,
        totalCalls: state.calls,
        disabled: state.disabled,
      }).catch(() => {});

      return {
        driftDetected: true,
        leaked,
        isEmpty,
        driftRate: `${(state.driftEvents / state.calls * 100).toFixed(1)}%`,
        action: state.disabled ? 'LCL_DISABLED' : 'WARNING',
      };
    }

    return { driftDetected: false, driftRate: `${(state.driftEvents / state.calls * 100).toFixed(1)}%` };
  }

  // ── Public: stats for dashboard ───────────────────────────────────────────

  /**
   * Returns current drift state for all tracked (member, taskType) pairs.
   * Used by the /lcl-stats route.
   */
  function getStats() {
    const pairs = [];
    for (const state of tracker.values()) {
      pairs.push({
        pair: state.key,
        calls: state.calls,
        driftEvents: state.driftEvents,
        emptyResponses: state.emptyResponses,
        driftRate: state.calls > 0
          ? `${(state.driftEvents / state.calls * 100).toFixed(1)}%`
          : '0%',
        disabled: state.disabled,
        lastDriftAt: state.lastDriftAt,
        lastLeaked: state.lastLeaked,
        status: state.disabled ? 'DISABLED' : state.driftEvents > 0 ? 'WARNING' : 'HEALTHY',
      });
    }

    const healthy  = pairs.filter(p => p.status === 'HEALTHY').length;
    const warnings = pairs.filter(p => p.status === 'WARNING').length;
    const disabled = pairs.filter(p => p.status === 'DISABLED').length;

    return {
      summary: {
        totalPairsTracked: pairs.length,
        healthy,
        warnings,
        disabled,
        overallStatus: disabled > 0 ? 'DEGRADED' : warnings > 0 ? 'WARNING' : 'HEALTHY',
      },
      thresholds: {
        driftThreshold: `${DRIFT_THRESHOLD * 100}%`,
        minCallsBeforeGate: MIN_CALLS_BEFORE_GATE,
        reEnableAfterCalls: RE_ENABLE_AFTER_CALLS,
      },
      pairs: pairs.sort((a, b) => b.driftEvents - a.driftEvents),
    };
  }

  // ── Private: persist drift event to DB ───────────────────────────────────

  async function _persistDriftEvent({ member, taskType, leaked, isEmpty, driftRate, totalCalls, disabled }) {
    if (!pool) return;
    try {
      await pool.query(`
        INSERT INTO lcl_quality_log
          (member, task_type, drift_detected, leaked_symbols, is_empty_response,
           drift_rate, total_calls_at_event, lcl_disabled, created_at)
        VALUES ($1, $2, true, $3, $4, $5, $6, $7, NOW())
      `, [
        member,
        taskType,
        JSON.stringify(leaked),
        isEmpty,
        driftRate,
        totalCalls,
        disabled,
      ]);
    } catch {
      // Non-fatal — monitor never breaks the response path
    }
  }

  return { shouldSkipLCL, inspect, getStats };
}
