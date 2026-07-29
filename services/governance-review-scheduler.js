/**
 * SYNOPSIS: North Star §2.0G Governance Evolution Law — real fixed cadence.
 * services/governance-law-review.js built runGovernanceReview() but it was
 * deliberately never scheduled (Companion §0.6 requires a new timer be
 * reviewed before running unattended, and running one at the same commit
 * that adds it would skip that review). Founder has since repeatedly and
 * explicitly authorized the continuous governed build loop; this closes the
 * same gap for governance review specifically -- persisted history, not
 * just an on-demand-callable function.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { runGovernanceReview } from './governance-law-review.js';
import { createUsefulWorkGuard } from './useful-work-guard.js';

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS governance_review_log (
      id SERIAL PRIMARY KEY,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      report_json JSONB NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_review_log_generated_at ON governance_review_log (generated_at)`);
}

async function lastReviewAt(pool) {
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT generated_at FROM governance_review_log ORDER BY generated_at DESC LIMIT 1`,
  );
  return rows[0]?.generated_at || null;
}

async function runGovernanceReviewTick({ pool, logger = console }) {
  const report = await runGovernanceReview({ pool });
  await ensureTable(pool);
  await pool.query(
    `INSERT INTO governance_review_log (report_json) VALUES ($1)`,
    [JSON.stringify(report)],
  );
  logger.log?.(
    `[GOVERNANCE-REVIEW] recorded — escalation classes: ${Object.keys(report.escalation_class_distribution || {}).length}, ` +
    `model roles wired: ${report.model_benchmarking?.wired_roles ?? 'n/a'}`,
  );
  return report;
}

/**
 * Real cadence, not on-demand-only: default 24h, so §2.0G's "fixed cadence"
 * is a provable fact (rows in governance_review_log with real timestamps),
 * not just a callable function nobody calls unattended.
 */
export function registerGovernanceReviewScheduler({ pool, logger = console, intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  if (!pool) return null;
  const guarded = createUsefulWorkGuard({
    taskName: 'Governance Review Tick',
    purpose: 'North Star §2.0G — periodic review of escalation-class distribution, model-benchmarking coverage, and known-gate inventory, persisted as real history',
    prerequisites: async () => ({ ok: true, reason: 'no external prerequisites — pure data review' }),
    // Skip if a review already ran within the last interval (covers the
    // process restarting more often than the cadence, e.g. redeploys).
    workCheck: async () => {
      const last = await lastReviewAt(pool);
      if (!last) return { count: 1, description: 'no prior governance review recorded' };
      const ageMs = Date.now() - new Date(last).getTime();
      return ageMs >= intervalMs
        ? { count: 1, description: `last review ${Math.round(ageMs / 3600000)}h ago, due` }
        : { count: 0, description: `last review ${Math.round(ageMs / 60000)}m ago, not due yet` };
    },
    execute: () => runGovernanceReviewTick({ pool, logger }),
    logger,
  });
  const timer = setInterval(guarded, Math.min(intervalMs, 6 * 60 * 60 * 1000));
  if (typeof timer.unref === 'function') timer.unref();
  guarded().catch((err) => logger.warn?.(`[GOVERNANCE-REVIEW] initial tick failed: ${err.message}`));
  return { timer, tick: guarded };
}

export async function getGovernanceReviewHistory(pool, { limit = 20 } = {}) {
  if (!pool) return { ok: false, reason: 'no_pool' };
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT id, generated_at, report_json FROM governance_review_log ORDER BY generated_at DESC LIMIT $1`,
    [Math.min(200, Math.max(1, Number(limit) || 20))],
  );
  return { ok: true, count: rows.length, reviews: rows };
}
