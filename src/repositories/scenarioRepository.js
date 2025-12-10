```javascript
const { Pool } = require('pg');
const pool = new Pool();

class ScenarioRepository {
    async createScenario(userId, taskData) {
        const res = await pool.query(
            'INSERT INTO scenario_tasks (user_id, task_data) VALUES ($1, $2) RETURNING *',
            [userId, taskData]
        );
        return res.rows[0];
    }

    async getScenarioById(id) {
        const res = await pool.query('SELECT * FROM scenario_tasks WHERE id = $1', [id]);
        return res.rows[0];
    }

    async updateScenarioStatus(id, status) {
        const res = await pool.query(
            'UPDATE scenario_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        return res.rows[0];
    }
}

module.exports = new ScenarioRepository();
```