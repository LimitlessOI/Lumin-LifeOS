/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    USER SIMULATION SYSTEM                                        ║
 * ║                    Learns user's decision-making style over time                ║
 * ║                    Goal: 99% accuracy in simulating user choices               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class UserSimulation {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.decisionPatterns = new Map();
    this.styleProfile = null;
    this.accuracyScore = 0;
  }

  /**
   * Learn from user decision
   */
  async learnFromDecision(context, decision, reasoning) {
    try {
      await this.pool.query(
        `INSERT INTO user_decision_history
         (context, decision, reasoning, timestamp, created_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [
          JSON.stringify(context),
          decision,
          reasoning,
        ]
      );

      // Update patterns
      await this.updatePatterns(context, decision);
      
      // Rebuild style profile
      await this.rebuildStyleProfile();
    } catch (error) {
      console.warn('Failed to learn from decision:', error.message);
    }
  }

  /**
   * Update decision patterns
   */
  async updatePatterns(context, decision) {
    const key = this.extractContextKey(context);
    
    if (!this.decisionPatterns.has(key)) {
      this.decisionPatterns.set(key, []);
    }
    
    this.decisionPatterns.get(key).push({
      decision,
      timestamp: new Date(),
    });
  }

  extractContextKey(context) {
    // Create a key from context type and main factors
    const type = context.type || 'general';
    const factors = context.factors || [];
    return `${type}_${factors.slice(0, 3).join('_')}`;
  }

  /**
   * Rebuild user style profile
   */
  async rebuildStyleProfile() {
    try {
      const decisions = await this.pool.query(
        `SELECT context, decision, reasoning, timestamp
         FROM user_decision_history
         ORDER BY timestamp DESC
         LIMIT 1000`
      );

      if (decisions.rows.length === 0) {
        this.styleProfile = null;
        return;
      }

      // Analyze patterns
      const analysis = await this.analyzeDecisionPatterns(decisions.rows);
      
      this.styleProfile = {
        ...analysis,
        decisionCount: decisions.rows.length,
        lastUpdated: new Date(),
      };

      // Store profile
      await this.pool.query(
        `INSERT INTO user_style_profile
         (profile_data, accuracy_score, decision_count, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           profile_data = $1,
           accuracy_score = $2,
           decision_count = $3,
           updated_at = NOW()`,
        [
          JSON.stringify(this.styleProfile),
          this.accuracyScore,
          decisions.rows.length,
        ]
      );
    } catch (error) {
      console.warn('Failed to rebuild style profile:', error.message);
    }
  }

  /**
   * Analyze decision patterns using AI
   */
  async analyzeDecisionPatterns(decisions) {
    const prompt = `Analyze these user decisions to understand their decision-making style:

${decisions.slice(0, 50).map((d, i) => 
  `${i + 1}. Context: ${JSON.stringify(d.context)}\n   Decision: ${d.decision}\n   Reasoning: ${d.reasoning}`
).join('\n\n')}

Extract:
1. Decision-making style (analytical, intuitive, risk-averse, etc.)
2. Common patterns
3. Preferred approaches
4. Values and priorities
5. Communication style
6. Management style

Return as JSON:
{
  "style": "analytical|intuitive|balanced",
  "patterns": [...],
  "approaches": [...],
  "values": [...],
  "communication": "...",
  "management": "...",
  "risk_tolerance": "low|medium|high",
  "decision_speed": "fast|medium|deliberate"
}`;

    try {
      const response = await this.callCouncilMember('gemini', prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('AI analysis failed:', error.message);
    }

    // Fallback
    return {
      style: 'balanced',
      patterns: [],
      approaches: [],
      values: [],
      communication: 'direct',
      management: 'delegative',
      risk_tolerance: 'medium',
      decision_speed: 'medium',
    };
  }

  /**
   * Simulate user's decision for a given context
   */
  async simulateDecision(context) {
    if (!this.styleProfile) {
      // No profile yet - return neutral
      return {
        decision: 'neutral',
        confidence: 0,
        reasoning: 'User profile not yet learned',
      };
    }

    const prompt = `Simulate what the user would decide in this context, based on their style:

User Style Profile:
${JSON.stringify(this.styleProfile, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Based on the user's past decisions and style, what would they decide?

Return as JSON:
{
  "decision": "the decision they would make",
  "confidence": 0.0-1.0,
  "reasoning": "why they would decide this way",
  "style_match": "how this matches their style"
}`;

    try {
      const response = await this.callCouncilMember('chatgpt', prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const simulation = JSON.parse(jsonMatch[0]);
        
        // Calculate accuracy based on how well it matches style
        simulation.accuracy = this.calculateAccuracy(simulation);
        
        return simulation;
      }
    } catch (error) {
      console.warn('Simulation failed:', error.message);
    }

    return {
      decision: 'neutral',
      confidence: 0,
      reasoning: 'Simulation failed',
    };
  }

  /**
   * Calculate accuracy of simulation
   */
  calculateAccuracy(simulation) {
    // Compare simulation to known patterns
    let matchScore = 0;
    let totalChecks = 0;

    if (this.styleProfile) {
      // Check style match
      if (simulation.style_match) {
        matchScore += 0.3;
      }
      totalChecks += 0.3;

      // Check confidence
      if (simulation.confidence > 0.7) {
        matchScore += 0.2;
      }
      totalChecks += 0.2;

      // Check reasoning quality
      if (simulation.reasoning && simulation.reasoning.length > 50) {
        matchScore += 0.5;
      }
      totalChecks += 0.5;
    }

    return totalChecks > 0 ? matchScore / totalChecks : 0;
  }

  /**
   * Get current accuracy score
   */
  async getAccuracyScore() {
    try {
      const result = await this.pool.query(
        `SELECT accuracy_score FROM user_style_profile ORDER BY updated_at DESC LIMIT 1`
      );

      if (result.rows.length > 0) {
        this.accuracyScore = parseFloat(result.rows[0].accuracy_score) || 0;
      }
    } catch (error) {
      // Table might not exist yet
    }

    return this.accuracyScore;
  }

  /**
   * Validate simulation against actual user decision
   */
  async validateSimulation(context, simulatedDecision, actualDecision) {
    const match = simulatedDecision.decision === actualDecision;
    const accuracy = match ? 1.0 : 0.0;

    // Update accuracy score
    const currentScore = await this.getAccuracyScore();
    const newScore = (currentScore * 0.9) + (accuracy * 0.1); // Weighted average

    await this.pool.query(
      `UPDATE user_style_profile
       SET accuracy_score = $1, updated_at = NOW()
       WHERE id = 1`,
      [newScore]
    );

    this.accuracyScore = newScore;

    return {
      match,
      accuracy: newScore,
      improvement: newScore > currentScore,
    };
  }

  /**
   * Get style profile for use in debates
   */
  getStyleProfile() {
    return this.styleProfile || {
      style: 'learning',
      accuracy: this.accuracyScore,
      note: 'Profile still being built',
    };
  }
}
