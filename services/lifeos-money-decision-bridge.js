/**
 * services/lifeos-money-decision-bridge.js
 *
 * Bridges the LifeOS Finance layer and the Decision Intelligence layer.
 *
 * Why this exists (Amendment 21 Phase 16):
 *   Money decisions are the loudest mirror. The Finance module captures
 *   transactions and goals; the Decision Intelligence module can log
 *   decisions + run a Second Opinion. Until now they were disconnected, so
 *   a $5,000 irreversible money move did not automatically get the second
 *   opinion that a $5 coffee habit was capable of producing on request.
 *
 * What this module does:
 *   1. `logMoneyDecision(...)` — records a money move as a Decision Intelligence
 *      entry with category='finance', decorates the decision description with
 *      amount/account/direction, and stores the originating finance
 *      transaction/goal reference on the decision row (via
 *      `money_decision_links`). If the `amount_abs` meets or exceeds the
 *      user's configured threshold OR `is_irreversible=true`, it
 *      automatically triggers a Second Opinion and returns it alongside the
 *      decision.
 *
 *   2. `requestSecondOpinion(...)` — explicit handler for when the UI wants to
 *      request a Second Opinion without re-logging. Looks up the decision,
 *      then calls `decisionIntelligence.getSecondOpinion()`.
 *
 *   3. `getThreshold(userId)` — reads the per-user money-decision threshold
 *      from `lifeos_users.flourishing_prefs.money_decision_threshold`.
 *      Defaults to $500. NEVER throws — always returns a finite number.
 *
 * Sovereignty note:
 *   This module does not block or veto any money move. It only opens the
 *   second-opinion mirror when the size/irreversibility crosses the
 *   user-declared threshold. The user remains sovereign.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createDecisionIntelligence } from './decision-intelligence.js';

const DEFAULT_THRESHOLD = 500;

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null, logger?: object }} deps
 */
