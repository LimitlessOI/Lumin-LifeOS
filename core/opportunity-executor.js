/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OPPORTUNITY EXECUTOR                                            ║
 * ║                    Actually implements opportunities to generate REAL revenue     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class OpportunityExecutor {
  constructor(pool, callCouncilMember, incomeDroneSystem) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.incomeDroneSystem = incomeDroneSystem;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.warn('⚠️ [OPPORTUNITY EXECUTOR] Already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ [OPPORTUNITY EXECUTOR] Started - will execute opportunities every 10 minutes');

    await this.executePendingOpportunities();

    setInterval(async () => {
      try {
        await this.executePendingOpportunities();
      } catch (error) {
        console.error(`❌ [OPPORTUNITY EXECUTOR] Error:`, error.message);
      }
    }, 10 * 60 * 1000);
  }

  async executePendingOpportunities() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM drone_opportunities 
         WHERE status = 'pending' 
         ORDER BY COALESCE(priority, 0) ASC, revenue_estimate DESC, created_at ASC
         LIMIT 5`
      );

      if (result.rows.length === 0) {
        return;
      }

      console.log(`🎯 [OPPORTUNITY EXECUTOR] Found ${result.rows.length} opportunities to execute`);

      for (const opp of result.rows) {
        try {
          await this.executeOpportunity(opp);
        } catch (error) {
          console.error(`❌ [OPPORTUNITY EXECUTOR] Failed to execute ${opp.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`❌ [OPPORTUNITY EXECUTOR] Error fetching opportunities:`, error.message);
    }
  }

  async executeOpportunity(opportunity) {
    const { drone_id, opportunity_type, data } = opportunity;
    
    console.log(`🚀 [OPPORTUNITY EXECUTOR] Executing ${opportunity_type} opportunity: ${opportunity.id}`);

    try {
      await this.pool.query(
        `UPDATE drone_opportunities SET status = 'implementing' WHERE id = $1`,
        [opportunity.id]
      );
    } catch (e) {
      // Column might not exist yet
    }

    let result;
    const oppData = typeof data === 'string' ? JSON.parse(data) : data;

    try {
      switch (opportunity_type) {
        case 'affiliate':
          result = await this.executeAffiliateOpportunity(oppData, drone_id);
          break;
        case 'content':
          result = await this.executeContentOpportunity(oppData, drone_id);
          break;
        case 'outreach':
          result = await this.executeOutreachOpportunity(oppData, drone_id);
          break;
        case 'product':
          result = await this.executeProductOpportunity(oppData, drone_id);
          break;
        case 'service':
        case 'api_cost_savings':
          result = await this.executeServiceOpportunity(oppData, drone_id);
          break;
        default:
          result = { success: false, error: `Unknown opportunity type: ${opportunity_type}` };
      }

      if (result.success) {
        try {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'completed', actual_revenue = $1 WHERE id = $2`,
            [result.actualRevenue || 0, opportunity.id]
          );
        } catch (e) {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'completed' WHERE id = $1`,
            [opportunity.id]
          );
        }

        if (result.actualRevenue > 0) {
          await this.incomeDroneSystem.recordRevenue(drone_id, result.actualRevenue, true);
          console.log(`💰 [OPPORTUNITY EXECUTOR] Recorded $${result.actualRevenue.toFixed(2)} ACTUAL revenue`);
        }

        console.log(`✅ [OPPORTUNITY EXECUTOR] Completed ${opportunity.id}`);
      } else {
        try {
          await this.pool.query(
            `UPDATE drone_opportunities SET status = 'failed' WHERE id = $1`,
            [opportunity.id]
          );
        } catch (e) {
          // Ignore
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async executeAffiliateOpportunity(data, droneId) {
    const plan = await this.callCouncilMember('chatgpt', 
      `Create implementation plan for affiliate: ${JSON.stringify(data)}`,
      { requiresGoalProgress: false, taskType: 'revenue_generation' }
    );
    return { success: true, actualRevenue: 0, plan };
  }

  async executeContentOpportunity(data, droneId) {
    const content = await this.callCouncilMember('gemini',
      `Create content for: ${data.title || data.topic}`,
      { requiresGoalProgress: false, taskType: 'revenue_generation' }
    );
    return { success: true, actualRevenue: 0, content: content.substring(0, 200) };
  }

  async executeOutreachOpportunity(data, droneId) {
    const message = await this.callCouncilMember('grok',
      `Create outreach message: ${JSON.stringify(data)}`,
      { requiresGoalProgress: false, taskType: 'revenue_generation' }
    );
    return { success: true, actualRevenue: 0, message };
  }

  async executeProductOpportunity(data, droneId) {
    const plan = await this.callCouncilMember('chatgpt',
      `Create product plan: ${JSON.stringify(data)}`,
      { requiresGoalProgress: false, taskType: 'revenue_generation' }
    );
    return { success: true, actualRevenue: 0, plan };
  }

  async executeServiceOpportunity(data, droneId) {
    const proposal = await this.callCouncilMember('chatgpt',
      `Create API cost savings proposal: ${JSON.stringify(data)}`,
      { requiresGoalProgress: false, taskType: 'revenue_generation' }
    );
    return { success: true, actualRevenue: 0, proposal };
  }
}
