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
      // Get revenue from income drones
      const revenueResult = await this.pool.query(
        `SELECT COALESCE(SUM(revenue_generated), 0) as total_revenue
         FROM income_drones WHERE status = 'active'`
      );
      
      // Get spending from self_funding_spending
      const spendingResult = await this.pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_spent
         FROM self_funding_spending WHERE status = 'completed'`
      );
      
      const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);
      const totalSpent = parseFloat(spendingResult.rows[0]?.total_spent || 0);
      
      // ROI tracker is in-memory (roiTracker object), not a database table
      // Calculate balance from revenue and spending
      this.revenueBalance = totalRevenue - totalSpent;
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
   * Generate spending opportunities (PRIORITIZE INCOME OVER SAVINGS)
   */
  async generateSpendingOpportunities() {
    const prompt = `Generate 10 spending opportunities for LifeOS to grow revenue:

Current balance: $${this.revenueBalance.toFixed(2)}

PRIORITY ORDER:
1. HIGHEST PROBABILITY - Low hanging fruit that will definitely work
2. INCOME GENERATION - Things that make money, not save money
3. QUALITY IMPROVEMENTS - Give more value than paid for, continuously improve
4. CUT OFF IF FAILS - If something doesn't work, stop spending immediately

Focus on:
- Revenue-generating activities (ads, outreach, partnerships)
- Product/service improvements (add more value)
- Marketing that brings in customers
- Tools that help us make more money
- Low-hanging fruit (easy wins, high probability)

AVOID:
- Cost savings (secondary priority - only if it directly enables more income)
- Long-term projects with uncertain returns
- Things that don't directly generate revenue

For each opportunity, provide:
1. Name
2. Cost
3. Expected revenue (monthly)
4. Probability of success (0-100%)
5. Projected ROI
6. Time to see results
7. Risk level
8. Why it will work (be specific)
9. How we can give more value than paid for

Return as JSON array. Prioritize by:
- Highest probability first
- Highest revenue potential
- Fastest time to results
- Lowest risk`;

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
   * Check ROI before spending (PRIORITIZE INCOME, HIGH PROBABILITY)
   */
  async checkROI(opportunity) {
    const cost = parseFloat(opportunity.cost || opportunity.expectedCost || 0);
    const expectedRevenue = parseFloat(opportunity.expectedRevenue || opportunity.revenue || 0);
    const probability = parseFloat(opportunity.probability || opportunity.probabilityOfSuccess || 50);
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

    // PRIORITY: High probability + income generation
    // Lower ROI threshold if high probability and generates income
    const adjustedMinROI = probability >= 70 ? 1.5 : this.minProjectedROI; // Lower threshold for high-probability opportunities
    
    // Check ROI thresholds (adjusted for probability)
    if (projectedROI >= adjustedMinROI && expectedRevenue > 0) {
      return {
        approved: true,
        projectedROI,
        cost,
        expectedRevenue,
        probability,
        riskLevel: opportunity.riskLevel || 'medium',
        reason: probability >= 70 ? 'High probability income opportunity' : 'Meets ROI threshold',
      };
    }

    return {
      approved: false,
      reason: `ROI too low (${projectedROI.toFixed(2)}:1, need ${adjustedMinROI}:1) or no revenue`,
      projectedROI,
      minRequired: adjustedMinROI,
      probability,
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
