/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              DYNAMIC COUNCIL EXPANSION                                            ║
 * ║              Adaptive 3→5 Agent System                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Intelligently expands the AI Council from 3 core agents to 5 agents when needed:
 * - No consensus in first round
 * - Confidence < 60%
 * - High stakes decisions
 *
 * Contracts back to 3 when unanimous 3x in a row (efficiency optimization)
 */

// Core 3-agent council (always active)
const CORE_AGENTS = {
  claude: {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    role: 'Strategy & Architecture',
    specialty: 'Long-horizon risk, governance, policy',
    tier: 1,
  },
  gpt: {
    name: 'GPT-4o (Brock)',
    provider: 'openai',
    role: 'Execution & Implementation',
    specialty: 'Shipping, coding, glue work',
    tier: 1,
  },
  gemini: {
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    role: 'Innovation & Creative',
    specialty: 'Ideation, exploration, creativity',
    tier: 1,
  },
};

// Extended agents (activated when expansion needed)
const EXTENDED_AGENTS = {
  deepseek: {
    name: 'DeepSeek V3',
    provider: 'deepseek',
    role: 'Optimization & Efficiency',
    specialty: 'TCO, compression, performance, cost optimization',
    tier: 1,
  },
  grok: {
    name: 'Grok 2',
    provider: 'xai',
    role: 'Reality Check',
    specialty: 'Feasibility, constraints, "what breaks"',
    tier: 1,
  },
};

export class DynamicCouncilExpansion {
  constructor(pool) {
    this.pool = pool;
    this.currentSize = 3; // Start with core 3
    this.unanimousStreak = 0; // Track consecutive unanimous votes
    this.expansionHistory = [];
    this.consensusThreshold = 0.6; // 60% confidence minimum
  }

