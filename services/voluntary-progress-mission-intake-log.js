/**
 * SYNOPSIS: Exports logMissionIntake — services/voluntary-progress-mission-intake-log.js.
 */
import { Pool } from 'pg';

export async function logMissionIntake(pool, { artifact_id, product, mission = null, customer = null, journey_stage_current = null, journey_stage_target = null, primary_objection = null, trust_strategy = null, next_voluntary_action = null, success_metric = null }) {
    await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_mission_intake_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), artifact_id TEXT NOT NULL, product TEXT NOT NULL, mission TEXT, customer TEXT, journey_stage_current TEXT, journey_stage_target TEXT, primary_objection TEXT, trust_strategy TEXT, next_voluntary_action TEXT, success_metric TEXT, intake_complete BOOLEAN NOT NULL, logged_at TIMESTAMPTZ NOT NULL DEFAULT now())');

    const requiredFields = { mission, customer, primary_objection, trust_strategy, next_voluntary_action, success_metric };
    const missingFields = Object.entries(requiredFields).filter(([_, value]) => !value).map(([key]) => key);
    const intake_complete = missingFields.length === 0;

    try {
        await pool.query(
            'INSERT INTO voluntary_progress_mission_intake_log (artifact_id, product, mission, customer, journey_stage_current, journey_stage_target, primary_objection, trust_strategy, next_voluntary_action, success_metric, intake_complete) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [artifact_id, product, mission, customer, journey_stage_current, journey_stage_target, primary_objection, trust_strategy, next_voluntary_action, success_metric, intake_complete]
        );
    } catch (error) {
        return { intake_complete: false, missing_fields: ['logging_failed'], logging_error: String(error.message || error) };
    }

    return { intake_complete, missing_fields };
}

export async function getMissionIntakeStats(pool, { product, since = null } = {}) {
    await pool.query('CREATE TABLE IF NOT EXISTS voluntary_progress_mission_intake_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), artifact_id TEXT NOT NULL, product TEXT NOT NULL, mission TEXT, customer TEXT, journey_stage_current TEXT, journey_stage_target TEXT, primary_objection TEXT, trust_strategy TEXT, next_voluntary_action TEXT, success_metric TEXT, intake_complete BOOLEAN NOT NULL, logged_at TIMESTAMPTZ NOT NULL DEFAULT now())');

    const query = since 
        ? 'SELECT COUNT(*) FILTER (WHERE product = $1) AS total, COUNT(*) FILTER (WHERE product = $1 AND intake_complete = true) AS complete, COUNT(*) FILTER (WHERE product = $1 AND intake_complete = false) AS incomplete FROM voluntary_progress_mission_intake_log WHERE logged_at >= $2'
        : 'SELECT COUNT(*) FILTER (WHERE product = $1) AS total, COUNT(*) FILTER (WHERE product = $1 AND intake_complete = true) AS complete, COUNT(*) FILTER (WHERE product = $1 AND intake_complete = false) AS incomplete FROM voluntary_progress_mission_intake_log';

    const values = since ? [product, since] : [product];

    const res = await pool.query(query, values);
    const { total, complete, incomplete } = res.rows[0];

    return {
        total: parseInt(total, 10),
        complete: parseInt(complete, 10),
        incomplete: parseInt(incomplete, 10),
        incomplete_rate: total > 0 ? incomplete / total : 0
    };
}
