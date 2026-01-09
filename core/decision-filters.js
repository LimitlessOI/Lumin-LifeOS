/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              DECISION FILTERS - WISDOM LENSES                                    ║
 * ║              Multi-Perspective Decision Framework                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Apply multiple wisdom lenses to every decision:
 * - Adam (50%): Mission, ethics, BE-DO-HAVE
 * - Ford (10%): Efficiency, scale
 * - Edison (10%): Iteration, persistence
 * - Jesus (10%): Service, truth
 * - Buffett (5%): Long-term thinking
 * - Musk (5%): First principles
 * - Family (10%): Has veto power on major decisions
 *
 * Each lens evaluates the decision from its unique perspective,
 * providing a multi-dimensional view before final approval.
 */

const WISDOM_LENSES = {
  adam: {
    name: 'Adam (Founder)',
    weight: 0.50, // 50% - Primary voice
    focus: 'Mission, ethics, BE-DO-HAVE alignment',
    questions: [
      'Does this align with our mission: Cure all that ails humankind, give freely?',
      'Does this strengthen identity (BE) before action (DO)?',
      'Will this create lasting value (HAVE) or just short-term gain?',
      'Does this respect user sovereignty and consent?',
      'Is this something we can do with integrity?',
    ],
    vetoCapable: true,
  },
  ford: {
    name: 'Henry Ford',
    weight: 0.10, // 10%
    focus: 'Efficiency, scale, systems',
    questions: [
      'Can this scale to 10x our current size?',
      'What inefficiencies does this eliminate?',
      'Does this create a replicable system or one-off solution?',
      'How does this improve our assembly line?',
      'What is the cost per unit at scale?',
    ],
    vetoCapable: false,
  },
  edison: {
    name: 'Thomas Edison',
    weight: 0.10, // 10%
    focus: 'Iteration, persistence, experimentation',
    questions: [
      'What can we learn from this, even if it fails?',
      'Is this an experiment we can run cheaply?',
      'How quickly can we iterate on this?',
      'What 1000 ways NOT to do this have we tried?',
      'Does this build momentum or create drag?',
    ],
    vetoCapable: false,
  },
  jesus: {
    name: 'Jesus of Nazareth',
    weight: 0.10, // 10%
    focus: 'Service, truth, compassion',
    questions: [
      'Does this serve the least among us?',
      'Are we speaking truth, even when costly?',
      'Does this heal or harm?',
      'Would we do this if we gained nothing?',
      'Are we creating genuine value or illusion?',
    ],
    vetoCapable: false,
  },
  buffett: {
    name: 'Warren Buffett',
    weight: 0.05, // 5%
    focus: 'Long-term value, compounding, simplicity',
    questions: [
      'Would I still want to own this in 30 years?',
      'Does this compound in value over time?',
      'Is this within our circle of competence?',
      'What is the intrinsic value vs market price?',
      'Can I explain this to a child?',
    ],
    vetoCapable: false,
  },
  musk: {
    name: 'Elon Musk',
    weight: 0.05, // 5%
    focus: 'First principles, innovation, boldness',
    questions: [
      'What are we assuming that might be wrong?',
      'Can we 10x this instead of 10% improve it?',
      'What would this look like rebuilt from physics?',
      'Are we being bold enough?',
      'What impossible thing becomes possible if this works?',
    ],
    vetoCapable: false,
  },
  family: {
    name: 'Family Council',
    weight: 0.10, // 10%
    focus: 'Relationships, health, sustainability',
    questions: [
      'Would I want my children to work here?',
      'Does this respect work-life balance?',
      'Will I be proud of this in 10 years?',
      'Does this align with family values?',
      'Is this sustainable long-term?',
    ],
    vetoCapable: true, // Family has veto power
  },
};