export function createMoneyDecisionBridge({ pool, callAI, logger = console }) {
  const log = logger;
  const decisionIntel = createDecisionIntelligence({ pool, callAI, logger });

  /**
   * Read the per-user money-decision threshold (in absolute dollars).
   * Fails closed to DEFAULT_THRESHOLD — never throws.
   *
   * @param {number} userId
   * @returns {Promise<number>}
   */
  async function getThreshold(userId) {
    if (!userId) return DEFAULT_THRESHOLD;
    try {
      const { rows } = await pool.query(
        `SELECT flourishing_prefs FROM lifeos_users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      const prefs = rows[0]?.flourishing_prefs || {};
      const raw = prefs.money_decision_threshold;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD;
    } catch (err) {
      log.warn?.({ err: err.message }, '[money-decision-bridge] getThreshold fell back to default');
      return DEFAULT_THRESHOLD;
    }
  }

  /**
   * Log a money decision into Decision Intelligence and (optionally) trigger
   * a Second Opinion if the absolute amount crosses the threshold or if the
   * decision is explicitly marked irreversible.
   *
   * @param {{
   *   userId: number,
   *   title: string,
   *   amount: number|string,
   *   direction?: 'out'|'in'|'transfer',  // default: 'out'
   *   account?: string|null,
   *   category?: string|null,
   *   alternativesConsidered?: string|null,
   *   emotionalState?: string|null,
   *   isIrreversible?: boolean,
   *   linkedTransactionId?: number|null,
   *   linkedGoalId?: number|null,
   *   forceSecondOpinion?: boolean,
   * }} input
   * @returns {Promise<{
   *   decision: object,
   *   second_opinion: object|null,
   *   threshold_applied: number,
   *   triggered_second_opinion: boolean,
   * }>}
   */
  async function logMoneyDecision(input) {
    const {
      userId,
      title,
      amount,
      direction = 'out',
      account = null,
      category = null,
      alternativesConsidered = null,
      emotionalState = null,
      isIrreversible = false,
      linkedTransactionId = null,
      linkedGoalId = null,
      forceSecondOpinion = false,
    } = input || {};

    if (!userId)        throw new Error('userId required');
    if (!title)         throw new Error('title required');
    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum)) throw new Error('amount must be a finite number');

    const amountAbs = Math.abs(amtNum);
    const threshold = await getThreshold(userId);
    const shouldSecondOpinion = forceSecondOpinion || isIrreversible || amountAbs >= threshold;

    const decoratedTitle = `$${amountAbs.toFixed(2)} ${direction}${category ? ` · ${category}` : ''} — ${title}`;
    const decoratedMade  = [
      `amount_abs=$${amountAbs.toFixed(2)}`,
      `direction=${direction}`,
      account  ? `account=${account}`   : null,
      category ? `category=${category}` : null,
      isIrreversible ? 'irreversible=true' : null,
    ].filter(Boolean).join('; ');

    // `decisions.alternatives_considered` is a TEXT[] column — normalize before
    // sending it through Decision Intelligence so strings and arrays both work.
    const altsArr = Array.isArray(alternativesConsidered)
      ? alternativesConsidered.filter(Boolean)
      : (typeof alternativesConsidered === 'string' && alternativesConsidered.trim()
          ? alternativesConsidered.split(/\n|;|\|/).map(s => s.trim()).filter(Boolean)
          : []);

    // 1. Log the decision via Decision Intelligence (category=finance)
    const decision = await decisionIntel.logDecision({
      userId,
      title:                  decoratedTitle,
      category:               'finance',
      decisionMade:           decoratedMade,
      alternativesConsidered: altsArr,
      emotionalState,
    });

    // 2. Persist the finance-side link so we can trace back from Decision to
    //    the originating transaction/goal. Table is created lazily here so
    //    older envs don't fail the DI logDecision call.
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS money_decision_links (
           decision_id           BIGINT PRIMARY KEY,
           user_id               BIGINT NOT NULL,
           amount_abs            NUMERIC(14,2) NOT NULL,
           direction             TEXT NOT NULL,
           is_irreversible       BOOLEAN NOT NULL DEFAULT FALSE,
           linked_transaction_id BIGINT,
           linked_goal_id        BIGINT,
           threshold_applied     NUMERIC(14,2),
           created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      );
      await pool.query(
        `INSERT INTO money_decision_links
           (decision_id, user_id, amount_abs, direction, is_irreversible,
            linked_transaction_id, linked_goal_id, threshold_applied)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (decision_id) DO UPDATE
           SET amount_abs = EXCLUDED.amount_abs,
               direction  = EXCLUDED.direction,
               is_irreversible = EXCLUDED.is_irreversible,
               linked_transaction_id = EXCLUDED.linked_transaction_id,
               linked_goal_id = EXCLUDED.linked_goal_id,
               threshold_applied = EXCLUDED.threshold_applied`,
        [
          decision.id,
          userId,
          amountAbs,
          direction,
          isIrreversible,
          linkedTransactionId,
          linkedGoalId,
          threshold,
        ]
      );
    } catch (err) {
      log.warn?.({ err: err.message }, '[money-decision-bridge] could not persist money_decision_links');
    }

    // 3. Second Opinion (only if we have an AI and a threshold is crossed)
    let secondOpinion = null;
    let triggered = false;
    if (shouldSecondOpinion && callAI) {
      try {
        const description = [
          `I am about to make a financial decision:`,
          `  ${decoratedTitle}`,
          alternativesConsidered ? `Alternatives I have considered: ${alternativesConsidered}` : null,
          emotionalState ? `My current emotional state: ${emotionalState}` : null,
          isIrreversible ? `This decision is effectively irreversible.` : null,
          `My threshold for automatic second-opinions is $${threshold.toFixed(2)}.`,
        ].filter(Boolean).join('\n');
        secondOpinion = await decisionIntel.getSecondOpinion({
          userId,
          decisionDescription: description,
          decisionId: decision.id,
        });
        triggered = true;
      } catch (err) {
        log.warn?.({ err: err.message }, '[money-decision-bridge] getSecondOpinion failed');
      }
    }

    return {
      decision,
      second_opinion: secondOpinion,
      threshold_applied: threshold,
      triggered_second_opinion: triggered,
    };
  }

  /**
   * Explicit Second Opinion request for an existing decision id. Caller
   * must pass the decision_id returned from logMoneyDecision (or listable
   * from the Decision Intelligence routes).
   *
   * @param {{ userId: number, decisionId: number, extraContext?: string|null }} input
   * @returns {Promise<{ second_opinion: object|null }>}
   */
  async function requestSecondOpinion({ userId, decisionId, extraContext = null }) {
    if (!userId || !decisionId) throw new Error('userId and decisionId required');
    if (!callAI) throw new Error('AI not configured on this server');

    // Load the decision so we can re-construct a description
    const { rows } = await pool.query(
      `SELECT id, title, decision_made, alternatives_considered, category
       FROM decisions WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [decisionId, userId]
    );
    if (!rows.length) throw new Error('decision not found');
    const d = rows[0];

    const altsText = Array.isArray(d.alternatives_considered)
      ? d.alternatives_considered.join('; ')
      : (d.alternatives_considered || '');

    const description = [
      `Decision under review:`,
      `  ${d.title}`,
      d.decision_made ? `Details: ${d.decision_made}` : null,
      altsText ? `Alternatives: ${altsText}` : null,
      extraContext || null,
    ].filter(Boolean).join('\n');

    const secondOpinion = await decisionIntel.getSecondOpinion({
      userId,
      decisionDescription: description,
      decisionId: d.id,
    });

    return { second_opinion: secondOpinion };
  }

  return {
    getThreshold,
    logMoneyDecision,
    requestSecondOpinion,
    DEFAULT_THRESHOLD,
  };
}
