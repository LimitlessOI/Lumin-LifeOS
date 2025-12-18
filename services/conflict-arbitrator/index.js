/**
 * Conflict Arbitrator Service
 * AI-powered mediation and conflict resolution
 * 
 * Uses multi-model consensus to ensure fair, balanced mediation
 * Works with overlay system for real-time conflict resolution
 */

import dayjs from 'dayjs';

export class ConflictArbitrator {
  constructor(callCouncilMember, modelRegistry, consensusEngine) {
    this.callCouncilMember = callCouncilMember;
    this.modelRegistry = modelRegistry;
    this.consensusEngine = consensusEngine;
    this.activeSessions = new Map();
  }

  /**
   * Start a mediation session
   */
  async startSession(config) {
    const {
      conflictType = 'general', // couple, business, parent_child, friend, legal
      partyA = 'Party A',
      partyB = 'Party B',
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    } = config;

    const session = {
      id: sessionId,
      conflictType,
      partyA,
      partyB,
      status: 'active',
      startedAt: new Date(),
      phases: {
        opening: { completed: false },
        listening: { completed: false },
        common_ground: { completed: false },
        brainstorming: { completed: false },
        proposal: { completed: false },
        agreement: { completed: false },
      },
      transcript: [],
      agreements: [],
      currentPhase: 'opening',
    };

    this.activeSessions.set(sessionId, session);

    // Generate opening statement
    const opening = await this.generateOpeningStatement(session);

    return {
      sessionId,
      opening,
      session,
    };
  }

  /**
   * Generate opening statement from AI mediator
   */
  async generateOpeningStatement(session) {
    const prompt = `You are a neutral, empathetic AI mediator helping ${session.partyA} and ${session.partyB} resolve a ${session.conflictType} conflict.

Your role:
- Remain neutral and fair to both parties
- Validate emotions without taking sides
- Help both parties understand each other's perspective
- Guide toward mutually acceptable solutions
- Maintain respectful, professional tone

Generate an opening statement that:
1. Introduces yourself as a neutral mediator
2. Sets ground rules (respect, active listening, open to compromise)
3. Explains the mediation process
4. Invites both parties to share their perspective

Keep it warm, professional, and reassuring.`;

    const response = await this.callMediator(prompt, {
      conflictType: session.conflictType,
      phase: 'opening',
    });

    session.transcript.push({
      role: 'mediator',
      phase: 'opening',
      content: response,
      timestamp: new Date(),
    });

    return response;
  }

  /**
   * Process statement from a party
   */
  async processStatement(sessionId, party, statement) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add to transcript
    session.transcript.push({
      role: party,
      content: statement,
      timestamp: new Date(),
    });

    // Generate mediator response using consensus
    const response = await this.generateMediatorResponse(session, party, statement);

    // Add mediator response to transcript
    session.transcript.push({
      role: 'mediator',
      phase: session.currentPhase,
      content: response,
      timestamp: new Date(),
    });

    // Check if phase should advance
    await this.checkPhaseAdvancement(session);

