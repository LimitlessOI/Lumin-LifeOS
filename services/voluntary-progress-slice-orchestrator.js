/**
 * SYNOPSIS: Exports proposeGoal — services/voluntary-progress-slice-orchestrator.js.
 */
import { readTypedTwinState, isFieldKnown } from './voluntary-progress-twin-read.js';
import { activateContextView, applyContextView } from './voluntary-progress-context-view.js';
import { recordDecision, shouldStopPursuingGoal } from './voluntary-progress-decision-step.js';
import { generateAlternativeFutures, pathRequiresFullDecisionBrief } from './voluntary-progress-alternative-futures.js';
import { createGoalExperiment, recordGoalExperimentOutcome } from './voluntary-progress-experiment.js';
import { proposeTwinUpdate } from './voluntary-progress-twin-proposal-gate.js';

export async function proposeGoal(pool, { user_id, goal_text, goal_category = 'general' }) {
    if (!goal_text || typeof goal_text !== 'string') {
        throw new Error('Goal text must be a non-empty string');
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        goal_text TEXT NOT NULL,
        goal_category TEXT NOT NULL DEFAULT 'general',
        origin TEXT NOT NULL DEFAULT 'user_stated',
        status TEXT NOT NULL DEFAULT 'proposed',
        declared_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const result = await pool.query(
        `INSERT INTO voluntary_progress_goals (user_id, goal_text, goal_category) VALUES ($1, $2, $3) RETURNING *`,
        [user_id, goal_text, goal_category]
    );
    return result.rows[0];
}

export async function presentAlternativeFutures(pool, { user_id, goal_id, twinKey, moduleKey = null, tenantId = 'default', fields = [] }) {
    if (await shouldStopPursuingGoal(pool, { user_id, goal_id })) {
        return { ok: false, reason: 'goal_declined_do_not_re_pursue' };
    }

    const goalResult = await pool.query(`SELECT * FROM voluntary_progress_goals WHERE id = $1`, [goal_id]);
    if (goalResult.rows.length === 0) {
        throw new Error('Goal not found');
    }
    const goal = goalResult.rows[0];

    const contextView = await activateContextView(pool, {
        user_id,
        activation_reason: `Goal pursuit for ${goal.goal_text}`,
        permitted_reads: fields,
        consent_scope: 'internal_operational'
    });

    const twinReadResult = await readTypedTwinState(pool, { userId: user_id, tenantId, twinKey, moduleKey, requesterId: user_id, fields });
    if (!twinReadResult.ok) {
        return twinReadResult;
    }

    const filteredState = applyContextView(twinReadResult.state, contextView);

    const paths = generateAlternativeFutures({ goal_text: goal.goal_text, goal_category: goal.goal_category });

    return { ok: true, goal, context_view: contextView, twin_state: filteredState, alternative_futures: paths };
}

export async function confirmGoalDecision(pool, { user_id, goal_id, decision_status, modified_goal_text = null, chosen_path_label = null, path_description = null }) {
    const decision = await recordDecision(pool, { user_id, goal_id, decision_status, modified_goal_text });

    await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        goal_text TEXT NOT NULL,
        goal_category TEXT NOT NULL DEFAULT 'general',
        origin TEXT NOT NULL DEFAULT 'user_stated',
        status TEXT NOT NULL DEFAULT 'proposed',
        declared_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    let newStatus = decision_status;
    if (decision_status === 'rejected' || decision_status === 'opted_out') {
        newStatus = 'declined';
    }
    await pool.query(`UPDATE voluntary_progress_goals SET status = $1 WHERE id = $2`, [newStatus, goal_id]);

    let experiment = null;
    if ((decision_status === 'accepted' || decision_status === 'modified') && chosen_path_label && path_description) {
        experiment = await createGoalExperiment(pool, { user_id, goal_id, chosen_path_label, path_description });
    }

    return { ok: true, decision, experiment };
}

export async function compareExperimentOutcome(pool, { user_id, goal_experiment_id, actual_option, captured_how = 'explicit', twin_subject, twin_proposed_value, truth_grade = 'THINK', evidence = null }) {
    const outcome = await recordGoalExperimentOutcome(pool, { goal_experiment_id, actual_option, captured_how });

    const twinProposal = await proposeTwinUpdate(pool, {
        user_id,
        subject: twin_subject,
        proposed_value: twin_proposed_value,
        truth_grade,
        evidence,
        rationale: `Compared experiment outcome for goal_experiment_id ${goal_experiment_id} with actual_option ${actual_option}`,
        proposed_by: 'voluntary-progress-slice-orchestrator'
    });

    return { ok: true, outcome, twin_proposal };
}
