/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AUTONOMOUS BUSINESS CENTER                                      ║
 * ║                    Fully automated business management and operations            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

const DEFAULT_UPLIFT_THRESHOLD = Number(process.env.BUSINESS_UPLIFT_THRESHOLD || 1.1);
const LABOR_RATE_PER_HOUR = Number(process.env.LABOR_RATE_PER_HOUR || 80);
const DEFAULT_IDEA_BATCH_SIZE = Number(process.env.BUSINESS_IDEA_BATCH_SIZE || 25);

export class BusinessCenter {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
    this.activeBusinesses = new Map();
    this.revenueStreams = [];
  }

  static sanitizeNumeric(value, { min = null, max = null } = {}) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (min != null && value < min) return min;
      if (max != null && value > max) return max;
      return value;
    }
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[^0-9.-]/g, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return null;
    if (min != null && parsed < min) return min;
    if (max != null && parsed > max) return max;
    return parsed;
  }

  static sanitizeRevenue(value) {
    return this.sanitizeNumeric(value, { min: 0, max: 10_000_000 });
  }

  static sanitizeDuration(value) {
    return this.sanitizeNumeric(value, { min: 0.5, max: 200 });
  }

  static logSanitization(field, raw, sanitized) {
    if (raw && sanitized != null && raw.toString().trim() && raw.toString().trim() !== sanitized.toString()) {
      console.log(`ℹ️ [BUSINESS CENTER] Sanitized ${field}: ${raw} → ${sanitized}`);
    }
  }

  static buildIdeaPrompt(focus, count, improvementTarget) {
    return `Generate ${count} detailed, revenue-focused business ideas for LifeOS with the core focus on "${focus}".
Each idea must include:
- title
- 1 sentence summary
- revenue potential ($/month)
- time to implement (hours)
- proof that it is at least ${improvementTarget}% better than current competitors (describe metric)
- improvement levers (how it wins)
- difficulty rating (easy/medium/hard)

Respond with a strict JSON array, where each entry looks like:
{
  "title": "Short idea title",
  "summary": "Why this works",
  "revenuePotential": "$12,000/month",
  "timeToImplement": "8",
  "proof": [
    { "type": "human_confirm", "value": "Outlined plan" }
  ],
  "focus": focus,
  "difficulty": "medium",
  "impact": "high"
}

Start with [ and end with ]. No prose before or after.`;
  }

  static normalizeIdeaPayload(raw) {
    const idea = raw || {};
    const normalized = {
      title: (idea.title || idea.name || idea.idea_title || '').trim(),
      description: (idea.summary || idea.description || idea.details || '').trim(),
      difficulty: (idea.difficulty || idea.level || 'medium').toLowerCase(),
      impact: (idea.impact || idea.impact_level || 'medium').toLowerCase(),
      revenuePotential: idea.revenuePotential || idea.revenue_potential || idea.revenue || null,
      timeToImplement: idea.timeToImplement || idea.time_to_implement || idea.time || null,
      proof: Array.isArray(idea.proof) ? idea.proof : idea.evidence ? Array.isArray(idea.evidence) ? idea.evidence : [idea.evidence] : [{ type: 'human_confirm', value: 'Generated idea' }],
    };
    return normalized;
  }

  static generateFallbackIdeas(focus, count) {
    const templates = [
      {
        title: "Conversion-First Homepage",
        summary: "Rebuild the hero/copy to highlight proof, offer a booking CTA, and add trust badges.",
        proof: [{ type: "human_confirm", value: "Fallback hero redesign plan" }],
        revenuePotential: "$15,000/month",
        timeToImplement: "12",
        difficulty: "easy",
        impact: "high",
      },
      {
        title: "Authority Content Cluster",
        summary: "Build a content hub (blogs, FAQs) around midwife/parenting keywords so you own the niche.",
        proof: [{ type: "human_confirm", value: "Fallback content map" }],
        revenuePotential: "$10,000/month",
        timeToImplement: "18",
        difficulty: "medium",
        impact: "medium",
      },
      {
        title: "Personalized Booking Flow",
        summary: "Add a segmented booking path (pregnancy stage, service type) with instant availability.",
        proof: [{ type: "human_confirm", value: "Fallback booking flow" }],
        revenuePotential: "$12,000/month",
        timeToImplement: "10",
        difficulty: "easy",
        impact: "high",
      },
      {
        title: "Client Testimonial Highlight",
        summary: "Turn current testimonials into dynamic proof (video, slider, ROI metrics).",
        proof: [{ type: "human_confirm", value: "Fallback testimonial plan" }],
        revenuePotential: "$8,000/month",
        timeToImplement: "6",
        difficulty: "easy",
        impact: "medium",
      },
    ];

    const ideas = [];
    for (let i = 0; i < count; i += 1) {
      const template = templates[i % templates.length];
      ideas.push({
        ...template,
        title: `${template.title} ${i + 1}`,
        summary: `${template.summary} (Fallback focus: ${focus}).`,
      });
    }

    return ideas;
  }

  static calculateRoi(revenue, timeHours, hourlyRate = LABOR_RATE_PER_HOUR) {
    if (!revenue || !timeHours) return null;
    const cost = timeHours * hourlyRate;
    if (cost <= 0) return null;
    return Number((revenue / cost).toFixed(4));
  }

  static async getBaselineRatio(pool) {
    try {
      const result = await pool.query(
        `SELECT revenue_potential, time_to_implement
         FROM revenue_opportunities
         WHERE revenue_potential IS NOT NULL AND time_to_implement > 0
         AND status = 'closed'
         ORDER BY revenue_potential::float / time_to_implement DESC
         LIMIT 1`
      );
      if (!result.rows.length) return null;
      const { revenue_potential, time_to_implement } = result.rows[0];
      if (!time_to_implement) return null;
      return Number((revenue_potential / time_to_implement).toFixed(4));
    } catch (error) {
      console.warn('⚠️ [BUSINESS CENTER] Baseline ratio fetch failed:', error.message);
      return null;
    }
  }

  static requiresImprovement(candidateRatio, baselineRatio, threshold = DEFAULT_UPLIFT_THRESHOLD) {
    if (!baselineRatio) return true;
    return candidateRatio >= baselineRatio * threshold;
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
    
    const prompt = `Generate 10 immediate revenue opportunities for LifeOS.

Focus on: services we can offer NOW, automation, code generation/review, AI workflows, game distribution.

Return ONLY a valid JSON array using EXACTLY these field names:
[
  {
    "name": "opportunity name",
    "revenuePotential": 5000,
    "timeToImplement": 8,
    "requiredResources": "what is needed",
    "marketDemand": "high/medium/low",
    "competitiveAdvantage": "why we win"
  }
]

No text before or after. No markdown. Start with [ and end with ].`;

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
      // Normalize field names — models return different keys despite exact-schema instructions
      const name = opportunity.name
        || opportunity.title
        || opportunity.opportunity_name
        || opportunity.service
        || opportunity.service_name
        || opportunity.opportunityName
        || opportunity.label
        || '';

      if (!name || !name.trim()) {
        console.warn('⚠️ [BUSINESS CENTER] Skipping opportunity with no name', JSON.stringify(Object.keys(opportunity)));
        return;
      }
      opportunity.name = name; // normalize for the rest of this function

      const revenueRaw = opportunity.revenuePotential || opportunity.revenue_potential
        || opportunity.monthlyRevenue || opportunity.monthly_revenue
        || opportunity.revenue;
      const revenueValue = BusinessCenter.sanitizeRevenue(revenueRaw);
      BusinessCenter.logSanitization('revenue_potential', revenueRaw, revenueValue);
      if (revenueValue == null) {
        console.warn('⚠️ [BUSINESS CENTER] Skipping opportunity with invalid revenue value', revenueRaw);
        return;
      }

      const timeRaw = opportunity.timeToImplement || opportunity.time_to_implement
        || opportunity.implementationTime || opportunity.hours || opportunity.hoursToImplement;
      const timeValue = BusinessCenter.sanitizeDuration(timeRaw) ?? 1;
      BusinessCenter.logSanitization('time_to_implement', timeRaw, timeValue);

      const requiredResources = opportunity.requiredResources || opportunity.required_resources
        || opportunity.resources || opportunity.requirements || [];
      const resourcesPayload = JSON.stringify(requiredResources).slice(0, 2048);
      const marketDemand = (opportunity.marketDemand || opportunity.market_demand
        || opportunity.demand || '').toString().slice(0, 256);
      const competitive = (opportunity.competitiveAdvantage || opportunity.competitive_advantage
        || opportunity.advantage || opportunity.differentiator || '').toString().slice(0, 256);

      const baselineRatio = await BusinessCenter.getBaselineRatio(this.pool);
      const candidateRatio = revenueValue / timeValue;
      const improvementPct = baselineRatio
        ? ((candidateRatio / baselineRatio - 1) * 100).toFixed(2)
        : 100;
      if (!BusinessCenter.requiresImprovement(candidateRatio, baselineRatio)) {
        console.warn(
          '⚠️ [BUSINESS CENTER] Opportunity skipped, needs >=10% improvement over baseline ratio',
          `baseline=${baselineRatio?.toFixed(4) || 'n/a'}`,
          `candidate=${candidateRatio.toFixed(4)}`
        );
        return;
      }

      const roiScore = BusinessCenter.calculateRoi(revenueValue, timeValue);

      const generatedId = `opp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.pool.query(
        `INSERT INTO revenue_opportunities 
         (opportunity_id, name, revenue_potential, time_to_implement, required_resources,
          market_demand, competitive_advantage, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (opportunity_id) DO NOTHING`,
        [
          generatedId,
          opportunity.name.trim(),
          revenueValue,
          timeValue,
          resourcesPayload,
          marketDemand,
          competitive,
          'pending',
        ]
      );

      if (roiScore != null) {
        await this.pool.query(
          `UPDATE revenue_opportunities SET roi_score = $1, improvement_pct = $2
           WHERE opportunity_id = $3`,
          [roiScore, Number(improvementPct), generatedId]
        );
      }
    } catch (error) {
      console.error('❌ [BUSINESS CENTER] Error storing opportunity:', error.message);
    }
  }

  /**
   * Generate a focused idea batch for a specific business focus
   */
  async generateIdeaBatch({ focus, targetImprovement = 10, count = DEFAULT_IDEA_BATCH_SIZE } = {}) {
    if (!focus || typeof focus !== 'string' || !focus.trim()) {
      throw new Error('Focus is required for idea batch generation');
    }

    const ideaPrompt = BusinessCenter.buildIdeaPrompt(focus, count, targetImprovement);
    const response = await this.callCouncilMember('chatgpt', ideaPrompt, {
      maxTokens: 4000,
      useTwoTier: false,
    });

    const rawIdeas = this.parseJSONResponse(response);
    const buildingIdeas = (Array.isArray(rawIdeas) ? rawIdeas : [])
      .map(BusinessCenter.normalizeIdeaPayload)
      .filter((idea) => idea.title);

    let ideas = buildingIdeas;
    if (ideas.length === 0) {
      console.warn('⚠️ [BUSINESS CENTER] No ideas parsed from council response - using fallback templates');
      ideas = BusinessCenter.generateFallbackIdeas(focus, count);
    }

    const batchIdBase = focus.replace(/[^\w]+/g, '_').toLowerCase() || 'focus';
    const batchId = `batch_${batchIdBase}_${Date.now()}`;

    await this.persistIdeaBatch(batchId, focus, targetImprovement, ideas.slice(0, count));

    const stored = await this.getIdeaBatch(batchId, count);
    return {
      batchId,
      focus,
      targetImprovement,
      totalIdeas: stored.length,
      ideas: stored,
    };
  }

  async persistIdeaBatch(batchId, focus, targetImprovement, ideas) {
    if (!ideas || !ideas.length) return;

    const baselineRatio = (await BusinessCenter.getBaselineRatio(this.pool)) || null;

    await this.pool.query(
      `INSERT INTO idea_batches (batch_id, focus, target_improvement, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (batch_id) DO NOTHING`,
      [batchId, focus, targetImprovement]
    );

    let order = 1;
    for (const idea of ideas) {
      const revenueValue = BusinessCenter.sanitizeRevenue(idea.revenuePotential);
      const timeValue = BusinessCenter.sanitizeDuration(idea.timeToImplement) || 1;
      BusinessCenter.logSanitization('idea.revenuePotential', idea.revenuePotential, revenueValue);
      BusinessCenter.logSanitization('idea.timeToImplement', idea.timeToImplement, timeValue);

      const candidateRatio =
        revenueValue != null && timeValue > 0 ? revenueValue / timeValue : null;

      const improvementPct =
        candidateRatio != null && baselineRatio
          ? Number((((candidateRatio / baselineRatio - 1) * 100) || 0).toFixed(2))
          : null;

      const roiScore = BusinessCenter.calculateRoi(revenueValue, timeValue);
      const metrics = {
        candidateRatio,
        baselineRatio,
        roiScore,
      };

      const status =
        improvementPct != null && improvementPct >= targetImprovement ? 'ready' : 'needs_work';

      await this.pool.query(
        `INSERT INTO idea_batch_items
         (batch_id, idea_order, idea_title, idea_description, difficulty, impact,
          revenue_potential, time_to_implement, improvement_pct, proof, status, metrics, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
        [
          batchId,
          order,
          idea.title,
          idea.description,
          idea.difficulty,
          idea.impact,
          revenueValue,
          timeValue,
          improvementPct,
          JSON.stringify(idea.proof),
          status,
          JSON.stringify(metrics),
        ]
      );

      order += 1;
    }
  }

  async getIdeaBatch(batchId, limit = DEFAULT_IDEA_BATCH_SIZE) {
    if (!batchId) return [];

    const result = await this.pool.query(
      `SELECT batch_id, idea_order, idea_title, idea_description, difficulty, impact,
              revenue_potential, time_to_implement, improvement_pct, proof, status, metrics, created_at
       FROM idea_batch_items
       WHERE batch_id = $1
       ORDER BY idea_order ASC
       LIMIT $2`,
      [batchId, limit]
    );

    const safeParse = (value, fallback) => {
      if (!value) return fallback;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return value;
    };

    return result.rows.map((row) => ({
      ...row,
      proof: safeParse(row.proof, []),
      metrics: safeParse(row.metrics, {}),
    }));
  }

  async listIdeaBatches(limit = 10) {
    const result = await this.pool.query(
      `SELECT batch_id, focus, target_improvement, created_at
       FROM idea_batches
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
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
      
      // Strategy 2.5: Partial array recovery — token limit cuts JSON mid-stream
      // Extract every complete {...} object from a truncated array
      if (cleaned.includes('[')) {
        try {
          const objectMatches = [...cleaned.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g)];
          const salvaged = objectMatches
            .map((m) => { try { return JSON.parse(m[0]); } catch { return null; } })
            .filter(Boolean)
            .filter((o) => o.name || o.title || o.opportunity_name);
          if (salvaged.length > 0) {
            console.log(`✅ [BUSINESS CENTER] Salvaged ${salvaged.length} opportunities from truncated JSON`);
            return salvaged;
          }
        } catch { /* fall through */ }
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
