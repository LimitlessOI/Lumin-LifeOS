/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    BUSINESS DUPLICATION & IMPROVEMENT SYSTEM                      ║
 * ║                    Duplicate businesses and make them 10-20% better              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class BusinessDuplication {
  constructor(pool, callCouncilMember, modelRouter) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.modelRouter = modelRouter;
  }

  /**
   * Analyze a competitor and create improved version
   */
  async duplicateAndImprove({
    competitorUrl,
    competitorName,
    improvementTarget = 15, // 10-20%
    focusAreas = [], // UX, features, pricing, performance, integrations
  }) {
    console.log(`🔍 [BUSINESS DUPLICATION] Analyzing ${competitorName}...`);

    const prompt = `Analyze this business and create an improved version that is ${improvementTarget}% better:

Competitor: ${competitorName}
URL: ${competitorUrl}
Improvement Target: ${improvementTarget}%
Focus Areas: ${focusAreas.join(', ') || 'all areas'}

Provide:
1. Business model analysis
2. Key features
3. Weaknesses and pain points
4. Improvement opportunities (10-20% better)
5. New features to add
6. UX improvements
7. Pricing strategy
8. Marketing approach
9. Logo/branding suggestions
10. Implementation plan

Return as JSON with all details.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 4000,
      });

      const analysis = this.parseJSONResponse(response);
      const businessId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Store analysis
      await this.storeBusinessAnalysis(businessId, competitorName, competitorUrl, analysis, improvementTarget);

      // Generate logo/script
      const logo = await this.generateLogo(analysis.businessName || `${competitorName} Plus`);
      const script = await this.generateImplementationScript(analysis);

      // Store implementation plan
      await this.storeImplementationPlan(businessId, {
        ...analysis,
        logo,
        script,
      });

      console.log(`✅ [BUSINESS DUPLICATION] Created improved version: ${businessId}`);
      return { businessId, analysis, logo, script };
    } catch (error) {
      console.error('❌ [BUSINESS DUPLICATION] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate logo
   */
  async generateLogo(businessName) {
    const prompt = `Generate a logo design for "${businessName}".

Provide:
1. Logo concept description
2. Color scheme (hex codes)
3. Font suggestions
4. SVG code (if possible)
5. Brand guidelines

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('gemini', prompt, {
        useTwoTier: false,
        maxTokens: 2000,
      });

      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating logo:', error.message);
      return { concept: 'Modern, clean logo', colors: ['#4CAF50', '#2196F3'] };
    }
  }

  /**
   * Generate implementation script
   */
  async generateImplementationScript(analysis) {
    const prompt = `Generate a complete implementation script for this improved business:

${JSON.stringify(analysis, null, 2)}

Provide:
1. Step-by-step implementation plan
2. Code snippets (if applicable)
3. Technology stack
4. Timeline
5. Resource requirements

Return as JSON.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        useTwoTier: false,
        maxTokens: 3000,
      });

      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating script:', error.message);
      return { steps: [], timeline: '2-4 weeks' };
    }
  }

  /**
   * Store business analysis
   */
  async storeBusinessAnalysis(businessId, competitorName, competitorUrl, analysis, improvementTarget) {
    try {
      await this.pool.query(
        `INSERT INTO business_duplications 
         (business_id, competitor_name, competitor_url, analysis_data, improvement_target,
          status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          businessId,
          competitorName,
          competitorUrl,
          JSON.stringify(analysis),
          improvementTarget,
          'analyzed',
        ]
      );
    } catch (error) {
      console.error('Error storing analysis:', error.message);
    }
  }

  /**
   * Store implementation plan
   */
  async storeImplementationPlan(businessId, plan) {
    try {
      await this.pool.query(
        `UPDATE business_duplications 
         SET implementation_plan = $1, logo_data = $2, status = $3, updated_at = NOW()
         WHERE business_id = $4`,
        [
          JSON.stringify(plan.script || plan),
          JSON.stringify(plan.logo),
          'ready',
          businessId,
        ]
      );
    } catch (error) {
      console.error('Error storing plan:', error.message);
    }
  }

  /**
   * Get all duplicated businesses
   */
  async getDuplications(limit = 50) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM business_duplications ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(row => ({
        ...row,
        analysis_data: typeof row.analysis_data === 'string' ? JSON.parse(row.analysis_data) : row.analysis_data,
        implementation_plan: typeof row.implementation_plan === 'string' ? JSON.parse(row.implementation_plan) : row.implementation_plan,
        logo_data: typeof row.logo_data === 'string' ? JSON.parse(row.logo_data) : row.logo_data,
      }));
    } catch (error) {
      console.error('Error getting duplications:', error.message);
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
