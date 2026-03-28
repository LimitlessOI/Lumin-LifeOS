/**
 * services/model-performance.js
 *
 * Model Performance Ledger — tracks which AI model performs best for each
 * council lens over time, correlates council verdicts with build outcomes,
 * and exposes a winner-promotion API so routing auto-improves.
 *
 * Usage:
 *   // After a lens call in builder-council-review.js:
 *   await logVerdict(pool, { segmentId, lens, model, provider, verdict, latencyMs, costUsd });
 *
 *   // After build_outcomes is scored:
 *   await scoreOutcome(pool, outcomeId, segmentId);
 *
 *   // To get the best model for a lens (used by routing):
 *   const winner = await getBestModelForLens(pool, 'consequences');
 *
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

// ── Verdict logging ────────────────────────────────────────────────────────────

/**
 * Log one lens verdict to model_verdict_log.
 *
 * @param {object} pool
 * @param {object} entry
 * @param {string} entry.segmentId
 * @param {string} entry.lens       — 'consequences'|'time_traveler'|'trend_scout'|'great_minds'|'codebase_coherence'
 * @param {string} entry.model      — e.g. 'gemini-2.5-pro'
 * @param {string} entry.provider   — 'gemini'|'groq'|'anthropic'|'perplexity'
 * @param {string} entry.verdict    — 'PROCEED'|'CAUTION'|'STOP'|'NEEDS_HUMAN'
 * @param {number} [entry.latencyMs]
 * @param {number} [entry.costUsd]
 * @param {string} [entry.rawOutput]
 * @returns {Promise<string>} id of inserted row
 */
export async function logVerdict(pool, {
  segmentId,
  lens,
  model,
  provider,
  verdict,
  latencyMs = null,
  costUsd = null,
  rawOutput = null,
  wasConsensusPosition = null, // true=voted with majority, false=dissented, null=unknown
}) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO model_verdict_log
         (segment_id, lens, model, provider, verdict, latency_ms, cost_usd, raw_output, was_consensus_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [segmentId, lens, model, provider, verdict, latencyMs, costUsd, rawOutput, wasConsensusPosition]
    );
    return rows[0]?.id ?? null;
  } catch {
    return null; // non-fatal
  }
}

// ── Outcome scoring ────────────────────────────────────────────────────────────

/**
 * After a build outcome is recorded, correlate it back to the verdicts
 * from that segment's council run and mark verdict_was_correct.
 *
 * Correctness heuristic:
 *   - STOP/NEEDS_HUMAN verdict → correct if outcome had_regression=true OR adam_satisfaction <= 2
 *   - PROCEED/CAUTION verdict  → correct if outcome shipped_cleanly=true AND adam_satisfaction >= 3
 *
 * @param {object} pool
 * @param {string} outcomeId   — build_outcomes.id
 * @param {string} segmentId   — project_segments.id
 */
export async function scoreOutcome(pool, outcomeId, segmentId) {
  if (!pool || !outcomeId || !segmentId) return;

  try {
    // Fetch outcome
    const { rows: outcomes } = await pool.query(
      `SELECT shipped_cleanly, had_regression, adam_satisfaction, checks_passed
       FROM build_outcomes WHERE id = $1`,
      [outcomeId]
    );
    if (!outcomes.length) return;
    const out = outcomes[0];

    const wasGoodBuild = out.shipped_cleanly === true
      && (out.had_regression !== true)
      && (out.adam_satisfaction == null || out.adam_satisfaction >= 3)
      && (out.checks_passed !== false);

    // Update all verdicts for this segment
    await pool.query(
      `UPDATE model_verdict_log
       SET outcome_id = $1,
           verdict_was_correct = CASE
             WHEN verdict IN ('STOP', 'NEEDS_HUMAN') THEN $2
             WHEN verdict IN ('PROCEED', 'CAUTION')  THEN $3
             ELSE NULL
           END
       WHERE segment_id = $4 AND verdict_was_correct IS NULL`,
      [outcomeId, !wasGoodBuild, wasGoodBuild, segmentId]
    );
  } catch { /* non-fatal */ }
}

// ── Winner queries ─────────────────────────────────────────────────────────────

/**
 * Returns the best-performing model for a given lens.
 * Falls back to null if not enough data (< 3 scored verdicts).
 *
 * @param {object} pool
 * @param {string} lens
 * @returns {Promise<{model, provider, accuracy_pct, avg_cost_usd}|null>}
 */
export async function getBestModelForLens(pool, lens) {
  if (!pool) return null;
  try {
    const { rows } = await pool.query(
      `SELECT model, provider, accuracy_pct, avg_cost_usd
       FROM model_lens_winner
       WHERE lens = $1
       LIMIT 1`,
      [lens]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns full leaderboard across all lenses.
 * @param {object} pool
 * @returns {Promise<Array>}
 */
export async function getLeaderboard(pool) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT lens, model, provider, total_verdicts, correct_verdicts,
              accuracy_pct, consensus_verdicts, consensus_accuracy_pct,
              dissent_verdicts, dissent_accuracy_pct,
              avg_latency_ms, avg_cost_usd, total_cost_usd, last_used
       FROM model_performance_summary
       ORDER BY lens, accuracy_pct DESC NULLS LAST, avg_cost_usd ASC`
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Returns per-lens winners (one row per lens — current champion).
 * @param {object} pool
 * @returns {Promise<Array>}
 */
export async function getLensWinners(pool) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT lens, model, provider, accuracy_pct, total_verdicts, avg_cost_usd,
              dissent_accuracy_pct, consensus_accuracy_pct
       FROM model_lens_winner
       ORDER BY lens`
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Returns recent verdict rows for a specific lens (for debugging/audit).
 * @param {object} pool
 * @param {string} lens
 * @param {number} limit
 */
export async function getVerdictHistory(pool, lens, limit = 20) {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(
      `SELECT mvl.id, mvl.segment_id, mvl.model, mvl.provider, mvl.verdict,
              mvl.latency_ms, mvl.cost_usd, mvl.verdict_was_correct, mvl.logged_at,
              ps.name AS segment_name
       FROM model_verdict_log mvl
       LEFT JOIN project_segments ps ON ps.id = mvl.segment_id
       WHERE mvl.lens = $1
       ORDER BY mvl.logged_at DESC
       LIMIT $2`,
      [lens, limit]
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Returns the model with the highest dissent accuracy for a given lens.
 * This is the "canary" — the model that is most often RIGHT when it
 * goes against the group. Used to assign the adversarial slot.
 *
 * Falls back to null if not enough dissent data yet (< 3 dissent verdicts).
 *
 * @param {object} pool
 * @param {string} [lens] — if omitted, returns best dissenter across all lenses
 * @returns {Promise<{lens, model, provider, dissent_accuracy_pct, dissent_verdicts}|null>}
 */
export async function getDissenterLeader(pool, lens = null) {
  if (!pool) return null;
  try {
    if (lens) {
      const { rows } = await pool.query(
        `SELECT lens, model, provider, dissent_accuracy_pct, dissent_verdicts, avg_cost_usd
         FROM model_lens_dissent_leader
         WHERE lens = $1
         LIMIT 1`,
        [lens]
      );
      return rows[0] ?? null;
    }
    // Cross-lens: highest dissent accuracy overall (for global adversarial slot assignment)
    const { rows } = await pool.query(
      `SELECT lens, model, provider, dissent_accuracy_pct, dissent_verdicts, avg_cost_usd
       FROM model_lens_dissent_leader
       ORDER BY dissent_accuracy_pct DESC NULLS LAST, dissent_verdicts DESC
       LIMIT 1`
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