  /**
   * Determine if council should expand based on decision context
   * @param {object} context - Decision context (confidence, stakes, consensus)
   * @returns {Promise<object>} - Expansion decision with reasoning
   */
  async shouldExpand(context) {
    const {
      firstRoundConsensus = true,
      averageConfidence = 1.0,
      stakesLevel = 'normal', // 'low', 'normal', 'high', 'critical'
      decisionType = 'operational', // 'operational', 'strategic', 'constitutional'
      votes = [],
    } = context;

    const reasons = [];
    let shouldExpand = false;

    // Reason 1: No consensus in first round
    if (!firstRoundConsensus) {
      reasons.push('No consensus achieved in first round');
      shouldExpand = true;
    }

    // Reason 2: Low confidence (< 60%)
    if (averageConfidence < this.consensusThreshold) {
      reasons.push(`Average confidence ${(averageConfidence * 100).toFixed(1)}% below threshold ${(this.consensusThreshold * 100).toFixed(1)}%`);
      shouldExpand = true;
    }

    // Reason 3: High stakes decisions
    if (stakesLevel === 'high' || stakesLevel === 'critical') {
      reasons.push(`High stakes decision: ${stakesLevel}`);
      shouldExpand = true;
    }

    // Reason 4: Constitutional/mission changes (always expand)
    if (decisionType === 'constitutional' || decisionType === 'mission') {
      reasons.push(`Critical decision type: ${decisionType}`);
      shouldExpand = true;
    }

    // Reason 5: Split votes (no clear majority)
    if (votes.length >= 3) {
      const voteDistribution = this.analyzeVoteDistribution(votes);
      if (voteDistribution.maxCount <= votes.length / 2) {
        reasons.push('Split vote with no clear majority');
        shouldExpand = true;
      }
    }

    return {
      shouldExpand,
      reasons,
      currentSize: this.currentSize,
      targetSize: shouldExpand ? 5 : 3,
      confidence: averageConfidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if council should contract back to 3 agents
   * Contracts when: 3 consecutive unanimous votes (efficiency optimization)
   */
  async shouldContract() {
    if (this.currentSize <= 3) {
      return { shouldContract: false, reason: 'Already at minimum size' };
    }

    if (this.unanimousStreak >= 3) {
      return {
        shouldContract: true,
        reason: `${this.unanimousStreak} consecutive unanimous votes - contracting for efficiency`,
        targetSize: 3,
      };
    }

    return {
      shouldContract: false,
      reason: `Only ${this.unanimousStreak}/3 unanimous votes`,
      streakProgress: `${this.unanimousStreak}/3`,
    };
  }

  /**
   * Execute council expansion - activate extended agents
   * @param {object} decision - The decision requiring expanded council
   * @param {function} callCouncilMember - Function to call individual agents
   * @returns {Promise<object>} - Expanded council results
   */
  async expand(decision, callCouncilMember) {
    console.log('🔶 [EXPANSION] Activating extended council (5 agents)');

    const expandedVotes = [];
    const startTime = Date.now();

    // Call extended agents (DeepSeek + Grok)
    const extendedAgentKeys = Object.keys(EXTENDED_AGENTS);

    for (const agentKey of extendedAgentKeys) {
      const agent = EXTENDED_AGENTS[agentKey];

      try {
        console.log(`🔶 [EXPANSION] Consulting ${agent.name} (${agent.role})`);

        const prompt = this.buildExpansionPrompt(decision, agent);
        const response = await callCouncilMember(agentKey, prompt, {
          maxTokens: 2000,
          temperature: 0.7,
        });

        const vote = this.parseVoteResponse(response, agent);
        expandedVotes.push(vote);

        console.log(`✅ [EXPANSION] ${agent.name}: ${vote.choice} (confidence: ${vote.confidence})`);
      } catch (error) {
        console.error(`❌ [EXPANSION] ${agent.name} failed: ${error.message}`);
        expandedVotes.push({
          agent: agentKey,
          name: agent.name,
          error: error.message,
          available: false,
        });
      }
    }

    // Update council size
    this.currentSize = 5;

    // Log expansion event
    await this.logExpansion({
      decision,
      expandedVotes,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      expandedVotes,
      totalVotes: expandedVotes.length,
      councilSize: 5,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Contract council back to 3 core agents
   */
  async contract(reason) {
    console.log(`🔵 [CONTRACTION] Returning to core 3 agents: ${reason}`);

    this.currentSize = 3;
    this.unanimousStreak = 0; // Reset streak

    // Log contraction event
    await this.logContraction({
      reason,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      councilSize: 3,
      reason,
    };
  }

  /**
   * Update unanimous streak tracking
   * @param {boolean} wasUnanimous - Whether the vote was unanimous
   */
  updateUnanimousStreak(wasUnanimous) {
    if (wasUnanimous) {
      this.unanimousStreak++;
      console.log(`✅ [EXPANSION] Unanimous vote streak: ${this.unanimousStreak}/3`);
    } else {
      if (this.unanimousStreak > 0) {
        console.log(`🔄 [EXPANSION] Streak broken at ${this.unanimousStreak}`);
      }
      this.unanimousStreak = 0;
    }
  }

  /**
   * Analyze vote distribution to detect splits
   */
  analyzeVoteDistribution(votes) {
    const distribution = {};

    for (const vote of votes) {
      const choice = vote.choice || vote.decision || 'abstain';
      distribution[choice] = (distribution[choice] || 0) + 1;
    }

    const entries = Object.entries(distribution);
    const maxEntry = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    , ['', 0]);

    return {
      distribution,
      maxChoice: maxEntry[0],
      maxCount: maxEntry[1],
      totalVotes: votes.length,
      isUnanimous: maxEntry[1] === votes.length,
      hasMajority: maxEntry[1] > votes.length / 2,
    };
  }

  /**
   * Build prompt for extended agents during expansion
   */
  buildExpansionPrompt(decision, agent) {
    return `You are ${agent.name}, the ${agent.role} on the AI Council.

Specialty: ${agent.specialty}

DECISION CONTEXT:
${JSON.stringify(decision, null, 2)}

The core 3-agent council has reached an impasse or low confidence. You have been called in to provide your expert perspective.

Analyze this decision from your specialty lens and provide:

1. **Your Vote**: APPROVE / REJECT / MODIFY
2. **Confidence**: 0.0-1.0 (how certain are you?)
3. **Reasoning**: Why, from your specialty perspective?
4. **Risks**: What could go wrong? (from your lens)
5. **Alternatives**: Any better options?

Respond in JSON format:
{
  "vote": "APPROVE|REJECT|MODIFY",
  "confidence": 0.0-1.0,
  "reasoning": "...",
  "risks": ["..."],
  "alternatives": ["..."]
}`;
  }

  /**
   * Parse vote response from extended agent
   */
  parseVoteResponse(response, agent) {
    try {
      // Try to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agent: agent.name,
          role: agent.role,
          choice: parsed.vote || parsed.decision || 'ABSTAIN',
          confidence: parseFloat(parsed.confidence) || 0.5,
          reasoning: parsed.reasoning || '',
          risks: parsed.risks || [],
          alternatives: parsed.alternatives || [],
        };
      }
    } catch (error) {
      console.warn(`Failed to parse vote from ${agent.name}: ${error.message}`);
    }

    // Fallback: try to extract vote from text
    const upperResponse = response.toUpperCase();
    let choice = 'ABSTAIN';
    if (upperResponse.includes('APPROVE')) choice = 'APPROVE';
    else if (upperResponse.includes('REJECT')) choice = 'REJECT';
    else if (upperResponse.includes('MODIFY')) choice = 'MODIFY';

    return {
      agent: agent.name,
      role: agent.role,
      choice,
      confidence: 0.5,
      reasoning: response.substring(0, 200),
      risks: [],
      alternatives: [],
    };
  }

  /**
   * Log expansion event to database
   */
  async logExpansion(expansionData) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO council_expansion_log
         (event_type, council_size, decision_context, expanded_votes, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'expansion',
          5,
          JSON.stringify(expansionData.decision),
          JSON.stringify(expansionData.expandedVotes),
          expansionData.duration,
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (!error.message.includes('does not exist')) {
        console.warn(`Failed to log expansion: ${error.message}`);
      }
    }
  }

  /**
   * Log contraction event to database
   */
  async logContraction(contractionData) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO council_expansion_log
         (event_type, council_size, reason, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'contraction',
          3,
          contractionData.reason,
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (!error.message.includes('does not exist')) {
        console.warn(`Failed to log contraction: ${error.message}`);
      }
    }
  }

  /**
   * Get current council configuration
   */
  getConfig() {
    const agents = this.currentSize === 3
      ? Object.values(CORE_AGENTS)
      : [...Object.values(CORE_AGENTS), ...Object.values(EXTENDED_AGENTS)];

    return {
      currentSize: this.currentSize,
      unanimousStreak: this.unanimousStreak,
      consensusThreshold: this.consensusThreshold,
      agents: agents.map(a => ({
        name: a.name,
        role: a.role,
        specialty: a.specialty,
      })),
    };
  }

  /**
   * Get expansion statistics
   */
  async getStats() {
    if (!this.pool) {
      return {
        totalExpansions: 0,
        totalContractions: 0,
        averageDuration: 0,
      };
    }

    try {
      const result = await this.pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'expansion') as total_expansions,
           COUNT(*) FILTER (WHERE event_type = 'contraction') as total_contractions,
           AVG(duration) FILTER (WHERE event_type = 'expansion') as avg_duration
         FROM council_expansion_log
         WHERE created_at > NOW() - INTERVAL '30 days'`
      );

      const row = result.rows[0];
      return {
        totalExpansions: parseInt(row.total_expansions) || 0,
        totalContractions: parseInt(row.total_contractions) || 0,
        averageDuration: parseFloat(row.avg_duration) || 0,
        currentSize: this.currentSize,
        unanimousStreak: this.unanimousStreak,
      };
    } catch (error) {
      // Table might not exist yet
      return {
        totalExpansions: 0,
        totalContractions: 0,
        averageDuration: 0,
        currentSize: this.currentSize,
        unanimousStreak: this.unanimousStreak,
      };
    }
  }
}

export { CORE_AGENTS, EXTENDED_AGENTS };
