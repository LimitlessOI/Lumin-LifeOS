/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTONOMOUS BUSINESS CENTER                                      ║
 * ║                    Fully automated business management and operations            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class BusinessCenter {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.activeBusinesses = new Map();
    this.revenueStreams = [];
  }

  /**
   * Initialize business center
   */
  async initialize() {
    console.log('🏢 [BUSINESS CENTER] Initializing...');
    
    // Load active businesses
    await this.loadActiveBusinesses();
    
    // Start autonomous operations
    this.startAutonomousOperations();
    
    console.log('✅ [BUSINESS CENTER] Initialized');
  }

  /**
   * Load active businesses from database
   */
  async loadActiveBusinesses() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM autonomous_businesses WHERE status = 'active'`
      );
      
      for (const business of result.rows) {
        this.activeBusinesses.set(business.business_id, business);
      }
      
      console.log(`📊 [BUSINESS CENTER] Loaded ${result.rows.length} active businesses`);
    } catch (error) {
      console.warn('⚠️ [BUSINESS CENTER] Could not load businesses:', error.message);
    }
  }

  /**
   * Start autonomous business operations
   */
  startAutonomousOperations() {
    // Monitor business health every 5 minutes
    setInterval(() => this.monitorBusinessHealth(), 5 * 60 * 1000);
    
    // Generate revenue opportunities every 10 minutes
    setInterval(() => this.generateRevenueOpportunities(), 10 * 60 * 1000);
    
    // Optimize operations every 30 minutes
    setInterval(() => this.optimizeOperations(), 30 * 60 * 1000);
    
    // Generate new business ideas every hour
    setInterval(() => this.generateNewBusinesses(), 60 * 60 * 1000);
    
    // Initial runs
    setTimeout(() => this.monitorBusinessHealth(), 10000);
    setTimeout(() => this.generateRevenueOpportunities(), 20000);
  }

  /**
   * Monitor health of all businesses
   */
  async monitorBusinessHealth() {
    console.log('🏥 [BUSINESS CENTER] Monitoring business health...');
    
    for (const [businessId, business] of this.activeBusinesses.entries()) {
      try {
        const health = await this.assessBusinessHealth(businessId);
        
        await this.pool.query(
          `UPDATE autonomous_businesses 
           SET health_score = $1, last_health_check = NOW(), updated_at = NOW()
           WHERE business_id = $2`,
          [health.score, businessId]
        );
        
        if (health.score < 50) {
          await this.triggerBusinessIntervention(businessId, health);
        }
      } catch (error) {
        console.error(`❌ [BUSINESS CENTER] Health check error for ${businessId}:`, error.message);
      }
    }
  }

  /**
   * Assess business health
   */
  async assessBusinessHealth(businessId) {
    const business = this.activeBusinesses.get(businessId);
    if (!business) return { score: 0, issues: [] };
    
    const prompt = `Assess the health of this business:
    
Business: ${business.business_name}
Type: ${business.business_type}
Revenue (last 30 days): $${business.revenue_30d || 0}
Costs (last 30 days): $${business.costs_30d || 0}
Customers: ${business.customer_count || 0}
Status: ${business.status}

Rate health from 0-100 and identify issues.
Return JSON: {"score": 0-100, "issues": ["issue1", "issue2"], "recommendations": ["rec1"]}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 1000,
      });
      
      const health = this.parseJSONResponse(response);
      return health || { score: 50, issues: [], recommendations: [] };
    } catch (error) {
      return { score: 50, issues: ['Assessment failed'], recommendations: [] };
    }
  }

  /**
   * Generate revenue opportunities
   */
  async generateRevenueOpportunities() {
    console.log('💰 [BUSINESS CENTER] Generating revenue opportunities...');
    
    const prompt = `Generate 10 immediate revenue opportunities for LifeOS:
    
Focus on:
- Services we can offer NOW
- Products we can create quickly
- Businesses we can duplicate and improve by 10-20%
- Code generation/review services
- Make.com scenario generation
- Game development (for overlay distribution)
- Automation services

For each opportunity, provide:
1. Name
2. Revenue potential ($/month)
3. Time to implement (hours)
4. Required resources
5. Market demand
6. Competitive advantage

Return as JSON array.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });
      
      const opportunities = this.parseJSONResponse(response);
      
      for (const opp of opportunities) {
        await this.storeRevenueOpportunity(opp);
      }
      
      console.log(`✅ [BUSINESS CENTER] Generated ${opportunities.length} opportunities`);
    } catch (error) {
      console.error('❌ [BUSINESS CENTER] Opportunity generation error:', error.message);
    }
  }

  /**
   * Store revenue opportunity
   */
  async storeRevenueOpportunity(opportunity) {
    try {
      await this.pool.query(
        `INSERT INTO revenue_opportunities 
         (opportunity_id, name, revenue_potential, time_to_implement, required_resources,
          market_demand, competitive_advantage, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (opportunity_id) DO NOTHING`,
        [
          `opp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          opportunity.name,
          opportunity.revenuePotential || opportunity.revenue_potential,
          opportunity.timeToImplement || opportunity.time_to_implement,
          JSON.stringify(opportunity.requiredResources || opportunity.required_resources || []),
          opportunity.marketDemand || opportunity.market_demand,
          opportunity.competitiveAdvantage || opportunity.competitive_advantage,
          'pending',
        ]
      );
    } catch (error) {
      console.error('Error storing opportunity:', error.message);
    }
  }

  /**
   * Optimize business operations
   */
  async optimizeOperations() {
    console.log('⚡ [BUSINESS CENTER] Optimizing operations...');
    
    // Analyze performance
    // Identify bottlenecks
    // Suggest improvements
    // Auto-implement safe optimizations
  }

  /**
   * Generate new business ideas
   */
  async generateNewBusinesses() {
    console.log('💡 [BUSINESS CENTER] Generating new business ideas...');
    
    // Use enhanced idea generator
    // Focus on businesses we can start immediately
    // Prioritize by revenue potential
  }

  /**
   * Trigger business intervention
   */
  async triggerBusinessIntervention(businessId, health) {
    console.log(`🚨 [BUSINESS CENTER] Intervention needed for ${businessId}`);
    
    // Analyze issues
    // Generate fix strategies
    // Implement fixes automatically
    // Escalate if needed
  }

  /**
   * Get business dashboard data
   */
  async getDashboard() {
    try {
      const businesses = await this.pool.query(
        `SELECT * FROM autonomous_businesses WHERE status = 'active' ORDER BY revenue_30d DESC`
      );
      
      const opportunities = await this.pool.query(
        `SELECT * FROM revenue_opportunities WHERE status = 'pending' ORDER BY revenue_potential DESC LIMIT 10`
      );
      
      const totalRevenue = businesses.rows.reduce((sum, b) => sum + parseFloat(b.revenue_30d || 0), 0);
      const totalCosts = businesses.rows.reduce((sum, b) => sum + parseFloat(b.costs_30d || 0), 0);
      
      return {
        businesses: businesses.rows,
        opportunities: opportunities.rows,
        metrics: {
          totalBusinesses: businesses.rows.length,
          totalRevenue,
          totalCosts,
          netProfit: totalRevenue - totalCosts,
          avgHealthScore: businesses.rows.reduce((sum, b) => sum + (b.health_score || 50), 0) / businesses.rows.length || 0,
        },
      };
    } catch (error) {
      console.error('Error getting dashboard:', error.message);
      return { businesses: [], opportunities: [], metrics: {} };
    }
  }

  /**
   * Parse JSON from AI response
   */
  parseJSONResponse(response) {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse JSON response:', error.message);
      return null;
    }
  }
}
