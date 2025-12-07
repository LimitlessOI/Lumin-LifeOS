/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    SELF-FUNDING SYSTEM                                             ║
 * ║                    System spends its own revenue if ROI is healthy                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class SelfFundingSystem {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.revenueBalance = 0;
    this.spendingHistory = [];
    this.minROI = 3.0; // Minimum 3:1 ROI to spend
    this.minProjectedROI = 2.5; // Minimum 2.5:1 projected ROI
  }

  /**
   * Initialize self-funding system
   */
  async initialize() {
    console.log('💰 [SELF-FUNDING] Initializing...');
    
    // Load revenue balance
    await this.loadRevenueBalance();
    
    // Start spending decisions
    this.startSpendingDecisions();
    
    console.log(`✅ [SELF-FUNDING] Initialized with $${this.revenueBalance.toFixed(2)} balance`);
  }

  /**
   * Load current revenue balance
   */
  async loadRevenueBalance() {
    try {
      const result = await this.pool.query(
        `SELECT 
          COALESCE(SUM(revenue_generated), 0) as total_revenue,
          COALESCE(SUM(amount), 0) as total_spent
         FROM (
           SELECT revenue_generated FROM income_drones WHERE status = 'active'
           UNION ALL
           SELECT amount FROM self_funding_spending WHERE status = 'completed'
         ) as combined`
      );
      
      // Also check ROI tracker
      const roiResult = await this.pool.query(
        `SELECT daily_revenue, daily_ai_cost FROM roi_tracker ORDER BY last_reset DESC LIMIT 1`
      );
      
      if (roiResult.rows.length > 0) {
        const roi = roiResult.rows[0];
        this.revenueBalance = parseFloat(roi.daily_revenue || 0) - parseFloat(roi.daily_ai_cost || 0);
      } else {
        this.revenueBalance = parseFloat(result.rows[0]?.total_revenue || 0) - parseFloat(result.rows[0]?.total_spent || 0);
      }
    } catch (error) {
      console.warn('⚠️ [SELF-FUNDING] Could not load balance:', error.message);
      this.revenueBalance = 0;
    }
  }

  /**
   * Start spending decision process
   */
  startSpendingDecisions() {
    // Evaluate spending opportunities every 30 minutes
    setInterval(() => this.evaluateSpendingOpportunities(), 30 * 60 * 1000);
    
    // Initial run
    setTimeout(() => this.evaluateSpendingOpportunities(), 60000); // 1 minute
  }

  /**
   * Evaluate spending opportunities
   */
  async evaluateSpendingOpportunities() {
    console.log('💸 [SELF-FUNDING] Evaluating spending opportunities...');
    
    // Generate spending opportunities
    const opportunities = await this.generateSpendingOpportunities();
    
    for (const opp of opportunities) {
      // Check ROI
      const roiCheck = await this.checkROI(opp);
      
      if (roiCheck.approved) {
        await this.executeSpending(opp, roiCheck);
      } else {
        console.log(`❌ [SELF-FUNDING] Rejected: ${opp.name} - ROI too low (${roiCheck.projectedROI?.toFixed(2)}:1)`);
      }
    }
  }

  /**
   * Generate spending opportunities
   */
  async generateSpendingOpportunities() {
    const prompt = `Generate 10 spending opportunities for LifeOS to grow revenue:

Current balance: $${this.revenueBalance.toFixed(2)}
Focus on:
- Advertising (Google Ads, Facebook, LinkedIn)
- Content marketing
- SEO
- Partnerships
- Product development
- Marketing tools
- Automation tools

For each opportunity, provide:
1. Name
2. Cost
3. Expected revenue (monthly)
4. Projected ROI
5. Time to see results
6. Risk level
7. Why it will work

Return as JSON array. Prioritize opportunities with ROI > 3:1.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      const opportunities = this.parseJSONResponse(response);
      return opportunities || [];
    } catch (error) {
      console.error('Error generating opportunities:', error.message);
      return [];
    }
  }

  /**
   * Check ROI before spending
   */
  async checkROI(opportunity) {
    const cost = parseFloat(opportunity.cost || opportunity.expectedCost || 0);
    const expectedRevenue = parseFloat(opportunity.expectedRevenue || opportunity.revenue || 0);
    const projectedROI = expectedRevenue > 0 ? expectedRevenue / cost : 0;

    // Check if we have enough balance
    if (cost > this.revenueBalance) {
      return {
        approved: false,
        reason: 'Insufficient balance',
        cost,
        balance: this.revenueBalance,
      };
    }

    // Check ROI thresholds
    if (projectedROI >= this.minProjectedROI) {
      return {
        approved: true,
        projectedROI,
        cost,
        expectedRevenue,
        riskLevel: opportunity.riskLevel || 'medium',
      };
    }

    return {
      approved: false,
      reason: 'ROI too low',
      projectedROI,
      minRequired: this.minProjectedROI,
    };
  }

  /**
   * Execute spending
   */
  async executeSpending(opportunity, roiCheck) {
    console.log(`💸 [SELF-FUNDING] Spending $${roiCheck.cost} on: ${opportunity.name}`);
    console.log(`   Projected ROI: ${roiCheck.projectedROI.toFixed(2)}:1`);

    try {
      const spendingId = `spend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Record spending
      await this.pool.query(
        `INSERT INTO self_funding_spending 
         (spending_id, opportunity_name, amount, expected_revenue, projected_roi, 
          category, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          spendingId,
          opportunity.name,
          roiCheck.cost,
          roiCheck.expectedRevenue,
          roiCheck.projectedROI,
          opportunity.category || 'marketing',
          'pending',
        ]
      );

      // Execute the spending (e.g., create ad campaign, buy tool, etc.)
      const result = await this.executeSpendingAction(opportunity, roiCheck);

      // Update status
      await this.pool.query(
        `UPDATE self_funding_spending SET status = $1, execution_data = $2, executed_at = NOW()
         WHERE spending_id = $3`,
        [result.success ? 'completed' : 'failed', JSON.stringify(result), spendingId]
      );

      // Update balance
      if (result.success) {
        this.revenueBalance -= roiCheck.cost;
        console.log(`✅ [SELF-FUNDING] Spent $${roiCheck.cost}. New balance: $${this.revenueBalance.toFixed(2)}`);
      }

      return result;
    } catch (error) {
      console.error('Error executing spending:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute actual spending action
   */
  async executeSpendingAction(opportunity, roiCheck) {
    // This would integrate with actual services
    // For now, log the action
    
    if (opportunity.category === 'advertising') {
      // Would create actual ad campaigns
      console.log(`📢 [SELF-FUNDING] Would create ad campaign: ${opportunity.name}`);
      return { success: true, action: 'ad_campaign_created' };
    } else if (opportunity.category === 'tool' || opportunity.category === 'software') {
      // Would purchase tools
      console.log(`🛠️ [SELF-FUNDING] Would purchase tool: ${opportunity.name}`);
      return { success: true, action: 'tool_purchased' };
    } else if (opportunity.category === 'content') {
      // Would create content
      console.log(`📝 [SELF-FUNDING] Would create content: ${opportunity.name}`);
      return { success: true, action: 'content_created' };
    }

    return { success: true, action: 'logged' };
  }

  /**
   * Get spending history
   */
  async getSpendingHistory(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM self_funding_spending 
         ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting spending history:', error.message);
      return [];
    }
  }

  /**
   * Get current balance and stats
   */
  async getStats() {
    await this.loadRevenueBalance();
    
    try {
      const spending = await this.pool.query(
        `SELECT 
          COUNT(*) as total_spending,
          SUM(amount) as total_spent,
          SUM(expected_revenue) as total_expected_revenue,
          AVG(projected_roi) as avg_roi
         FROM self_funding_spending 
         WHERE status = 'completed'`
      );

      return {
        currentBalance: this.revenueBalance,
        totalSpent: parseFloat(spending.rows[0]?.total_spent || 0),
        totalExpectedRevenue: parseFloat(spending.rows[0]?.total_expected_revenue || 0),
        avgROI: parseFloat(spending.rows[0]?.avg_roi || 0),
        totalSpending: parseInt(spending.rows[0]?.total_spending || 0),
      };
    } catch (error) {
      return {
        currentBalance: this.revenueBalance,
        totalSpent: 0,
        totalExpectedRevenue: 0,
        avgROI: 0,
        totalSpending: 0,
      };
    }
  }

  /**
   * Parse JSON response
   */
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return [];
    }
  }
}
