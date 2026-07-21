/**
 * SYNOPSIS: Exports recordDecision — services/voluntary-progress-decision-step.js.
 */
import { recordAsk, recordOptOut, hasOptedOut } from './voluntary-progress-ask-ledger.js';

export async function recordDecision(pool, { user_id, goal_id, decision_status, modified_goal_text = null }) {
    const allowedStatuses = ['accepted', 'modified', 'rejected', 'opted_out', 'deferred'];
    if (!allowedStatuses.includes(decision_status)) {
        throw new Error(`Invalid decision_status: ${decision_status}`);
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS voluntary_progress_decisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            goal_id TEXT NOT NULL,
            decision_status TEXT NOT NULL,
            modified_goal_text TEXT,
            decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const insertQuery = `
        INSERT INTO voluntary_progress_decisions (user_id, goal_id, decision_status, modified_goal_text)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const values = [user_id, goal_id, decision_status, modified_goal_text];
    const result = await pool.query(insertQuery, values);

    if (decision_status === 'opted_out') {
        await recordOptOut(pool, { user_id, ask_type: `goal:${goal_id}`, opt_out_reason: 'explicit_opt_out_on_goal' });
    }

    return result.rows[0];
}

export async function shouldStopPursuingGoal(pool, { user_id, goal_id }) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS voluntary_progress_decisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            goal_id TEXT NOT NULL,
            decision_status TEXT NOT NULL,
            modified_goal_text TEXT,
            decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const decisionQuery = `
        SELECT decision_status FROM voluntary_progress_decisions
        WHERE user_id = $1 AND goal_id = $2
        ORDER BY decided_at DESC
        LIMIT 1
    `;
    const decisionResult = await pool.query(decisionQuery, [user_id, goal_id]);
    const latestDecision = decisionResult.rows[0];

    const optedOut = await hasOptedOut(pool, { user_id, ask_type: `goal:${goal_id}` });

    if ((latestDecision && ['rejected', 'opted_out'].includes(latestDecision.decision_status)) || optedOut) {
        return true;
    }
    return false;
}

export async function getDecisionHistory(pool, { user_id, goal_id, limit = 20 } = {}) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS voluntary_progress_decisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            goal_id TEXT NOT NULL,
            decision_status TEXT NOT NULL,
            modified_goal_text TEXT,
            decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const historyQuery = `
        SELECT * FROM voluntary_progress_decisions
        WHERE user_id = $1 AND goal_id = $2
        ORDER BY decided_at DESC
        LIMIT $3
    `;
    const result = await pool.query(historyQuery, [user_id, goal_id, limit]);
    return result.rows;
}
