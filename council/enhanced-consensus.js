/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              ENHANCED CONSENSUS PROTOCOL                                         ║
 * ║              5-Phase Decision System with Steel-Manning                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Multi-phase consensus protocol that forces agents to argue OPPOSITE positions
 * before making final decisions. Prevents groupthink and surfaces hidden risks.
 *
 * Phases:
 * 1. Quick vote (3 agents) - Initial gut check
 * 2. Steel-man both sides (argue OPPOSITE position) - Force perspective shift
 * 3. Future projection (1yr/2yr/3yr timelines) - Long-term thinking
 * 4. Informed final vote - With full context
 * 5. Expand or escalate to human - If still no consensus
 */

export class EnhancedConsensusProtocol {
  constructor(pool, callCouncilMember, dynamicExpansion) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.dynamicExpansion = dynamicExpansion;
    this.consensusHistory = [];
  }

  /**
   * Run the full 5-phase enhanced consensus protocol
   * @param {object} decision - The decision to evaluate
   * @param {array} coreAgents - Array of agent keys ['claude', 'gpt', 'gemini']
   * @returns {Promise<object>} - Consensus result with full audit trail
   */
  async runProtocol(decision, coreAgents = ['claude', 'gpt', 'gemini']) {
    console.log('🎯 [CONSENSUS] Starting Enhanced 5-Phase Protocol');

    const protocolStart = Date.now();
    const auditTrail = {
      decision,
      phases: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Phase 1: Quick Vote (gut check)
      const phase1 = await this.phase1_QuickVote(decision, coreAgents);
      auditTrail.phases.push(phase1);

      // Check if unanimous and high confidence - can skip to Phase 4
      if (phase1.unanimous && phase1.averageConfidence >= 0.8) {
        console.log('✅ [CONSENSUS] Phase 1: Unanimous with high confidence - skipping to Phase 4');

        // Phase 4: Final vote (just confirmation)
        const phase4 = await this.phase4_InformedFinalVote(decision, coreAgents, {
          phase1,
          quickPath: true,
        });
        auditTrail.phases.push(phase4);

        return this.finalizeConsensus(auditTrail, phase4, protocolStart);
      }

      // Phase 2: Steel-Man Both Sides (argue opposite position)
      const phase2 = await this.phase2_SteelManBothSides(decision, coreAgents, phase1);
      auditTrail.phases.push(phase2);

      // Phase 3: Future Projection (1yr/2yr/3yr timelines)
      const phase3 = await this.phase3_FutureProjection(decision, coreAgents);
      auditTrail.phases.push(phase3);

      // Phase 4: Informed Final Vote (with full context)
      const phase4 = await this.phase4_InformedFinalVote(decision, coreAgents, {
        phase1,
        phase2,
        phase3,
      });
      auditTrail.phases.push(phase4);

      // Phase 5: Expand or Escalate (if still no consensus)
      if (!phase4.consensus || phase4.averageConfidence < 0.7) {
        const phase5 = await this.phase5_ExpandOrEscalate(decision, phase4);
        auditTrail.phases.push(phase5);
        return this.finalizeConsensus(auditTrail, phase5, protocolStart);
      }

      return this.finalizeConsensus(auditTrail, phase4, protocolStart);
    } catch (error) {
      console.error(`❌ [CONSENSUS] Protocol error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        auditTrail,
        duration: Date.now() - protocolStart,
      };
    }
  }

  /**
   * PHASE 1: Quick Vote (gut check from 3 core agents)
   */
  async phase1_QuickVote(decision, agents) {
    console.log('📊 [PHASE 1] Quick Vote - Initial gut check');

    const votes = [];
    const startTime = Date.now();

    for (const agent of agents) {
      const prompt = `Quick decision vote (gut check):

DECISION: ${JSON.stringify(decision, null, 2)}

Respond with ONLY:
{
  "vote": "APPROVE|REJECT|ABSTAIN",
  "confidence": 0.0-1.0,
  "one_line_reason": "..."
}`;

      try {
        const response = await this.callCouncilMember(agent, prompt, {
          maxTokens: 200,
          temperature: 0.3,
        });

        const vote = this.parseVote(response);
        votes.push({ agent, ...vote });
        console.log(`  ${agent}: ${vote.vote} (${vote.confidence})`);
      } catch (error) {
        console.error(`  ${agent}: ERROR - ${error.message}`);
        votes.push({ agent, error: error.message });
      }
    }

    const analysis = this.analyzeVotes(votes);

    return {
      phase: 1,
      name: 'Quick Vote',
      votes,
      ...analysis,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PHASE 2: Steel-Man Both Sides (argue OPPOSITE position)
   * This forces agents to deeply understand the other perspective
   */
  async phase2_SteelManBothSides(decision, agents, phase1Results) {
    console.log('🤺 [PHASE 2] Steel-Man Both Sides - Argue opposite position');

    const steelManArguments = [];
    const startTime = Date.now();

    for (const agent of agents) {
      // Find this agent's Phase 1 vote
      const phase1Vote = phase1Results.votes.find(v => v.agent === agent);
      const originalPosition = phase1Vote?.vote || 'ABSTAIN';

      // Assign OPPOSITE position
      let oppositePosition = 'APPROVE';
      if (originalPosition === 'APPROVE') oppositePosition = 'REJECT';
      else if (originalPosition === 'REJECT') oppositePosition = 'APPROVE';

      const prompt = `Steel-Man Exercise: Argue the OPPOSITE position

You originally voted: ${originalPosition}
Now argue for: ${oppositePosition}

DECISION: ${JSON.stringify(decision, null, 2)}

Make the STRONGEST possible case for ${oppositePosition}. Be genuinely persuasive.

Respond in JSON:
{
  "original_position": "${originalPosition}",
  "steel_man_position": "${oppositePosition}",
  "strongest_arguments": ["...", "...", "..."],
  "risks_of_original_position": ["...", "..."],
  "insights_gained": "What did arguing the opposite reveal?"
}`;

      try {
        const response = await this.callCouncilMember(agent, prompt, {
          maxTokens: 1000,
          temperature: 0.7,
        });

        const steelMan = this.parseSteelMan(response);
        steelManArguments.push({ agent, ...steelMan });
        console.log(`  ${agent}: Argued for ${oppositePosition}`);
      } catch (error) {
        console.error(`  ${agent}: ERROR - ${error.message}`);
        steelManArguments.push({ agent, error: error.message });
      }
    }

    return {
      phase: 2,
      name: 'Steel-Man Both Sides',
      steelManArguments,
      duration: Date.now() - startTime,
      insights: this.extractInsights(steelManArguments),
    };
  }

  /**
   * PHASE 3: Future Projection (1yr/2yr/3yr timelines)
   * What happens if we choose each path?
   */
  async phase3_FutureProjection(decision, agents) {
    console.log('🔮 [PHASE 3] Future Projection - 1yr/2yr/3yr timelines');

    const projections = [];
    const startTime = Date.now();

    for (const agent of agents) {
      const prompt = `Future Projection Analysis:

DECISION: ${JSON.stringify(decision, null, 2)}

Project outcomes over time:

1. If we APPROVE:
   - 1 year: What happens?
   - 2 years: What happens?
   - 3 years: What happens?

2. If we REJECT:
   - 1 year: What happens?
   - 2 years: What happens?
   - 3 years: What happens?

Focus on:
- Unintended consequences
- Compound effects
- Path dependencies
- Irreversible decisions

Respond in JSON:
{
  "approve_timeline": {
    "year_1": "...",
    "year_2": "...",
    "year_3": "...",
    "key_risks": ["..."],
    "key_opportunities": ["..."]
  },
  "reject_timeline": {
    "year_1": "...",
    "year_2": "...",
    "year_3": "...",
    "key_risks": ["..."],
    "key_opportunities": ["..."]
  },
  "recommendation": "APPROVE|REJECT",
  "reasoning": "Based on long-term analysis..."
}`;

      try {
        const response = await this.callCouncilMember(agent, prompt, {
          maxTokens: 1500,
          temperature: 0.7,
        });

        const projection = this.parseProjection(response);
        projections.push({ agent, ...projection });
        console.log(`  ${agent}: Projected timelines complete`);
      } catch (error) {
        console.error(`  ${agent}: ERROR - ${error.message}`);
        projections.push({ agent, error: error.message });
      }
    }

    return {
      phase: 3,
      name: 'Future Projection',
      projections,
      duration: Date.now() - startTime,
      longTermRisks: this.aggregateRisks(projections),
    };
  }

  /**
   * PHASE 4: Informed Final Vote
   * Now with full context from all previous phases
   */
  async phase4_InformedFinalVote(decision, agents, previousPhases) {
    console.log('✅ [PHASE 4] Informed Final Vote - With full context');

    const votes = [];
    const startTime = Date.now();

    for (const agent of agents) {
      // Build rich context from previous phases
      const context = this.buildContextSummary(agent, previousPhases);

      const prompt = `Final Informed Vote:

DECISION: ${JSON.stringify(decision, null, 2)}

${context}

Now, with ALL this context, cast your final vote.

Respond in JSON:
{
  "final_vote": "APPROVE|REJECT|ABSTAIN",
  "confidence": 0.0-1.0,
  "reasoning": "Why this vote, given all context?",
  "conditions": ["Any conditions for approval?"],
  "veto_triggers": ["What would make you change your vote?"]
}`;

      try {
        const response = await this.callCouncilMember(agent, prompt, {
          maxTokens: 1000,
          temperature: 0.5,
        });

        const vote = this.parseFinalVote(response);
        votes.push({ agent, ...vote });
        console.log(`  ${agent}: ${vote.final_vote} (${vote.confidence})`);
      } catch (error) {
        console.error(`  ${agent}: ERROR - ${error.message}`);
        votes.push({ agent, error: error.message });
      }
    }

    const analysis = this.analyzeVotes(votes, 'final_vote');

    return {
      phase: 4,
      name: 'Informed Final Vote',
      votes,
      ...analysis,
      duration: Date.now() - startTime,
    };
  }

  /**
   * PHASE 5: Expand or Escalate
   * If still no consensus, expand to 5 agents or escalate to human
   */
  async phase5_ExpandOrEscalate(decision, phase4Results) {
    console.log('🔶 [PHASE 5] Expand or Escalate');

    const startTime = Date.now();

    // Check if we should expand to 5 agents
    const expansionDecision = await this.dynamicExpansion.shouldExpand({
      firstRoundConsensus: phase4Results.consensus,
      averageConfidence: phase4Results.averageConfidence,
      stakesLevel: decision.stakesLevel || 'high',
      votes: phase4Results.votes,
    });

    if (expansionDecision.shouldExpand) {
      console.log('🔶 [PHASE 5] Expanding to 5-agent council');

      // Expand to 5 agents
      const expandedResult = await this.dynamicExpansion.expand(
        {
          ...decision,
          phase4Results,
        },
        this.callCouncilMember
      );

      // Re-run Phase 4 with expanded council
      const allAgents = ['claude', 'gpt', 'gemini', 'deepseek', 'grok'];
      const expandedVote = await this.phase4_InformedFinalVote(decision, allAgents, {
        phase4: phase4Results,
      });

      return {
        phase: 5,
        name: 'Expand to 5 Agents',
        expandedResult,
        expandedVote,
        consensus: expandedVote.consensus,
        finalDecision: expandedVote.majorityVote,
        duration: Date.now() - startTime,
      };
    }

    // If expansion doesn't help or isn't warranted, escalate to human
    console.log('⚠️ [PHASE 5] Escalating to human decision');

    return {
      phase: 5,
      name: 'Escalate to Human',
      escalated: true,
      reason: 'No AI consensus possible - human judgment required',
      summary: this.buildHumanEscalationSummary(phase4Results),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Helper: Analyze votes and determine consensus
   */
  analyzeVotes(votes, voteKey = 'vote') {
    const validVotes = votes.filter(v => !v.error && v[voteKey]);

    const voteCounts = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const vote of validVotes) {
      const choice = vote[voteKey];
      voteCounts[choice] = (voteCounts[choice] || 0) + 1;

      if (typeof vote.confidence === 'number') {
        totalConfidence += vote.confidence;
        confidenceCount++;
      }
    }

    const entries = Object.entries(voteCounts);
    const majorityEntry = entries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    , ['ABSTAIN', 0]);

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;
    const unanimous = majorityEntry[1] === validVotes.length;
    const consensus = majorityEntry[1] > validVotes.length / 2;

    return {
      voteCounts,
      majorityVote: majorityEntry[0],
      majorityCount: majorityEntry[1],
      totalVotes: validVotes.length,
      unanimous,
      consensus,
      averageConfidence,
    };
  }

  /**
   * Helper: Parse vote response
   */
  parseVote(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          vote: parsed.vote || parsed.decision || 'ABSTAIN',
          confidence: parseFloat(parsed.confidence) || 0.5,
          reason: parsed.one_line_reason || parsed.reasoning || '',
        };
      }
    } catch (error) {
      // Fallback parsing
    }

    const upperResponse = response.toUpperCase();
    let vote = 'ABSTAIN';
    if (upperResponse.includes('APPROVE')) vote = 'APPROVE';
    else if (upperResponse.includes('REJECT')) vote = 'REJECT';

    return { vote, confidence: 0.5, reason: response.substring(0, 100) };
  }

  /**
   * Helper: Parse steel-man argument
   */
  parseSteelMan(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fallback
    }

    return {
      original_position: 'UNKNOWN',
      steel_man_position: 'UNKNOWN',
      strongest_arguments: [response.substring(0, 200)],
      risks_of_original_position: [],
      insights_gained: '',
    };
  }

  /**
   * Helper: Parse future projection
   */
  parseProjection(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fallback
    }

    return {
      approve_timeline: { year_1: '', year_2: '', year_3: '', key_risks: [], key_opportunities: [] },
      reject_timeline: { year_1: '', year_2: '', year_3: '', key_risks: [], key_opportunities: [] },
      recommendation: 'ABSTAIN',
      reasoning: response.substring(0, 200),
    };
  }

  /**
   * Helper: Parse final vote
   */
  parseFinalVote(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          final_vote: parsed.final_vote || parsed.vote || 'ABSTAIN',
          confidence: parseFloat(parsed.confidence) || 0.5,
          reasoning: parsed.reasoning || '',
          conditions: parsed.conditions || [],
          veto_triggers: parsed.veto_triggers || [],
        };
      }
    } catch (error) {
      // Fallback
    }

    return this.parseVote(response);
  }

  /**
   * Helper: Extract insights from steel-man arguments
   */
  extractInsights(steelManArguments) {
    const allInsights = [];
    for (const arg of steelManArguments) {
      if (arg.insights_gained) {
        allInsights.push(arg.insights_gained);
      }
    }
    return allInsights;
  }

  /**
   * Helper: Aggregate long-term risks from projections
   */
  aggregateRisks(projections) {
    const risks = new Set();
    for (const proj of projections) {
      if (proj.approve_timeline?.key_risks) {
        proj.approve_timeline.key_risks.forEach(r => risks.add(r));
      }
      if (proj.reject_timeline?.key_risks) {
        proj.reject_timeline.key_risks.forEach(r => risks.add(r));
      }
    }
    return Array.from(risks);
  }

  /**
   * Helper: Build context summary for final vote
   */
  buildContextSummary(agent, previousPhases) {
    const parts = [];

    if (previousPhases.phase1) {
      const myPhase1 = previousPhases.phase1.votes.find(v => v.agent === agent);
      if (myPhase1) {
        parts.push(`Your Phase 1 vote: ${myPhase1.vote} (${myPhase1.confidence})`);
      }
    }

    if (previousPhases.phase2) {
      const myPhase2 = previousPhases.phase2.steelManArguments.find(a => a.agent === agent);
      if (myPhase2?.insights_gained) {
        parts.push(`Your steel-man insight: ${myPhase2.insights_gained}`);
      }
    }

    if (previousPhases.phase3) {
      const myPhase3 = previousPhases.phase3.projections.find(p => p.agent === agent);
      if (myPhase3?.recommendation) {
        parts.push(`Your future projection: ${myPhase3.recommendation}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Helper: Build human escalation summary
   */
  buildHumanEscalationSummary(phase4Results) {
    return {
      voteCounts: phase4Results.voteCounts,
      averageConfidence: phase4Results.averageConfidence,
      majorityVote: phase4Results.majorityVote,
      consensus: phase4Results.consensus,
      agentReasonings: phase4Results.votes.map(v => ({
        agent: v.agent,
        vote: v.final_vote || v.vote,
        reasoning: v.reasoning || v.reason,
      })),
    };
  }

  /**
   * Finalize consensus result
   */
  finalizeConsensus(auditTrail, finalPhase, protocolStart) {
    const result = {
      success: true,
      finalDecision: finalPhase.majorityVote || finalPhase.finalDecision || 'ESCALATED',
      consensus: finalPhase.consensus || false,
      confidence: finalPhase.averageConfidence || 0,
      unanimous: finalPhase.unanimous || false,
      escalated: finalPhase.escalated || false,
      auditTrail,
      duration: Date.now() - protocolStart,
      timestamp: new Date().toISOString(),
    };

    // Log to database
    this.logConsensus(result).catch(err => {
      console.warn(`Failed to log consensus: ${err.message}`);
    });

    return result;
  }

  /**
   * Log consensus result to database
   */
  async logConsensus(result) {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO consensus_protocol_log
         (final_decision, consensus, confidence, unanimous, escalated, audit_trail, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          result.finalDecision,
          result.consensus,
          result.confidence,
          result.unanimous,
          result.escalated,
          JSON.stringify(result.auditTrail),
          result.duration,
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }
  }
}
