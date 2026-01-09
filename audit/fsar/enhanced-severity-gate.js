/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              ENHANCED FSAR SEVERITY GATE                                         ║
 * ║              Intelligent Risk Scoring System                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Enhanced severity scoring for FSAR (Future-State Adversarial Retrospection)
 *
 * Formula: Severity = Likelihood(1-5) × Damage(1-5) × Reversibility(1-3)
 * Maximum possible score: 5 × 5 × 3 = 75
 *
 * Thresholds:
 * - ≥45 = HARD BLOCK (human required, cannot proceed automatically)
 * - 25-44 = SOFT BLOCK (needs mitigation plan before proceeding)
 * - <25 = WARN (log only, can proceed)
 */

import { runFSAR } from './fsar_runner.js';

const SEVERITY_THRESHOLDS = {
  HARD_BLOCK: 45,
  SOFT_BLOCK: 25,
  WARN: 0,
};

const GATE_ACTIONS = {
  HARD_BLOCK: {
    canProceed: false,
    requiresHuman: true,
    requiresMitigation: true,
    description: 'CRITICAL RISK - Human approval required',
  },
  SOFT_BLOCK: {
    canProceed: false,
    requiresHuman: false,
    requiresMitigation: true,
    description: 'HIGH RISK - Mitigation plan required',
  },
  WARN: {
    canProceed: true,
    requiresHuman: false,
    requiresMitigation: false,
    description: 'LOW RISK - Proceed with logging',
  },
};

export class EnhancedFSARGate {
  constructor(pool) {
    this.pool = pool;
    this.gateHistory = [];
  }

  /**
   * Run enhanced FSAR analysis with severity scoring
   * @param {object} proposal - The proposal to evaluate
   * @param {function} callCouncilMember - Function to call AI agents for evaluation
   * @returns {Promise<object>} - FSAR result with enhanced severity scoring
   */
  async evaluate(proposal, callCouncilMember = null) {
    console.log('🛡️ [FSAR GATE] Starting enhanced severity evaluation');

    const startTime = Date.now();

    // Step 1: Run base FSAR analysis
    const proposalText = typeof proposal === 'string' ? proposal : JSON.stringify(proposal);
    const baseFSAR = await runFSAR(proposalText);

    // Step 2: Calculate enhanced severity score
    let severityScore;
    let severityComponents;

    if (callCouncilMember) {
      // Use AI council to evaluate severity components
      severityComponents = await this.evaluateSeverityComponents(proposal, callCouncilMember);
      severityScore = this.calculateSeverityScore(severityComponents);
    } else {
      // Fallback to heuristic scoring
      severityComponents = this.heuristicSeverityEvaluation(proposal, proposalText);
      severityScore = this.calculateSeverityScore(severityComponents);
    }

    // Step 3: Determine gate action
    const gateAction = this.determineGateAction(severityScore);

    // Step 4: Build complete result
    const result = {
      success: true,
      severityScore,
      severityComponents,
      gateAction: gateAction.action,
      canProceed: gateAction.canProceed,
      requiresHuman: gateAction.requiresHuman,
      requiresMitigation: gateAction.requiresMitigation,
      description: gateAction.description,
      baseFSAR: {
        id: baseFSAR.report.id,
        severity: baseFSAR.report.severity,
        risks: baseFSAR.report.risks,
        mitigations: baseFSAR.report.mitigations,
        jsonPath: baseFSAR.jsonPath,
        mdPath: baseFSAR.mdPath,
      },
      recommendation: this.buildRecommendation(severityScore, severityComponents, gateAction),
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Log to database
    await this.logGateEvaluation(proposal, result);

    return result;
  }

  /**
   * Evaluate severity components using AI council
   * Returns: { likelihood, damage, reversibility }
   */
  async evaluateSeverityComponents(proposal, callCouncilMember) {
    const prompt = `Evaluate the risk severity of this proposal across three dimensions:

PROPOSAL:
${JSON.stringify(proposal, null, 2)}

Evaluate:

1. LIKELIHOOD (1-5): How likely is this risk to materialize?
   1 = Very unlikely (< 5% chance)
   2 = Unlikely (5-20% chance)
   3 = Possible (20-50% chance)
   4 = Likely (50-80% chance)
   5 = Very likely (> 80% chance)

2. DAMAGE (1-5): If the risk occurs, how bad is the damage?
   1 = Trivial (minor inconvenience)
   2 = Low (fixable with effort)
   3 = Moderate (significant cost/time to fix)
   4 = High (major disruption, hard to recover)
   5 = Catastrophic (business-ending, irreversible harm)

3. REVERSIBILITY (1-3): Can we undo this decision?
   1 = Fully reversible (can roll back easily)
   2 = Partially reversible (difficult but possible)
   3 = Irreversible (cannot undo once done)

Respond in JSON:
{
  "likelihood": 1-5,
  "likelihood_reasoning": "...",
  "damage": 1-5,
  "damage_reasoning": "...",
  "reversibility": 1-3,
  "reversibility_reasoning": "...",
  "key_risks": ["...", "...", "..."],
  "key_mitigations": ["...", "...", "..."]
}`;

    try {
      // Use DeepSeek (cheap) for initial evaluation
      const response = await callCouncilMember('deepseek', prompt, {
        maxTokens: 1500,
        temperature: 0.5,
      });

      const parsed = this.parseSeverityEvaluation(response);
      console.log(`  🛡️ Severity: L=${parsed.likelihood} D=${parsed.damage} R=${parsed.reversibility}`);

      return parsed;
    } catch (error) {
      console.warn(`AI evaluation failed, using heuristics: ${error.message}`);
      return this.heuristicSeverityEvaluation(proposal, JSON.stringify(proposal));
    }
  }

  /**
   * Fallback heuristic severity evaluation (no AI required)
   */
  heuristicSeverityEvaluation(proposal, proposalText) {
    const lower = proposalText.toLowerCase();

    // Default: moderate risk
    let likelihood = 3;
    let damage = 3;
    let reversibility = 2;

    // High-risk keywords
    const criticalKeywords = ['delete', 'drop', 'irreversible', 'permanent', 'production', 'payment'];
    const hasHighRisk = criticalKeywords.some(kw => lower.includes(kw));

    if (hasHighRisk) {
      likelihood = 4;
      damage = 4;
      reversibility = 3;
    }

    // Data/money keywords
    if (lower.includes('data') && (lower.includes('delete') || lower.includes('loss'))) {
      damage = 5;
      reversibility = 3;
    }

    if (lower.includes('money') || lower.includes('payment') || lower.includes('billing')) {
      likelihood = 4;
      damage = 4;
    }

    // Deployment keywords
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('publish')) {
      reversibility = 2; // Partially reversible
    }

    // Explicit FSAR markers
    if (lower.includes('[fsar_block]')) {
      likelihood = 5;
      damage = 5;
      reversibility = 3;
    }

    return {
      likelihood,
      likelihood_reasoning: 'Heuristic evaluation based on keywords',
      damage,
      damage_reasoning: 'Heuristic evaluation based on keywords',
      reversibility,
      reversibility_reasoning: 'Heuristic evaluation based on keywords',
      key_risks: ['Evaluated heuristically - limited context'],
      key_mitigations: ['Run full AI evaluation for better accuracy'],
    };
  }

