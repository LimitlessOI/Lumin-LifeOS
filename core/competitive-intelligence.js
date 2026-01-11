/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              COMPETITIVE INTELLIGENCE SYSTEM                                    ║
 * ║              Monitors competitors and identifies opportunities                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * CAPABILITIES:
 * - Competitor feature tracking
 * - Technology stack analysis
 * - Pricing strategy monitoring
 * - Market gap identification
 * - Feature comparison
 * - Trend analysis
 *
 * BETTER THAN HUMAN because:
 * - Monitors 24/7 (human: occasional checks)
 * - Tracks all competitors (human: 2-3)
 * - Never misses updates (human overlooks)
 * - Quantifies everything (human estimates)
 */

export class CompetitiveIntelligence {
  constructor(aiCouncil, pool) {
    this.aiCouncil = aiCouncil;
    this.pool = pool;
    this.competitors = new Map();
  }

  /**
   * Add competitor to track
   */
  async addCompetitor(competitorInfo) {
    console.log(`👁️ [INTEL] Adding competitor: ${competitorInfo.name}`);

    const competitor = {
      id: `comp_${Date.now()}`,
      name: competitorInfo.name,
      website: competitorInfo.website,
      category: competitorInfo.category,
      addedAt: new Date().toISOString(),
      features: [],
      techStack: [],
      pricing: {},
    };

    // Initial analysis
    const analysis = await this.analyzeCompetitor(competitor);
    competitor.features = analysis.features;
    competitor.techStack = analysis.techStack;
    competitor.pricing = analysis.pricing;

    this.competitors.set(competitor.id, competitor);

    await this.storeCompetitor(competitor);

    return {
      ok: true,
      competitorId: competitor.id,
      features: competitor.features.length,
      techStack: competitor.techStack.length,
    };
  }

