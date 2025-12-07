/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MAKE.COM SCENARIO & ZAP GENERATOR                               ║
 * ║                    Generate Make.com scenarios and Zapier zaps                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class MakeComGenerator {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
  }

  /**
   * Generate Make.com scenario
   */
  async generateScenario({
    description,
    trigger = null,
    actions = [],
    integrations = [],
  }) {
    console.log(`⚙️ [MAKE.COM] Generating scenario...`);

    const prompt = `Generate a complete Make.com scenario:

Description: ${description}
Trigger: ${trigger || 'Auto-detect best trigger'}
Actions: ${actions.length > 0 ? actions.join(', ') : 'Auto-generate'}
Integrations: ${integrations.length > 0 ? integrations.join(', ') : 'Auto-detect'}

Provide:
1. Complete scenario structure (JSON)
2. Step-by-step setup instructions
3. Module configuration
4. Data mapping
5. Error handling
6. Testing steps
7. Optimization tips

Return as JSON with complete scenario definition.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const scenario = this.parseJSONResponse(response);
      const scenarioId = `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.storeScenario(scenarioId, description, scenario);

      return { scenarioId, scenario };
    } catch (error) {
      console.error('❌ [MAKE.COM] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate Zapier zap
   */
  async generateZap({
    description,
    trigger = null,
    actions = [],
  }) {
    console.log(`⚡ [ZAPIER] Generating zap...`);

    const prompt = `Generate a complete Zapier zap:

Description: ${description}
Trigger: ${trigger || 'Auto-detect'}
Actions: ${actions.length > 0 ? actions.join(', ') : 'Auto-generate'}

Provide:
1. Complete zap structure (JSON)
2. Trigger configuration
3. Action configuration
4. Data mapping
5. Setup instructions
6. Testing steps

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const zap = this.parseJSONResponse(response);
      const zapId = `zap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.storeZap(zapId, description, zap);

      return { zapId, zap };
    } catch (error) {
      console.error('❌ [ZAPIER] Error:', error.message);
      throw error;
    }
  }

  /**
   * Store scenario
   */
  async storeScenario(scenarioId, description, scenario) {
    try {
      await this.pool.query(
        `INSERT INTO makecom_scenarios 
         (scenario_id, description, scenario_data, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          scenarioId,
          description,
          JSON.stringify(scenario),
          'generated',
        ]
      );
    } catch (error) {
      console.error('Error storing scenario:', error.message);
    }
  }

  /**
   * Store zap
   */
  async storeZap(zapId, description, zap) {
    try {
      await this.pool.query(
        `INSERT INTO zapier_zaps 
         (zap_id, description, zap_data, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          zapId,
          description,
          JSON.stringify(zap),
          'generated',
        ]
      );
    } catch (error) {
      console.error('Error storing zap:', error.message);
    }
  }

  /**
   * Get all scenarios
   */
  async getScenarios(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM makecom_scenarios ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(row => ({
        ...row,
        scenario_data: typeof row.scenario_data === 'string' ? JSON.parse(row.scenario_data) : row.scenario_data,
      }));
    } catch (error) {
      console.error('Error getting scenarios:', error.message);
      return [];
    }
  }

  /**
   * Get all zaps
   */
  async getZaps(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM zapier_zaps ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(row => ({
        ...row,
        zap_data: typeof row.zap_data === 'string' ? JSON.parse(row.zap_data) : row.zap_data,
      }));
    } catch (error) {
      console.error('Error getting zaps:', error.message);
      return [];
    }
  }

  /**
   * Parse JSON response
   */
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return {};
    }
  }
}
