/**
 * SYNOPSIS: Exports createGoalExperiment — services/voluntary-progress-experiment.js.
 */
import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';

export async function createGoalExperiment(pool, { user_id, goal_id, chosen_path_label, path_description }) {
    await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_goal_experiments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, goal_id TEXT NOT NULL, chosen_path_label TEXT NOT NULL, judgment_decision_id UUID, judgment_prediction_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');

    const { recordDecisionTurn, recordPrediction } = createCognitiveCoreJudgment({ pool });

    const decisionResult = await recordDecisionTurn({
        userId: user_id,
        domain: 'voluntary_progress_goal',
        question: `Chosen path for goal ${goal_id}: ${chosen_path_label}`,
        options: [chosen_path_label],
        stakes: 'medium'
    });

    const predictionResult = await recordPrediction({
        decisionId: decisionResult.decision_id,
        predictedOption: chosen_path_label,
        confidence: 0.5
    });

    const result = await pool.query(
        'INSERT INTO voluntary_progress_goal_experiments (user_id, goal_id, chosen_path_label, judgment_decision_id, judgment_prediction_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [user_id, goal_id, chosen_path_label, decisionResult.decision_id, predictionResult.prediction_id]
    );

    return {
        goal_experiment_id: result.rows[0].id,
        judgment_decision_id: decisionResult.decision_id,
        judgment_prediction_id: predictionResult.prediction_id
    };
}

export async function recordGoalExperimentOutcome(pool, { goal_experiment_id, actual_option, captured_how = 'explicit' }) {
    await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_goal_experiments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, goal_id TEXT NOT NULL, chosen_path_label TEXT NOT NULL, judgment_decision_id UUID, judgment_prediction_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');

    const { recordOutcome } = createCognitiveCoreJudgment({ pool });

    const lookupResult = await pool.query(
        'SELECT judgment_decision_id FROM voluntary_progress_goal_experiments WHERE id = $1',
        [goal_experiment_id]
    );

    const judgment_decision_id = lookupResult.rows[0].judgment_decision_id;

    return await recordOutcome({
        decisionId: judgment_decision_id,
        actualOption: actual_option,
        capturedHow: captured_how
    });
}
