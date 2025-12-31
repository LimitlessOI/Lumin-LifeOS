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

CRITICAL: Return ONLY valid JSON array. No text before or after. Start with [ and end with ].`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });
      
      const opportunities = this.parseJSONResponse(response);
      
      // Ensure it's an array
      const oppArray = Array.isArray(opportunities) ? opportunities : [];
      
      if (oppArray.length === 0) {
        console.warn('⚠️ [BUSINESS CENTER] No opportunities parsed from response');
        return;
      }
      
      for (const opp of oppArray) {
        await this.storeRevenueOpportunity(opp);
      }
      
      console.log(`✅ [BUSINESS CENTER] Generated ${oppArray.length} opportunities`);
    } catch (error) {
      console.error('❌ [BUSINESS CENTER] Opportunity generation error:', error.message);
    }
  }

  /**
   * Store revenue opportunity
   */
  async storeRevenueOpportunity(opportunity) {
    try {
      // Validate required fields before INSERT
      if (!opportunity.name || !opportunity.name.trim()) {
        console.warn('⚠️ [BUSINESS CENTER] Skipping opportunity with no name');
        return;
      }
      
      await this.pool.query(
        `INSERT INTO revenue_opportunities 
         (opportunity_id, name, revenue_potential, time_to_implement, required_resources,
          market_demand, competitive_advantage, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (opportunity_id) DO NOTHING`,
        [
          `opp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          opportunity.name.trim(),
          opportunity.revenuePotential || opportunity.revenue_potential,
          opportunity.timeToImplement || opportunity.time_to_implement,
          JSON.stringify(opportunity.requiredResources || opportunity.required_resources || []),
          opportunity.marketDemand || opportunity.market_demand,
          opportunity.competitiveAdvantage || opportunity.competitive_advantage,
          'pending',
        ]
      );
    } catch (error) {
      console.error('❌ [BUSINESS CENTER] Error storing opportunity:', error.message);
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
   * Parse JSON from AI response (with enhanced sanitization and multiple strategies)
   */
  parseJSONResponse(response) {
    if (!response || typeof response !== 'string') {
      console.warn('⚠️ [BUSINESS CENTER] Invalid response for JSON parsing');
      return [];
    }

    try {
      // Sanitize JSON to remove comments and trailing commas
      let cleaned = response
        .replace(/\/\/.*$/gm, '')           // Remove // comments
        .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove /* */ comments
        .replace(/,(\s*[}\]])/g, '$1')      // Remove trailing commas
        .replace(/```json\s*/gi, '')         // Remove ```json
        .replace(/```\s*/g, '')              // Remove ```
        .trim();
      
      // Strategy 1: Try to extract JSON array first (most common)
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            console.log(`✅ [BUSINESS CENTER] Parsed ${parsed.length} opportunities from JSON array`);
            return parsed;
          }
        } catch (e) {
          console.warn(`⚠️ [BUSINESS CENTER] Array extraction failed: ${e.message}`);
        }
      }
      
      // Strategy 2: Try to extract JSON object (might be wrapped)
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const parsed = JSON.parse(objMatch[0]);
          // If it's an object with an array property, extract it
          if (parsed.opportunities && Array.isArray(parsed.opportunities)) {
            console.log(`✅ [BUSINESS CENTER] Parsed ${parsed.opportunities.length} opportunities from object`);
            return parsed.opportunities;
          }
          // If it's a single opportunity object, wrap in array
          if (parsed.name || parsed.revenue_potential) {
            console.log(`✅ [BUSINESS CENTER] Parsed single opportunity, wrapping in array`);
            return [parsed];
          }
        } catch (e) {
          console.warn(`⚠️ [BUSINESS CENTER] Object extraction failed: ${e.message}`);
        }
      }
      
      // Strategy 3: Try parsing entire cleaned response
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // Wrap single object in array
        return [parsed];
      } catch (e) {
        console.warn(`⚠️ [BUSINESS CENTER] Full response parsing failed: ${e.message}`);
      }
      
      // Strategy 4: Last resort - return empty array
      console.warn('⚠️ [BUSINESS CENTER] All JSON parsing strategies failed, returning empty array');
      console.warn(`⚠️ [BUSINESS CENTER] Response preview: ${response.substring(0, 500)}...`);
      return [];
    } catch (error) {
      console.error('❌ [BUSINESS CENTER] JSON parsing error:', error.message);
      return [];
    }
  }
}