export class DecisionFilters {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.filterHistory = [];
  }

  /**
   * Apply all wisdom lenses to a decision
   * @param {object} decision - The decision to filter
   * @returns {Promise<object>} - Filtered decision with all perspectives
   */
  async applyFilters(decision) {
    console.log('🔍 [FILTERS] Applying wisdom lenses to decision');

    const filterStart = Date.now();
    const perspectives = {};
    const vetoes = [];

    // Apply each lens
    for (const [key, lens] of Object.entries(WISDOM_LENSES)) {
      try {
        console.log(`  🔍 [${lens.name}] Evaluating (weight: ${(lens.weight * 100).toFixed(0)}%)`);

        const perspective = await this.applyLens(decision, lens);
        perspectives[key] = perspective;

        // Check for veto
        if (lens.vetoCapable && perspective.veto) {
          vetoes.push({
            lens: lens.name,
            reason: perspective.vetoReason,
            severity: perspective.vetoSeverity,
          });
        }

        console.log(`  ✅ [${lens.name}] Score: ${perspective.score}/10`);
      } catch (error) {
        console.error(`  ❌ [${lens.name}] Error: ${error.message}`);
        perspectives[key] = { error: error.message, score: 0 };
      }
    }

    // Calculate weighted score
    const weightedScore = this.calculateWeightedScore(perspectives);

    // Determine if decision passes filters
    const passes = vetoes.length === 0 && weightedScore >= 7.0;

    const result = {
      success: true,
      passes,
      weightedScore,
      perspectives,
      vetoes,
      recommendation: this.buildRecommendation(perspectives, weightedScore, vetoes),
      duration: Date.now() - filterStart,
      timestamp: new Date().toISOString(),
    };

    // Log to database
    await this.logFilterResult(decision, result);

    return result;
  }

  /**
   * Apply a single wisdom lens to the decision
   */
  async applyLens(decision, lens) {
    const prompt = `You are evaluating a decision through the lens of ${lens.name}.

FOCUS: ${lens.focus}

DECISION TO EVALUATE:
${JSON.stringify(decision, null, 2)}

EVALUATION QUESTIONS:
${lens.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Evaluate this decision from ${lens.name}'s perspective.

Respond in JSON:
{
  "score": 0-10,
  "reasoning": "Why this score?",
  "strengths": ["What this decision does well from this lens"],
  "weaknesses": ["What concerns arise from this lens"],
  "recommendations": ["How to improve alignment with this lens"],
  "veto": false,
  "vetoReason": "Only if score < 3 and lens has veto power",
  "vetoSeverity": "low|medium|high|critical"
}`;

    // Use appropriate model tier based on lens importance
    const model = lens.weight >= 0.5 ? 'claude' : 'gpt';

    const response = await this.callCouncilMember(model, prompt, {
      maxTokens: 1000,
      temperature: 0.5,
    });

    return this.parseLensEvaluation(response, lens);
  }

  /**
   * Parse lens evaluation response
   */
  parseLensEvaluation(response, lens) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Auto-veto if score < 3 and lens has veto power
        if (lens.vetoCapable && parsed.score < 3) {
          parsed.veto = true;
          if (!parsed.vetoReason) {
            parsed.vetoReason = `Score ${parsed.score}/10 below minimum threshold`;
          }
        }

        return {
          score: parseFloat(parsed.score) || 0,
          reasoning: parsed.reasoning || '',
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          recommendations: parsed.recommendations || [],
          veto: parsed.veto || false,
          vetoReason: parsed.vetoReason || '',
          vetoSeverity: parsed.vetoSeverity || 'medium',
        };
      }
    } catch (error) {
      console.warn(`Failed to parse lens evaluation: ${error.message}`);
    }

    // Fallback: extract score from text
    const scoreMatch = response.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;

    return {
      score,
      reasoning: response.substring(0, 200),
      strengths: [],
      weaknesses: [],
      recommendations: [],
      veto: false,
      vetoReason: '',
      vetoSeverity: 'low',
    };
  }

  /**
   * Calculate weighted score across all lenses
   */
  calculateWeightedScore(perspectives) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, perspective] of Object.entries(perspectives)) {
      const lens = WISDOM_LENSES[key];
      if (!lens || perspective.error) continue;

      const score = perspective.score || 0;
      weightedSum += score * lens.weight;
      totalWeight += lens.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Build recommendation based on all perspectives
   */
  buildRecommendation(perspectives, weightedScore, vetoes) {
    // If any veto, REJECT
    if (vetoes.length > 0) {
      return {
        decision: 'REJECT',
        reason: `Vetoed by: ${vetoes.map(v => v.lens).join(', ')}`,
        confidence: 1.0,
        vetoes,
      };
    }

    // If weighted score >= 8, APPROVE with high confidence
    if (weightedScore >= 8.0) {
      return {
        decision: 'APPROVE',
        reason: `Strong alignment across all lenses (${weightedScore.toFixed(1)}/10)`,
        confidence: 0.9,
      };
    }

    // If weighted score >= 7, APPROVE with moderate confidence
    if (weightedScore >= 7.0) {
      return {
        decision: 'APPROVE',
        reason: `Good alignment overall (${weightedScore.toFixed(1)}/10)`,
        confidence: 0.7,
        improvements: this.extractTopRecommendations(perspectives),
      };
    }

    // If weighted score 5-7, MODIFY
    if (weightedScore >= 5.0) {
      return {
        decision: 'MODIFY',
        reason: `Mixed alignment (${weightedScore.toFixed(1)}/10) - improvements needed`,
        confidence: 0.6,
        requiredImprovements: this.extractTopRecommendations(perspectives),
      };
    }

    // If weighted score < 5, REJECT
    return {
      decision: 'REJECT',
      reason: `Poor alignment across lenses (${weightedScore.toFixed(1)}/10)`,
      confidence: 0.8,
      concerns: this.extractTopWeaknesses(perspectives),
    };
  }

  /**
   * Extract top recommendations from all perspectives
   */
  extractTopRecommendations(perspectives) {
    const allRecommendations = [];

    for (const [key, perspective] of Object.entries(perspectives)) {
      if (perspective.recommendations && perspective.recommendations.length > 0) {
        const lens = WISDOM_LENSES[key];
        allRecommendations.push({
          lens: lens.name,
          recommendations: perspective.recommendations,
          weight: lens.weight,
        });
      }
    }

    // Sort by lens weight (most important first)
    allRecommendations.sort((a, b) => b.weight - a.weight);

    return allRecommendations.slice(0, 5); // Top 5
  }

  /**
   * Extract top weaknesses from all perspectives
   */
  extractTopWeaknesses(perspectives) {
    const allWeaknesses = [];

    for (const [key, perspective] of Object.entries(perspectives)) {
      if (perspective.weaknesses && perspective.weaknesses.length > 0) {
        const lens = WISDOM_LENSES[key];
        allWeaknesses.push({
          lens: lens.name,
          weaknesses: perspective.weaknesses,
          weight: lens.weight,
        });
      }
    }

    // Sort by lens weight (most important first)
    allWeaknesses.sort((a, b) => b.weight - a.weight);

    return allWeaknesses.slice(0, 5); // Top 5
  }

  /**
   * Apply Adam's lens specifically (highest weight, veto power)
   * Can be called standalone for critical decisions
   */
  async applyAdamLens(decision) {
    console.log('👤 [ADAM LENS] Applying founder perspective');

    const adamLens = WISDOM_LENSES.adam;
    const perspective = await this.applyLens(decision, adamLens);

    return {
      success: true,
      perspective,
      passes: perspective.score >= 7.0 && !perspective.veto,
      recommendation: perspective.veto
        ? 'REJECT'
        : perspective.score >= 7.0
        ? 'APPROVE'
        : 'MODIFY',
    };
  }

  /**
   * Log filter result to database
   */
  async logFilterResult(decision, result) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO decision_filter_log
         (decision_text, weighted_score, passes, perspectives, vetoes, recommendation, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          JSON.stringify(decision).substring(0, 1000),
          result.weightedScore,
          result.passes,
          JSON.stringify(result.perspectives),
          JSON.stringify(result.vetoes),
          JSON.stringify(result.recommendation),
          result.duration,
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (!error.message.includes('does not exist')) {
        console.warn(`Failed to log filter result: ${error.message}`);
      }
    }
  }

  /**
   * Get filter statistics
   */
  async getStats() {
    if (!this.pool) {
      return {
        totalDecisions: 0,
        approvalRate: 0,
        vetoRate: 0,
        averageScore: 0,
      };
    }

    try {
      const result = await this.pool.query(
        `SELECT
           COUNT(*) as total_decisions,
           AVG(weighted_score) as average_score,
           COUNT(*) FILTER (WHERE passes = true) as approved,
           COUNT(*) FILTER (WHERE vetoes != '[]'::jsonb) as vetoed
         FROM decision_filter_log
         WHERE created_at > NOW() - INTERVAL '30 days'`
      );

      const row = result.rows[0];
      const total = parseInt(row.total_decisions) || 0;

      return {
        totalDecisions: total,
        approvalRate: total > 0 ? (parseInt(row.approved) / total) * 100 : 0,
        vetoRate: total > 0 ? (parseInt(row.vetoed) / total) * 100 : 0,
        averageScore: parseFloat(row.average_score) || 0,
      };
    } catch (error) {
      return {
        totalDecisions: 0,
        approvalRate: 0,
        vetoRate: 0,
        averageScore: 0,
      };
    }
  }

  /**
   * Get lens configuration
   */
  getLensConfig() {
    return {
      lenses: Object.entries(WISDOM_LENSES).map(([key, lens]) => ({
        key,
        name: lens.name,
        weight: lens.weight,
        focus: lens.focus,
        vetoCapable: lens.vetoCapable,
        questions: lens.questions,
      })),
      totalWeight: Object.values(WISDOM_LENSES).reduce((sum, lens) => sum + lens.weight, 0),
    };
  }
}

export { WISDOM_LENSES };
