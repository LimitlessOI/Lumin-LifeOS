/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║          ENHANCED CONSENSUS PROTOCOL - Unintended Consequences Filter             ║
 * ║          Impact Analysis, Tool Evaluation, Better Implementation                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class EnhancedConsensusProtocol {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
  }

  /**
   * Enhanced consensus with unintended consequences filter
   */
  async conductEnhancedConsensus(proposalId, options = {}) {
    const {
      checkUnintendedConsequences = true,
      analyzeImpact = true,
      evaluateTools = true,
      suggestBetterImplementation = true,
    } = options;

    try {
      // Get proposal
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        return { ok: false, error: 'Proposal not found' };
      }

      // 1. UNINTENDED CONSEQUENCES ANALYSIS
      let consequences = null;
      if (checkUnintendedConsequences) {
        consequences = await this.analyzeUnintendedConsequences(proposal);
      }

      // 2. IMPACT ANALYSIS
      let impact = null;
      if (analyzeImpact) {
        impact = await this.analyzeImpact(proposal);
      }

      // 3. TOOL EVALUATION
      let toolEvaluation = null;
      if (evaluateTools && proposal.tools) {
        toolEvaluation = await this.evaluateTools(proposal);
      }

      // 4. BETTER IMPLEMENTATION SUGGESTIONS
      let betterImplementation = null;
      if (suggestBetterImplementation) {
        betterImplementation = await this.suggestBetterImplementation(proposal, {
          consequences,
          impact,
          toolEvaluation
        });
      }

      // 5. FINAL DECISION WITH ALL FACTORS
      const decision = await this.makeDecision(proposal, {
        consequences,
        impact,
        toolEvaluation,
        betterImplementation
      });

      // 6. STORE ANALYSIS
      await this.storeAnalysis(proposalId, {
        consequences,
        impact,
        toolEvaluation,
        betterImplementation,
        decision
      });

      return {
        ok: true,
        proposal,
        analysis: {
          consequences,
          impact,
          toolEvaluation,
          betterImplementation
        },
        decision
      };
    } catch (error) {
      console.error('Enhanced consensus error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Analyze unintended consequences
   */
  async analyzeUnintendedConsequences(proposal) {
    const prompt = `Analyze this proposal for UNINTENDED CONSEQUENCES:

Title: ${proposal.title}
Description: ${proposal.description}

Consider:
1. How will this affect system stability?
2. How will this affect our goals and mission?
3. What could break or fail?
4. What dependencies might be affected?
5. What are the hidden costs (time, money, complexity)?
6. What are the risks we're not seeing?
7. What could go wrong in production?
8. How does this interact with existing systems?

Provide:
- Critical risks (must address)
- Moderate risks (should address)
- Minor risks (nice to address)
- Blind spots (things we might be missing)

Format as JSON with categories and specific risks.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 2000,
        temperature: 0.7
      });

      // Parse response (handle both JSON and text)
      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch {
        // Extract JSON from text if needed
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          analysis = { text: response, parsed: false };
        }
      }

      return {
        analysis,
        riskLevel: this.calculateRiskLevel(analysis),
        criticalRisks: analysis.criticalRisks || [],
        recommendations: analysis.recommendations || []
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Analyze impact on system, goals, mission, stability
   */
  async analyzeImpact(proposal) {
    const prompt = `Analyze the IMPACT of this proposal:

Title: ${proposal.title}
Description: ${proposal.description}

Evaluate impact on:

1. SYSTEM STABILITY:
   - Will this make the system more or less stable?
   - What could break?
   - How does this affect existing functionality?

2. OUR GOALS:
   - How does this align with our primary goals?
   - Does this help or hinder goal achievement?
   - What goals does this support?

3. OUR MISSION:
   - How does this serve our mission?
   - Does this advance or distract from mission?
   - What mission aspects does this address?

4. PROFITABILITY:
   - Revenue impact (immediate and long-term)
   - Cost impact (development and ongoing)
   - ROI potential
   - Time to value

5. SCALABILITY:
   - Can this scale?
   - What are scaling limitations?
   - How does this affect system scalability?

Provide:
- Impact score (1-10) for each category
- Overall impact assessment
- Alignment with goals/mission
- Profitability analysis

Format as structured analysis.`;

    try {
      const response = await this.callCouncilMember('gemini', prompt, {
        maxTokens: 2000,
        temperature: 0.6
      });

      let impact;
      try {
        impact = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        impact = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: response };
      }

      return {
        impact,
        overallScore: this.calculateImpactScore(impact),
        recommendation: this.getImpactRecommendation(impact)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Evaluate tools (cost vs value, can we remake it?)
   */
  async evaluateTools(proposal) {
    const tools = proposal.tools || [];
    const evaluations = [];

    for (const tool of tools) {
      const prompt = `Evaluate this tool for our system:

Tool: ${tool.name || tool}
Cost: ${tool.cost || 'Unknown'}
Description: ${tool.description || 'N/A'}

Evaluate:
1. VALUE TO SYSTEM:
   - What problem does this solve?
   - How critical is this problem?
   - What's the value if we solve it?

2. COST ANALYSIS:
   - Is the cost justified?
   - What's the ROI?
   - Ongoing costs vs one-time?

3. CAN WE BUILD IT OURSELVES?
   - How complex is it to build?
   - How long would it take?
   - What resources needed?
   - Should we build it ourselves?

4. ALTERNATIVES:
   - Are there free/open-source alternatives?
   - Can we use existing tools?
   - Can we combine existing tools?

5. RECOMMENDATION:
   - Buy, Build, or Alternative?
   - Why?

Provide structured evaluation.`;

      try {
        const response = await this.callCouncilMember('deepseek', prompt, {
          maxTokens: 1500,
          temperature: 0.5
        });

        let evaluation;
        try {
          evaluation = JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: response };
        }

        evaluations.push({
          tool: tool.name || tool,
          evaluation,
          recommendation: evaluation.recommendation || 'Evaluate further'
        });
      } catch (error) {
        evaluations.push({
          tool: tool.name || tool,
          error: error.message
        });
      }
    }

    return {
      evaluations,
      overallRecommendation: this.getToolRecommendation(evaluations)
    };
  }

  /**
   * Suggest better/smoother implementation
   */
  async suggestBetterImplementation(proposal, context = {}) {
    const prompt = `Suggest a BETTER, SMOOTHER implementation for this proposal:

Title: ${proposal.title}
Description: ${proposal.description}

Context:
${context.consequences ? `Unintended Consequences: ${JSON.stringify(context.consequences, null, 2)}` : ''}
${context.impact ? `Impact Analysis: ${JSON.stringify(context.impact, null, 2)}` : ''}
${context.toolEvaluation ? `Tool Evaluation: ${JSON.stringify(context.toolEvaluation, null, 2)}` : ''}

Suggest:
1. BETTER APPROACH:
   - How can this be done more efficiently?
   - How can this be done more reliably?
   - How can this be done with less risk?

2. SMOOTHER IMPLEMENTATION:
   - What's the easiest path?
   - What's the fastest path?
   - What's the safest path?

3. IMPROVEMENTS:
   - What can be improved?
   - What can be simplified?
   - What can be optimized?

4. STEP-BY-STEP PLAN:
   - Phased approach
   - Risk mitigation
   - Testing strategy

Provide actionable, specific suggestions.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 3000,
        temperature: 0.4
      });

      return {
        suggestions: response,
        actionable: this.extractActionableItems(response)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Make final decision with all factors
   */
  async makeDecision(proposal, analysis) {
    const prompt = `Make a DECISION on this proposal considering ALL factors:

Proposal:
Title: ${proposal.title}
Description: ${proposal.description}

Analysis:
${JSON.stringify(analysis, null, 2)}

Decision Criteria:
1. Risk vs Reward
2. Alignment with goals/mission
3. Impact on system stability
4. Profitability potential
5. Implementation feasibility
6. Tool costs vs building ourselves

Provide:
- Decision: APPROVE, REJECT, or DEFER
- Confidence level (1-10)
- Reasoning
- Conditions (if any)
- Priority level (A1, A2, B1, B2, C1, etc.)

Format as structured decision.`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt, {
        maxTokens: 1500,
        temperature: 0.3
      });

      let decision;
      try {
        decision = JSON.parse(response);
      } catch {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: response };
      }

      return {
        decision: decision.decision || 'DEFER',
        confidence: decision.confidence || 5,
        reasoning: decision.reasoning || response,
        conditions: decision.conditions || [],
        priority: decision.priority || 'C1'
      };
    } catch (error) {
      return {
        decision: 'DEFER',
        error: error.message
      };
    }
  }

  /**
   * Helper methods
   */
  calculateRiskLevel(analysis) {
    if (!analysis.criticalRisks) return 'low';
    if (analysis.criticalRisks.length > 3) return 'high';
    if (analysis.criticalRisks.length > 0) return 'medium';
    return 'low';
  }

  calculateImpactScore(impact) {
    if (!impact || typeof impact !== 'object') return 5;
    
    const scores = [
      impact.systemStability || 5,
      impact.goalsAlignment || 5,
      impact.missionAlignment || 5,
      impact.profitability || 5,
      impact.scalability || 5
    ];

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  getImpactRecommendation(impact) {
    const score = this.calculateImpactScore(impact);
    if (score >= 8) return 'high_priority';
    if (score >= 6) return 'medium_priority';
    if (score >= 4) return 'low_priority';
    return 'reconsider';
  }

  getToolRecommendation(evaluations) {
    const recommendations = evaluations.map(e => e.evaluation?.recommendation || 'evaluate');
    const buyCount = recommendations.filter(r => r.toLowerCase().includes('buy')).length;
    const buildCount = recommendations.filter(r => r.toLowerCase().includes('build')).length;
    
    if (buildCount > buyCount) return 'build_ourselves';
    if (buyCount > buildCount) return 'buy_tools';
    return 'evaluate_each';
  }

  extractActionableItems(text) {
    // Extract actionable items from text
    const items = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[-*•]\s+|^\d+\.\s+|^-\s+/)) {
        items.push(line.replace(/^[-*•\d.\s]+/, '').trim());
      }
    }
    
    return items;
  }

  async getProposal(proposalId) {
    const result = await this.pool.query(
      'SELECT * FROM proposals WHERE id = $1',
      [proposalId]
    );
    return result.rows[0] || null;
  }

  async storeAnalysis(proposalId, analysis) {
    await this.pool.query(
      `INSERT INTO proposal_analysis 
       (proposal_id, consequences, impact, tool_evaluation, better_implementation, decision, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (proposal_id) 
       DO UPDATE SET 
         consequences = $2,
         impact = $3,
         tool_evaluation = $4,
         better_implementation = $5,
         decision = $6,
         updated_at = NOW()`,
      [
        proposalId,
        JSON.stringify(analysis.consequences),
        JSON.stringify(analysis.impact),
        JSON.stringify(analysis.toolEvaluation),
        JSON.stringify(analysis.betterImplementation),
        JSON.stringify(analysis.decision)
      ]
    );
  }
}
