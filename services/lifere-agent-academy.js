/**
 * SYNOPSIS: Exports createLifereAgentAcademy — services/lifere-agent-academy.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
export function createLifereAgentAcademy({ pool }) {
  return {
    async createAgentProfile(userId, profile) {
      const query = `
        INSERT INTO lifere_agent_profiles (user_id, license_state, experience_level, goals)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
          license_state = EXCLUDED.license_state,
          experience_level = EXCLUDED.experience_level,
          goals = EXCLUDED.goals
        RETURNING user_id
      `;
      const { rows } = await pool.query(query, [
        userId,
        profile?.license_state || null,
        profile?.experience_level || null,
        JSON.stringify(profile?.goals || []),
      ]);
      return rows[0];
    },

    async getAgentProfile(userId) {
      const { rows } = await pool.query('SELECT * FROM lifere_agent_profiles WHERE user_id = $1', [userId]);
      return rows[0] || null;
    },

    async getTrainingModule(moduleId) {
      const { rows } = await pool.query('SELECT * FROM lifere_training_modules WHERE id = $1', [moduleId]);
      return rows[0] || null;
    },

    async listTrainingModules(filters = {}) {
      let query = 'SELECT * FROM lifere_training_modules WHERE 1=1';
      const values = [];
      if (filters.category) {
        values.push(filters.category);
        query += ` AND category = $${values.length}`;
      }
      query += ' ORDER BY order_index, id';
      const { rows } = await pool.query(query, values);
      return rows;
    },

    async listTestTopics(filters = {}) {
      const modules = await this.listTrainingModules({ category: filters.category || 'test prep' });
      return modules.map((m) => ({ id: m.id, title: m.title, category: m.category }));
    },

    async startRolePlay(agentId, scenario) {
      const query = 'INSERT INTO lifere_roleplay_sessions (agent_id, scenario, transcript, score) VALUES ($1, $2, $3, $4) RETURNING id';
      const { rows } = await pool.query(query, [agentId, scenario, JSON.stringify([]), JSON.stringify({})]);
      return rows[0].id;
    },

    async submitRolePlayResponse(sessionId, response) {
      const select = await pool.query('SELECT transcript FROM lifere_roleplay_sessions WHERE id = $1', [sessionId]);
      if (!select.rows.length) return null;
      const transcript = select.rows[0].transcript || [];
      transcript.push({ role: 'agent', text: response, at: new Date().toISOString() });
      await pool.query('UPDATE lifere_roleplay_sessions SET transcript = $1 WHERE id = $2', [JSON.stringify(transcript), sessionId]);
      return { ok: true };
    },

    async scoreRolePlayResponse(sessionId) {
      const { rows } = await pool.query('SELECT * FROM lifere_roleplay_sessions WHERE id = $1', [sessionId]);
      if (!rows.length) return null;
      const session = rows[0];
      const score = { clarity: 70, empathy: 70, close: 70, notes: 'Auto-scored placeholder' };
      await pool.query('UPDATE lifere_roleplay_sessions SET score = $1 WHERE id = $2', [JSON.stringify(score), sessionId]);
      return { ...session, score };
    },

    async getNextLesson(agentId) {
      const profile = await this.getAgentProfile(agentId);
      const experienceLevel = profile?.experience_level || 'new';
      const { rows } = await pool.query(
        "SELECT * FROM lifere_training_modules WHERE content->>'level' = $1 ORDER BY order_index, id LIMIT 1",
        [experienceLevel]
      );
      if (!rows.length) {
        const any = await pool.query('SELECT * FROM lifere_training_modules ORDER BY order_index, id LIMIT 1');
        return any.rows[0] || null;
      }
      return rows[0];
    },
  };
}
