const { Pool } = require('pg');

const pool = new Pool();

class FunnelRepository {
    async createFunnel(name) {
        const result = await pool.query(
            'INSERT INTO funnels (name) VALUES ($1) RETURNING *',
            [name]
        );
        return result.rows[0];
    }

    async updateFunnel(id, name) {
        const result = await pool.query(
            'UPDATE funnels SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        return result.rows[0];
    }

    async getFunnel(id) {
        const result = await pool.query(
            'SELECT * FROM funnels WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    // Methods for handling funnel steps
    async createFunnelStep(funnelId, stepName, position) {
        const result = await pool.query(
            'INSERT INTO funnel_steps (funnel_id, step_name, position) VALUES ($1, $2, $3) RETURNING *',
            [funnelId, stepName, position]
        );
        return result.rows[0];
    }

    async getFunnelSteps(funnelId) {
        const result = await pool.query(
            'SELECT * FROM funnel_steps WHERE funnel_id = $1 ORDER BY position',
            [funnelId]
        );
        return result.rows;
    }

    // Methods for handling funnel interactions
    async logFunnelInteraction(funnelStepId, userId, interactionType) {
        const result = await pool.query(
            'INSERT INTO funnel_interactions (funnel_step_id, user_id, interaction_type) VALUES ($1, $2, $3) RETURNING *',
            [funnelStepId, userId, interactionType]
        );
        return result.rows[0];
    }
}

module.exports = new FunnelRepository();
//