  /**
   * Analyze competitor
   */
  async analyzeCompetitor(competitor) {
    console.log(`🔍 [INTEL] Analyzing competitor: ${competitor.name}`);

    const prompt = `Analyze this competitor and extract intelligence.

COMPETITOR: ${competitor.name}
WEBSITE: ${competitor.website}
CATEGORY: ${competitor.category}

Extract:
1. Key features (list of features they offer)
2. Technology stack (what tech they use)
3. Pricing strategy (pricing tiers if public)
4. Unique selling points
5. Weaknesses or gaps

Be specific and factual based on publicly available information.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);
      return this.parseCompetitorAnalysis(response);
    } catch (error) {
      console.error('Competitor analysis failed:', error.message);
      return {
        features: [],
        techStack: [],
        pricing: {},
        usp: [],
        weaknesses: [],
      };
    }
  }

  /**
   * Parse competitor analysis
   */
  parseCompetitorAnalysis(aiResponse) {
    const analysis = {
      features: [],
      techStack: [],
      pricing: {},
      usp: [],
      weaknesses: [],
    };

    const lines = aiResponse.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.includes('features:')) currentSection = 'features';
      else if (lower.includes('technology') || lower.includes('tech stack')) currentSection = 'techStack';
      else if (lower.includes('pricing')) currentSection = 'pricing';
      else if (lower.includes('unique') || lower.includes('usp')) currentSection = 'usp';
      else if (lower.includes('weakness') || lower.includes('gaps')) currentSection = 'weaknesses';
      else if (line.match(/^[\d\-\*]/) && currentSection) {
        const item = line.replace(/^[\d\-\*\.\s]+/, '').trim();
        if (item && currentSection !== 'pricing') {
          analysis[currentSection].push(item);
        }
      }
    }

    return analysis;
  }

  /**
   * Compare our product with competitor
   */
  async compareWithCompetitor(competitorId, ourFeatures) {
    const competitor = this.competitors.get(competitorId);

    if (!competitor) {
      return { ok: false, error: 'Competitor not found' };
    }

    console.log(`⚖️ [INTEL] Comparing with ${competitor.name}...`);

    const comparison = {
      competitor: competitor.name,
      ourFeatures: ourFeatures.length,
      theirFeatures: competitor.features.length,
      uniqueToUs: [],
      uniqueToThem: [],
      common: [],
      recommendations: [],
    };

    // Find unique features
    for (const ourFeature of ourFeatures) {
      const hasMatch = competitor.features.some(f =>
        this.featuresAreSimilar(ourFeature, f)
      );

      if (hasMatch) {
        comparison.common.push(ourFeature);
      } else {
        comparison.uniqueToUs.push(ourFeature);
      }
    }

    for (const theirFeature of competitor.features) {
      const hasMatch = ourFeatures.some(f =>
        this.featuresAreSimilar(theirFeature, f)
      );

      if (!hasMatch) {
        comparison.uniqueToThem.push(theirFeature);
      }
    }

    // Generate recommendations
    comparison.recommendations = await this.generateRecommendations(comparison);

    await this.storeComparison(comparison);

    return {
      ok: true,
      comparison,
    };
  }

  /**
   * Check if features are similar
   */
  featuresAreSimilar(feature1, feature2) {
    const f1 = feature1.toLowerCase();
    const f2 = feature2.toLowerCase();

    // Simple keyword matching
    const keywords1 = f1.split(/\s+/);
    const keywords2 = f2.split(/\s+/);

    const matchCount = keywords1.filter(k => keywords2.includes(k)).length;

    return matchCount >= Math.min(keywords1.length, keywords2.length) * 0.5;
  }

  /**
   * Generate recommendations based on comparison
   */
  async generateRecommendations(comparison) {
    const recommendations = [];

    // Prioritize features they have but we don't
    if (comparison.uniqueToThem.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'feature_gap',
        recommendation: `Consider adding: ${comparison.uniqueToThem.slice(0, 3).join(', ')}`,
        count: comparison.uniqueToThem.length,
      });
    }

    // Highlight our unique features
    if (comparison.uniqueToUs.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'marketing_opportunity',
        recommendation: `Emphasize our unique features: ${comparison.uniqueToUs.slice(0, 3).join(', ')}`,
        count: comparison.uniqueToUs.length,
      });
    }

    return recommendations;
  }

  /**
   * Identify market gaps
   */
  async identifyMarketGaps(category) {
    console.log(`🔍 [INTEL] Identifying market gaps in: ${category}`);

    const competitorsInCategory = Array.from(this.competitors.values())
      .filter(c => c.category === category);

    if (competitorsInCategory.length === 0) {
      return { ok: false, error: 'No competitors in this category' };
    }

    // Collect all features from all competitors
    const allFeatures = new Set();
    for (const competitor of competitorsInCategory) {
      for (const feature of competitor.features) {
        allFeatures.add(feature.toLowerCase());
      }
    }

    // Use AI to identify gaps
    const prompt = `Analyze these features offered by competitors in ${category}:

FEATURES:
${Array.from(allFeatures).join('\n')}

Identify:
1. Common features everyone has (market expectations)
2. Features only some have (opportunities)
3. Potential gaps (features NO ONE offers yet)
4. Emerging trends

Be specific and actionable.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        gaps: this.parseMarketGaps(response),
        competitorsAnalyzed: competitorsInCategory.length,
      };
    } catch (error) {
      console.error('Market gap analysis failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse market gaps from AI response
   */
  parseMarketGaps(aiResponse) {
    const gaps = {
      commonFeatures: [],
      opportunities: [],
      potentialGaps: [],
      trends: [],
    };

    const lines = aiResponse.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.includes('common features')) currentSection = 'commonFeatures';
      else if (lower.includes('opportunities')) currentSection = 'opportunities';
      else if (lower.includes('gaps')) currentSection = 'potentialGaps';
      else if (lower.includes('trends')) currentSection = 'trends';
      else if (line.match(/^[\d\-\*]/) && currentSection) {
        const item = line.replace(/^[\d\-\*\.\s]+/, '').trim();
        if (item) {
          gaps[currentSection].push(item);
        }
      }
    }

    return gaps;
  }

  /**
   * Analyze competitor pricing
   */
  async analyzePricing(competitorId) {
    const competitor = this.competitors.get(competitorId);

    if (!competitor) {
      return { ok: false, error: 'Competitor not found' };
    }

    console.log(`💰 [INTEL] Analyzing pricing: ${competitor.name}`);

    const prompt = `Analyze the pricing strategy of ${competitor.name}.

CURRENT PRICING DATA:
${JSON.stringify(competitor.pricing, null, 2)}

Provide:
1. Pricing tiers (free, basic, pro, enterprise)
2. Price points
3. Pricing strategy (freemium, subscription, one-time, etc.)
4. Value proposition at each tier
5. Recommendations for competitive pricing

Be specific with numbers if available.`;

    try {
      const response = await this.aiCouncil('deepseek', prompt);

      return {
        ok: true,
        analysis: response,
        competitor: competitor.name,
      };
    } catch (error) {
      console.error('Pricing analysis failed:', error.message);
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  /**
   * Track competitor changes over time
   */
  async trackChanges(competitorId) {
    const competitor = this.competitors.get(competitorId);

    if (!competitor) {
      return { ok: false, error: 'Competitor not found' };
    }

    // Re-analyze competitor
    const newAnalysis = await this.analyzeCompetitor(competitor);

    // Compare with stored data
    const changes = {
      newFeatures: [],
      removedFeatures: [],
      techStackChanges: [],
    };

    // Detect new features
    for (const feature of newAnalysis.features) {
      if (!competitor.features.includes(feature)) {
        changes.newFeatures.push(feature);
      }
    }

    // Detect removed features
    for (const feature of competitor.features) {
      if (!newAnalysis.features.includes(feature)) {
        changes.removedFeatures.push(feature);
      }
    }

    // Update competitor data
    competitor.features = newAnalysis.features;
    competitor.techStack = newAnalysis.techStack;
    competitor.lastUpdated = new Date().toISOString();

    await this.storeCompetitor(competitor);

    if (changes.newFeatures.length > 0 || changes.removedFeatures.length > 0) {
      console.log(`📢 [INTEL] ${competitor.name} changes detected: +${changes.newFeatures.length} features, -${changes.removedFeatures.length} features`);
    }

    return {
      ok: true,
      changes,
      hasChanges: changes.newFeatures.length > 0 || changes.removedFeatures.length > 0,
    };
  }

  /**
   * Store competitor in database
   */
  async storeCompetitor(competitor) {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO competitors
           (competitor_id, name, website, category, features, tech_stack, pricing,
            added_at, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (competitor_id) DO UPDATE SET
           features = $5, tech_stack = $6, pricing = $7, last_updated = $9`,
          [
            competitor.id,
            competitor.name,
            competitor.website,
            competitor.category,
            JSON.stringify(competitor.features),
            JSON.stringify(competitor.techStack),
            JSON.stringify(competitor.pricing),
            competitor.addedAt,
            competitor.lastUpdated || new Date().toISOString(),
          ]
        );
      } catch (err) {
        console.error('Failed to store competitor:', err.message);
      }
    }
  }

  /**
   * Store comparison results
   */
  async storeComparison(comparison) {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO competitive_comparisons
           (competitor_name, our_features, their_features, unique_to_us,
            unique_to_them, recommendations, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            comparison.competitor,
            comparison.ourFeatures,
            comparison.theirFeatures,
            JSON.stringify(comparison.uniqueToUs),
            JSON.stringify(comparison.uniqueToThem),
            JSON.stringify(comparison.recommendations),
          ]
        );
      } catch (err) {
        console.error('Failed to store comparison:', err.message);
      }
    }
  }

  /**
   * Get intelligence statistics
   */
  async getStats() {
    const stats = {
      totalCompetitors: this.competitors.size,
      byCategory: {},
      recentChanges: 0,
    };

    if (this.pool) {
      try {
        const result = await this.pool.query(`
          SELECT
            COUNT(*) as total,
            category,
            COUNT(*) as category_count
          FROM competitors
          GROUP BY category
        `);

        for (const row of result.rows) {
          stats.byCategory[row.category] = parseInt(row.category_count);
        }
      } catch (err) {
        console.error('Failed to get stats:', err.message);
      }
    }

    return stats;
  }
}

// Export
export function createCompetitiveIntelligence(aiCouncil, pool) {
  return new CompetitiveIntelligence(aiCouncil, pool);
}
