// src/services/call-simulation-system.js
// Call simulation and guided practice system

export class CallSimulationSystem {
  constructor(pool, callRecorder, callCouncilWithFailover) {
    this.pool = pool;
    this.callRecorder = callRecorder;
    this.callCouncil = callCouncilWithFailover;
  }

  /**
   * Create call simulation for practice
   */
  async createSimulation(agentId, simulationData) {
    try {
      const {
        simulation_type = 'practice',
        scenario_description,
        closes_to_practice = [],
        questions_to_ask = []
      } = simulationData;

      // Generate script guidance
      const scriptGuidance = await this.generateScriptGuidance(scenario_description, closes_to_practice, questions_to_ask);

      const result = await this.pool.query(
        `INSERT INTO agent_call_simulations 
         (agent_id, simulation_type, scenario_description, script_guidance, closes_to_practice, questions_to_ask)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          agentId,
          simulation_type,
          scenario_description,
          JSON.stringify(scriptGuidance),
          JSON.stringify(closes_to_practice),
          JSON.stringify(questions_to_ask)
        ]
      );

      return { ok: true, simulation: result.rows[0] };
    } catch (error) {
      console.error('Create simulation error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Generate script guidance with closes
   */
  async generateScriptGuidance(scenario, closes, questions) {
    const guidance = {
      steps: [],
      closes: [],
      questions: {
        must_ask: [],
        should_ask: [],
        could_ask: []
      },
      tips: []
    };

    // Add closes (like A/B close)
    if (closes.length > 0) {
      guidance.closes = closes.map(close => ({
        name: close.name || close,
        script: this.getCloseScript(close.name || close)
      }));
    } else {
      // Default A/B close
      guidance.closes.push({
        name: 'A/B Close',
        script: 'Ok great, let\'s go ahead and set an appointment. Is Thursday at 11am or would Saturday at 1pm work best for you?'
      });
    }

    // Add questions
    if (questions.length > 0) {
      guidance.questions.must_ask = questions.filter(q => q.priority === 'must');
      guidance.questions.should_ask = questions.filter(q => q.priority === 'should');
      guidance.questions.could_ask = questions.filter(q => q.priority === 'could');
    } else {
      // Default questions
      guidance.questions.must_ask = [
        'What are you looking for in a property?',
        'What\'s your timeline?',
        'What\'s your budget range?'
      ];
      guidance.questions.should_ask = [
        'Have you been looking for a while?',
        'What\'s most important to you?',
        'What questions do you have?'
      ];
    }

    // Add tips
    guidance.tips = [
      'Talk less, ask more questions',
      'Listen actively to their responses',
      'Let your personality shine through',
      'Be comfortable with silence',
      'Focus on their needs, not your pitch'
    ];

    return guidance;
  }

  /**
   * Get close script by name
   */
  getCloseScript(closeName) {
    const closes = {
      'A/B Close': 'Ok great, let\'s go ahead and set an appointment. Is Thursday at 11am or would Saturday at 1pm work best for you?',
      'Assumptive Close': 'Great! I have some properties that match exactly what you\'re looking for. When would be the best time to show them to you?',
      'Urgency Close': 'This property just came on the market and there\'s already a lot of interest. Would you like to see it today or tomorrow?',
      'Question Close': 'Based on what you\'ve told me, this sounds like a perfect fit. What would you like to do next?',
      'Summary Close': 'So you\'re looking for a 3-bedroom home in the downtown area, budget around $300k, and you need to move by next month. I have 5 properties that match. Shall we schedule a showing?'
    };

    return closes[closeName] || closes['A/B Close'];
  }

  /**
   * Start simulation call
   */
  async startSimulation(agentId, simulationId) {
    try {
      const simulation = await this.pool.query(
        `SELECT * FROM agent_call_simulations WHERE id = $1 AND agent_id = $2`,
        [simulationId, agentId]
      );

      if (simulation.rows.length === 0) {
        return { ok: false, error: 'Simulation not found' };
      }

      const sim = simulation.rows[0];

      // Start recording for practice
      let recording = null;
      if (this.callRecorder) {
        recording = await this.callRecorder.startRecording(
          agentId,
          'phone_call',
          { client_name: 'Practice Call' }
        );
      }

      return {
        ok: true,
        simulation: sim,
        recording: recording,
        guidance: {
          script: JSON.parse(sim.script_guidance),
          closes: JSON.parse(sim.closes_to_practice),
          questions: JSON.parse(sim.questions_to_ask)
        }
      };
    } catch (error) {
      console.error('Start simulation error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Complete simulation and analyze
   */
  async completeSimulation(agentId, simulationId, analysisData) {
    try {
      const {
        personality_insights,
        comfort_zones,
        areas_improved,
        areas_needing_work
      } = analysisData;

      // Update simulation
      const result = await this.pool.query(
        `UPDATE agent_call_simulations 
         SET personality_insights = $1,
             comfort_zones = $2,
             completed = TRUE
         WHERE id = $3 AND agent_id = $4
         RETURNING *`,
        [
          JSON.stringify(personality_insights),
          JSON.stringify(comfort_zones),
          simulationId,
          agentId
        ]
      );

      return {
        ok: true,
        simulation: result.rows[0],
        feedback: {
          strengths: areas_improved,
          improvements: areas_needing_work
        }
      };
    } catch (error) {
      console.error('Complete simulation error:', error);
      return { ok: false, error: error.message };
    }
  }
}