  /**
   * Parse severity evaluation response
   */
  parseSeverityEvaluation(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          likelihood: this.clamp(parseInt(parsed.likelihood), 1, 5),
          likelihood_reasoning: parsed.likelihood_reasoning || '',
          damage: this.clamp(parseInt(parsed.damage), 1, 5),
          damage_reasoning: parsed.damage_reasoning || '',
          reversibility: this.clamp(parseInt(parsed.reversibility), 1, 3),
          reversibility_reasoning: parsed.reversibility_reasoning || '',
          key_risks: parsed.key_risks || [],
          key_mitigations: parsed.key_mitigations || [],
        };
      }
    } catch (error) {
      console.warn(`Failed to parse severity evaluation: ${error.message}`);
    }

    // Fallback to defaults
    return {
      likelihood: 3,
      likelihood_reasoning: 'Parse error - defaulted to moderate',
      damage: 3,
      damage_reasoning: 'Parse error - defaulted to moderate',
      reversibility: 2,
      reversibility_reasoning: 'Parse error - defaulted to partially reversible',
      key_risks: [],
      key_mitigations: [],
    };
  }

  /**
   * Calculate severity score: Likelihood × Damage × Reversibility
   * Maximum: 5 × 5 × 3 = 75
   */
  calculateSeverityScore(components) {
    const { likelihood, damage, reversibility } = components;
    return likelihood * damage * reversibility;
  }

  /**
   * Determine gate action based on severity score
   */
  determineGateAction(severityScore) {
    if (severityScore >= SEVERITY_THRESHOLDS.HARD_BLOCK) {
      return {
        action: 'HARD_BLOCK',
        ...GATE_ACTIONS.HARD_BLOCK,
      };
    }

    if (severityScore >= SEVERITY_THRESHOLDS.SOFT_BLOCK) {
      return {
        action: 'SOFT_BLOCK',
        ...GATE_ACTIONS.SOFT_BLOCK,
      };
    }

    return {
      action: 'WARN',
      ...GATE_ACTIONS.WARN,
    };
  }

  /**
   * Build recommendation based on severity analysis
   */
  buildRecommendation(severityScore, components, gateAction) {
    const { likelihood, damage, reversibility, key_mitigations } = components;

    const recommendation = {
      action: gateAction.action,
      severityScore,
      maxScore: 75,
      scorePercentage: ((severityScore / 75) * 100).toFixed(1),
    };

    if (gateAction.action === 'HARD_BLOCK') {
      recommendation.message = `CRITICAL: Severity ${severityScore}/75. Human approval REQUIRED before proceeding.`;
      recommendation.requiredActions = [
        'Obtain explicit human approval',
        'Document decision rationale',
        'Prepare rollback plan',
        ...key_mitigations,
      ];
    } else if (gateAction.action === 'SOFT_BLOCK') {
      recommendation.message = `HIGH RISK: Severity ${severityScore}/75. Mitigation plan required.`;
      recommendation.requiredActions = [
        'Create detailed mitigation plan',
        'Test in sandbox environment first',
        'Prepare monitoring and alerts',
        ...key_mitigations,
      ];
    } else {
      recommendation.message = `LOW RISK: Severity ${severityScore}/75. Proceed with logging.`;
      recommendation.suggestedActions = [
        'Log decision for audit trail',
        'Monitor for unexpected outcomes',
        ...key_mitigations,
      ];
    }

    // Add specific warnings based on components
    recommendation.warnings = [];

    if (likelihood >= 4) {
      recommendation.warnings.push('HIGH LIKELIHOOD: This risk is very likely to occur');
    }

    if (damage >= 4) {
      recommendation.warnings.push('HIGH DAMAGE: This could cause major harm if it occurs');
    }

    if (reversibility === 3) {
      recommendation.warnings.push('IRREVERSIBLE: This decision cannot be undone');
    }

    return recommendation;
  }

  /**
   * Utility: Clamp number to range
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Log gate evaluation to database
   */
  async logGateEvaluation(proposal, result) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO fsar_gate_log
         (proposal_text, severity_score, gate_action, can_proceed, requires_human,
          likelihood, damage, reversibility, recommendation, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          JSON.stringify(proposal).substring(0, 1000),
          result.severityScore,
          result.gateAction,
          result.canProceed,
          result.requiresHuman,
          result.severityComponents.likelihood,
          result.severityComponents.damage,
          result.severityComponents.reversibility,
          JSON.stringify(result.recommendation),
          result.duration,
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (!error.message.includes('does not exist')) {
        console.warn(`Failed to log gate evaluation: ${error.message}`);
      }
    }
  }

  /**
   * Get gate statistics
   */
  async getStats() {
    if (!this.pool) {
      return {
        totalEvaluations: 0,
        hardBlocks: 0,
        softBlocks: 0,
        warnings: 0,
        averageSeverity: 0,
      };
    }

    try {
      const result = await this.pool.query(
        `SELECT
           COUNT(*) as total_evaluations,
           COUNT(*) FILTER (WHERE gate_action = 'HARD_BLOCK') as hard_blocks,
           COUNT(*) FILTER (WHERE gate_action = 'SOFT_BLOCK') as soft_blocks,
           COUNT(*) FILTER (WHERE gate_action = 'WARN') as warnings,
           AVG(severity_score) as average_severity
         FROM fsar_gate_log
         WHERE created_at > NOW() - INTERVAL '30 days'`
      );

      const row = result.rows[0];

      return {
        totalEvaluations: parseInt(row.total_evaluations) || 0,
        hardBlocks: parseInt(row.hard_blocks) || 0,
        softBlocks: parseInt(row.soft_blocks) || 0,
        warnings: parseInt(row.warnings) || 0,
        averageSeverity: parseFloat(row.average_severity) || 0,
      };
    } catch (error) {
      return {
        totalEvaluations: 0,
        hardBlocks: 0,
        softBlocks: 0,
        warnings: 0,
        averageSeverity: 0,
      };
    }
  }

  /**
   * Get severity threshold configuration
   */
  getConfig() {
    return {
      thresholds: SEVERITY_THRESHOLDS,
      actions: GATE_ACTIONS,
      formula: 'Severity = Likelihood(1-5) × Damage(1-5) × Reversibility(1-3)',
      maxScore: 75,
    };
  }
}

export { SEVERITY_THRESHOLDS, GATE_ACTIONS };