    return {
      response,
      session,
      nextPhase: session.currentPhase,
    };
  }

  /**
   * Generate mediator response using multi-model consensus
   */
  async generateMediatorResponse(session, party, statement) {
    const prompt = `You are mediating a ${session.conflictType} conflict between ${session.partyA} and ${session.partyB}.

Current phase: ${session.currentPhase}

Recent context:
${session.transcript.slice(-6).map(t => `${t.role}: ${t.content}`).join('\n')}

${party} just said: "${statement}"

Your task:
1. Acknowledge what ${party} said
2. Validate their emotions (if appropriate)
3. Summarize their key points
4. Ask clarifying questions (if needed)
5. Invite the other party to respond (if appropriate)
6. Guide toward common ground or solutions

Be neutral, empathetic, and constructive. Don't take sides.`;

    return await this.callMediator(prompt, {
      conflictType: session.conflictType,
      phase: session.currentPhase,
      requireConsensus: true, // Use multi-model consensus for fairness
    });
  }

  /**
   * Call mediator using consensus engine
   */
  async callMediator(prompt, options = {}) {
    const {
      conflictType = 'general',
      phase = 'listening',
      requireConsensus = false,
    } = options;

    // Select appropriate models for mediation
    const models = this.getMediationModels(conflictType);

    if (requireConsensus && models.length >= 3) {
      // Use consensus for critical responses
      return await this.consensusEngine.getConsensusResponse(
        prompt,
        models.slice(0, 3), // Use 3 models for consensus
        {
          taskType: 'mediation',
          ensureFairness: true,
        }
      );
    } else {
      // Single model for speed
      // Map model registry name to COUNCIL_MEMBERS key
      const modelName = models[0]?.name;
      const primaryModel = this.mapModelNameToCouncilKey(modelName) || 'ollama_deepseek_v3';
      return await this.callCouncilMember(primaryModel, prompt, {
        useOpenSourceCouncil: true,
        taskType: 'reasoning',
      });
    }
  }

  /**
   * Map model registry name to COUNCIL_MEMBERS key
   */
  mapModelNameToCouncilKey(modelName) {
    if (!modelName) return null;
    
    const modelMap = {
      'deepseek-v3': 'ollama_deepseek_v3',
      'deepseek-r1:32b': 'ollama_deepseek', // Fallback
      'deepseek-r1:70b': 'ollama_deepseek', // Fallback
      'llama3.3:70b-instruct-q4_0': 'ollama_llama_3_3_70b',
      'qwen2.5:72b-q4_0': 'ollama_qwen_2_5_72b',
      'qwen2.5:32b-instruct': 'ollama_qwen_2_5_72b', // Fallback
      'gemma2:27b-it-q4_0': 'ollama_gemma_2_27b',
    };

    return modelMap[modelName] || null;
  }

  /**
   * Get appropriate models for mediation type
   */
  getMediationModels(conflictType) {
    const registry = this.modelRegistry;
    if (!registry) {
      return [{ name: 'ollama_deepseek_v3' }]; // Use COUNCIL_MEMBERS key
    }

    // Base models for all mediation
    const base = [
      ...registry.getModelsByRole('reasoning') || [],
    ];

    // Add empathy-focused models for emotional conflicts
    if (['couple', 'parent_child', 'friend'].includes(conflictType)) {
      const empathy = registry.getModelsByCapability('general') || [];
      base.push(...empathy.slice(0, 2));
    }

    // Add structured models for business/legal
    if (['business', 'legal'].includes(conflictType)) {
      const structured = registry.getModelsByRole('code_generation') || [];
      base.push(...structured.slice(0, 1)); // For document generation
    }

    return base.filter(m => m.cost_class === 'free').slice(0, 5);
  }

  /**
   * Check if mediation phase should advance
   */
  async checkPhaseAdvancement(session) {
    const currentPhase = session.currentPhase;
    const transcript = session.transcript;

    // Count statements from each party
    const partyAStatements = transcript.filter(t => t.role === session.partyA).length;
    const partyBStatements = transcript.filter(t => t.role === session.partyB).length;

    // Simple phase advancement logic
    if (currentPhase === 'opening' && partyAStatements >= 1 && partyBStatements >= 1) {
      session.currentPhase = 'listening';
      session.phases.opening.completed = true;
    }

    if (currentPhase === 'listening' && transcript.length >= 10) {
      session.currentPhase = 'common_ground';
      session.phases.listening.completed = true;
    }

    // More sophisticated logic can be added
  }

  /**
   * Generate solutions/proposals
   */
  async generateSolutions(session) {
    const prompt = `Based on this mediation session, generate 3-5 potential solutions that address both ${session.partyA}'s and ${session.partyB}'s concerns.

Session summary:
${this.summarizeSession(session)}

Generate solutions that:
1. Address core concerns from both parties
2. Are practical and implementable
3. Include compromises where needed
4. Are fair and balanced

Format as numbered list with brief explanation for each.`;

    const response = await this.callMediator(prompt, {
      conflictType: session.conflictType,
      phase: 'brainstorming',
      requireConsensus: true,
    });

    // Parse solutions from response
    const solutions = this.parseSolutions(response);

    session.solutions = solutions;
    session.currentPhase = 'proposal';

    return solutions;
  }

  /**
   * Generate final agreement
   */
  async generateAgreement(session, selectedSolution) {
    const prompt = `Generate a formal agreement based on this mediation session.

Parties: ${session.partyA} and ${session.partyB}
Conflict Type: ${session.conflictType}
Selected Solution: ${selectedSolution}

Create an agreement that:
1. Clearly states what both parties agree to
2. Includes specific actions and timelines
3. Is fair and balanced
4. Uses clear, professional language
5. Includes follow-up checkpoints

Format as a structured agreement document.`;

    const response = await this.callMediator(prompt, {
      conflictType: session.conflictType,
      phase: 'agreement',
      requireConsensus: true,
    });

    const agreement = {
      id: `agreement_${Date.now()}`,
      solution: selectedSolution,
      text: response,
      parties: [session.partyA, session.partyB],
      createdAt: new Date(),
      status: 'pending_approval',
    };

    session.agreements.push(agreement);
    session.currentPhase = 'agreement';

    return agreement;
  }

  /**
   * Summarize session for solution generation
   */
  summarizeSession(session) {
    const keyPoints = session.transcript
      .filter(t => t.role !== 'mediator')
      .slice(-10)
      .map(t => `${t.role}: ${t.content.substring(0, 200)}`)
      .join('\n');

    return `Conflict Type: ${session.conflictType}\n\nKey Points:\n${keyPoints}`;
  }

  /**
   * Parse solutions from AI response
   */
  parseSolutions(response) {
    // Extract numbered solutions
    const lines = response.split('\n');
    const solutions = [];

    for (const line of lines) {
      const match = line.match(/^\d+[\.\)]\s*(.+)/);
      if (match) {
        solutions.push(match[1].trim());
      }
    }

    return solutions.length > 0 ? solutions : ['Solution needs refinement'];
  }

  /**
   * Get session status
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End session
   */
  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endedAt = new Date();
    }
    return session;
  }
}

export default ConflictArbitrator;
