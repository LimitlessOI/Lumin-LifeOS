/**
 * Life Coaching Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_09_LIFE_COACHING.md
 */
import logger from '../services/logger.js';

export function createLifeCoachingRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilWithFailover,
    callRecorder,
    salesTechniqueAnalyzer,
    goalTracker,
    activityTracker,
    coachingProgression,
    calendarService,
    perfectDaySystem,
    goalCommitmentSystem,
    callSimulationSystem,
    relationshipMediation,
    meaningfulMoments,
  } = ctx;

// ==================== SALES COACHING & RECORDING ENDPOINTS ====================

// Start recording a call or presentation
app.post("/api/v1/boldtrail/start-recording", requireKey, async (req, res) => {
  try {
    const { agent_id, recording_type, client_name, client_email, client_phone, property_address } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.startRecording(
      agent_id,
      recording_type || 'phone_call',
      { client_name, client_email, client_phone, property_address }
    );

    res.json(result);
  } catch (error) {
    console.error("Start recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Add transcript segment (real-time during call)
app.post("/api/v1/boldtrail/add-transcript", requireKey, async (req, res) => {
  try {
    const { call_id, segment } = req.body;

    if (!call_id || !segment) {
      return res.status(400).json({ ok: false, error: "call_id and segment required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.addTranscriptSegment(call_id, segment);
    res.json(result);
  } catch (error) {
    console.error("Add transcript error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Stop recording and analyze
app.post("/api/v1/boldtrail/stop-recording", requireKey, async (req, res) => {
  try {
    const { call_id, recording_url } = req.body;

    if (!call_id) {
      return res.status(400).json({ ok: false, error: "call_id required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.stopRecording(call_id, recording_url);
    res.json(result);
  } catch (error) {
    console.error("Stop recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mark a moment (good or bad) during recording
app.post("/api/v1/boldtrail/mark-moment", requireKey, async (req, res) => {
  try {
    const { call_id, moment_type, start_time, end_time, notes } = req.body;

    if (!call_id || !moment_type || start_time === undefined || end_time === undefined) {
      return res.status(400).json({ ok: false, error: "call_id, moment_type, start_time, and end_time required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.markMoment(call_id, moment_type, start_time, end_time, notes);
    res.json(result);
  } catch (error) {
    console.error("Mark moment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get coaching clips for an agent
app.get("/api/v1/boldtrail/coaching-clips/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { clip_type, limit = 20 } = req.query;

    let query = `
      SELECT cc.*, scr.call_id, scr.recording_type, scr.client_name, scr.property_address
      FROM coaching_clips cc
      JOIN sales_call_recordings scr ON cc.recording_id = scr.id
      WHERE cc.agent_id = $1
    `;
    const params = [agentId];

    if (clip_type) {
      query += ` AND cc.clip_type = $2`;
      params.push(clip_type);
      query += ` ORDER BY cc.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    } else {
      query += ` ORDER BY cc.created_at DESC LIMIT $2`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      clips: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Get coaching clips error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get sales technique patterns (bad habits) for an agent
app.get("/api/v1/boldtrail/technique-patterns/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { pattern_type } = req.query;

    let query = `
      SELECT * FROM sales_technique_patterns
      WHERE agent_id = $1
    `;
    const params = [agentId];

    if (pattern_type) {
      query += ` AND pattern_type = $2`;
      params.push(pattern_type);
    }

    query += ` ORDER BY frequency DESC, last_detected DESC`;

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      patterns: result.rows,
      bad_habits: result.rows.filter(p => p.pattern_type === 'bad_habit'),
      good_practices: result.rows.filter(p => p.pattern_type === 'good_practice')
    });
  } catch (error) {
    console.error("Get technique patterns error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get real-time coaching events for a recording
app.get("/api/v1/boldtrail/coaching-events/:callId", requireKey, async (req, res) => {
  try {
    const { callId } = req.params;

    const recording = await pool.query(
      "SELECT id FROM sales_call_recordings WHERE call_id = $1",
      [callId]
    );

    if (recording.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Recording not found" });
    }

    const result = await pool.query(
      `SELECT * FROM real_time_coaching_events
       WHERE recording_id = $1
       ORDER BY timestamp ASC`,
      [recording.rows[0].id]
    );

    res.json({
      ok: true,
      events: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Get coaching events error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get recording status
app.get("/api/v1/boldtrail/recording-status/:callId", requireKey, async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const status = callRecorder.getRecordingStatus(callId);
    
    if (!status) {
      return res.status(404).json({ ok: false, error: "Recording not found or not active" });
    }

    res.json({ ok: true, ...status });
  } catch (error) {
    console.error("Get recording status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== GOAL TRACKING ENDPOINTS ====================

// Create a goal
app.post("/api/v1/boldtrail/goals", requireKey, async (req, res) => {
  try {
    const { agent_id, goal_type, goal_name, target_value, deadline, unit } = req.body;

    if (!agent_id || !goal_type || !goal_name || !target_value) {
      return res.status(400).json({ ok: false, error: "agent_id, goal_type, goal_name, and target_value required" });
    }

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.createGoal(agent_id, {
      goal_type,
      goal_name,
      target_value,
      deadline,
      unit
    });

    res.json(result);
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get agent goals
app.get("/api/v1/boldtrail/goals/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.getAgentGoals(agentId, status);
    res.json(result);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update goal progress
app.put("/api/v1/boldtrail/goals/:goalId", requireKey, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { current_value } = req.body;

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.updateGoalProgress(goalId, current_value);
    res.json(result);
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== ACTIVITY TRACKING ENDPOINTS ====================

// Record an activity
app.post("/api/v1/boldtrail/activities", requireKey, async (req, res) => {
  try {
    const { agent_id, ...activityData } = req.body;

    if (!agent_id || !activityData.activity_type) {
      return res.status(400).json({ ok: false, error: "agent_id and activity_type required" });
    }

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.recordActivity(agent_id, activityData);
    res.json(result);
  } catch (error) {
    console.error("Record activity error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start call with auto-recording
app.post("/api/v1/boldtrail/start-call", requireKey, async (req, res) => {
  try {
    const { agent_id, ...callData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.startCallWithRecording(agent_id, callData);
    res.json(result);
  } catch (error) {
    console.error("Start call error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get activity analytics
app.get("/api/v1/boldtrail/analytics/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = '30 days' } = req.query;

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.getActivityAnalytics(agentId, period);
    res.json(result);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COACHING PROGRESSION ENDPOINTS ====================

// Get agent progression
app.get("/api/v1/boldtrail/progression/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!coachingProgression) {
      return res.status(503).json({ ok: false, error: "Coaching progression not initialized" });
    }

    const result = await coachingProgression.getAgentProgression(agentId);
    res.json(result);
  } catch (error) {
    console.error("Get progression error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CALENDAR ENDPOINTS ====================

// Create calendar event
app.post("/api/v1/boldtrail/calendar/events", requireKey, async (req, res) => {
  try {
    const { agent_id, ...eventData } = req.body;

    if (!agent_id || !eventData.start_time || !eventData.end_time) {
      return res.status(400).json({ ok: false, error: "agent_id, start_time, and end_time required" });
    }

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.createEvent(agent_id, eventData);
    res.json(result);
  } catch (error) {
    console.error("Create calendar event error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get calendar events
app.get("/api/v1/boldtrail/calendar/events/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ ok: false, error: "start_date and end_date required" });
    }

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.getEvents(agentId, start_date, end_date);
    res.json(result);
  } catch (error) {
    console.error("Get calendar events error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Handle event start (auto-record)
app.post("/api/v1/boldtrail/calendar/events/:eventId/start", requireKey, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.handleEventStart(eventId);
    res.json(result);
  } catch (error) {
    console.error("Handle event start error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Complete event
app.post("/api/v1/boldtrail/calendar/events/:eventId/complete", requireKey, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { outcome } = req.body;

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.completeEvent(eventId, outcome);
    res.json(result);
  } catch (error) {
    console.error("Complete event error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== PERFECT DAY ENDPOINTS ====================

// Setup perfect day
app.post("/api/v1/boldtrail/perfect-day/setup", requireKey, async (req, res) => {
  try {
    const { agent_id, ...config } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.setupPerfectDay(agent_id, config);
    res.json(result);
  } catch (error) {
    console.error("Setup perfect day error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start perfect day routine
app.post("/api/v1/boldtrail/perfect-day/start", requireKey, async (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.startPerfectDay(agent_id);
    res.json(result);
  } catch (error) {
    console.error("Start perfect day error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Set three most important things
app.post("/api/v1/boldtrail/perfect-day/three-important", requireKey, async (req, res) => {
  try {
    const { agent_id, three_things } = req.body;

    if (!agent_id || !three_things || !Array.isArray(three_things)) {
      return res.status(400).json({ ok: false, error: "agent_id and three_things array required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.setThreeMostImportant(agent_id, three_things);
    res.json(result);
  } catch (error) {
    console.error("Set three important error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// End of day review
app.post("/api/v1/boldtrail/perfect-day/review", requireKey, async (req, res) => {
  try {
    const { agent_id, ...reviewData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.endOfDayReview(agent_id, reviewData);
    res.json(result);
  } catch (error) {
    console.error("End of day review error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== GOAL COMMITMENT ENDPOINTS ====================

// Create goal commitment
app.post("/api/v1/boldtrail/commitments", requireKey, async (req, res) => {
  try {
    const { agent_id, goal_id, ...commitmentData } = req.body;

    if (!agent_id || !goal_id) {
      return res.status(400).json({ ok: false, error: "agent_id and goal_id required" });
    }

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.createCommitment(agent_id, goal_id, commitmentData);
    res.json(result);
  } catch (error) {
    console.error("Create commitment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Track commitment
app.post("/api/v1/boldtrail/commitments/:commitmentId/track", requireKey, async (req, res) => {
  try {
    const { commitmentId } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.trackCommitment(commitmentId, agent_id);
    res.json(result);
  } catch (error) {
    console.error("Track commitment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get agent commitments
app.get("/api/v1/boldtrail/commitments/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.getAgentCommitments(agentId, status);
    res.json(result);
  } catch (error) {
    console.error("Get commitments error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CALL SIMULATION ENDPOINTS ====================

// Create simulation
app.post("/api/v1/boldtrail/simulations", requireKey, async (req, res) => {
  try {
    const { agent_id, ...simulationData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callSimulationSystem) {
      return res.status(503).json({ ok: false, error: "Call simulation system not initialized" });
    }

    const result = await callSimulationSystem.createSimulation(agent_id, simulationData);
    res.json(result);
  } catch (error) {
    console.error("Create simulation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start simulation
app.post("/api/v1/boldtrail/simulations/:simulationId/start", requireKey, async (req, res) => {
  try {
    const { simulationId } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callSimulationSystem) {
      return res.status(503).json({ ok: false, error: "Call simulation system not initialized" });
    }

    const result = await callSimulationSystem.startSimulation(agent_id, simulationId);
    res.json(result);
  } catch (error) {
    console.error("Start simulation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== RELATIONSHIP MEDIATION ENDPOINTS ====================

// Request mediation
app.post("/api/v1/boldtrail/mediation/request", requireKey, async (req, res) => {
  try {
    const { agent_id, ...mediationData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!relationshipMediation) {
      return res.status(503).json({ ok: false, error: "Relationship mediation not initialized" });
    }

    const result = await relationshipMediation.requestMediation(agent_id, mediationData);
    res.json(result);
  } catch (error) {
    console.error("Request mediation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Process mediation
app.post("/api/v1/boldtrail/mediation/:mediationId/process", requireKey, async (req, res) => {
  try {
    const { mediationId } = req.params;
    const { conversation_data } = req.body;

    if (!relationshipMediation) {
      return res.status(503).json({ ok: false, error: "Relationship mediation not initialized" });
    }

    const result = await relationshipMediation.processMediation(mediationId, conversation_data);
    res.json(result);
  } catch (error) {
    console.error("Process mediation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MEANINGFUL MOMENTS ENDPOINTS ====================

// Start continuous recording
app.post("/api/v1/boldtrail/moments/start-recording", requireKey, async (req, res) => {
  try {
    const { agent_id, consent, reset_interval_minutes = 60 } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!meaningfulMoments) {
      return res.status(503).json({ ok: false, error: "Meaningful moments system not initialized" });
    }

    const result = await meaningfulMoments.startContinuousRecording(agent_id, consent, reset_interval_minutes);
    res.json(result);
  } catch (error) {
    console.error("Start continuous recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get moments for playback
app.get("/api/v1/boldtrail/moments/:agentId/playback", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { moment_type } = req.query;

    if (!meaningfulMoments) {
      return res.status(503).json({ ok: false, error: "Meaningful moments system not initialized" });
    }

    const result = await meaningfulMoments.getMomentsForPlayback(agentId, moment_type);
    res.json(result);
  } catch (error) {
    console.error("Get moments for playback error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COACH CHAT ENDPOINT ====================

// Coach chat endpoint
app.post("/api/coach/chat", requireKey, async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text required" });
    }

    const agentId = context?.agentId || req.body.agent_id;

    console.log(`💬 [COACH] Agent ${agentId}: ${text.substring(0, 100)}...`);

    // Log to audit
    try {
      await pool.query(
        `INSERT INTO audit_log (action_type, user_id, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'coach_chat',
          agentId || 'unknown',
          JSON.stringify({ text, context })
        ]
      );
    } catch (dbError) {
      console.warn('⚠️ Could not log coach chat to audit:', dbError.message);
    }

    // Check for special commands
    const lowerText = text.toLowerCase();
    let replyText = '';
    let confidence = 0.9;
    let suggestedActions = [];

    // Handle "play my WHY" or discouraged messages
    if (lowerText.includes('play my why') || lowerText.includes("i'm discouraged") || lowerText.includes('discouraged')) {
      if (meaningfulMoments) {
        const moments = await meaningfulMoments.getMomentsForPlayback(agentId, 'winning_moment');
        if (moments.ok && moments.moments && moments.moments.length > 0) {
          const recentMoment = moments.moments[0];
          replyText = `I found ${moments.moments.length} winning moment${moments.moments.length > 1 ? 's' : ''} for you! Here's your most recent: "${recentMoment.context || 'Your success moment'}"\n\nRemember why you started. You've got this! 💪`;
          suggestedActions = ['View all winning moments', 'Continue your perfect day routine'];
        } else {
          replyText = "I don't see any winning moments saved yet. Let's create one! What's something you're proud of accomplishing recently?";
          suggestedActions = ['Save a winning moment', 'Start perfect day routine'];
        }
      } else {
        replyText = "I'd love to help you reconnect with your WHY! The moments system isn't available right now, but remember: every expert was once a beginner. Keep going! 💪";
      }
    }
    // Handle "next move" questions
    else if (lowerText.includes('next move') || lowerText.includes('what should i do') || lowerText.includes('what do i do')) {
      replyText = "Based on your goals, here's your next move:\n\n1. Check your 3 most important things for today\n2. Review your active commitments\n3. Take action on the highest priority item\n\nWhat specific area would you like help with?";
      suggestedActions = ['View today tab', 'Check commitments', 'Review goals'];
    }
    // Handle follow-up requests
    else if (lowerText.includes('follow-up') || lowerText.includes('follow up') || lowerText.includes('write me')) {
      replyText = "I can help you write a follow-up! Here's a template:\n\n\"Hi [Name],\n\nThank you for our conversation today about [topic]. I wanted to follow up on [specific point] and see if you have any questions.\n\nLooking forward to hearing from you!\n\nBest,\n[Your name]\"\n\nWould you like me to customize this for a specific lead?";
      suggestedActions = ['Provide lead details', 'View recent activities'];
    }
    // General coaching question - use AI council
    else {
      const aiResponse = await callCouncilWithFailover(
        `You are a sales coach helping a real estate agent. They asked: "${text}"\n\nProvide a helpful, encouraging, and actionable response. Keep it concise (2-3 sentences max).`,
        'ollama_llama'
      );
      replyText = aiResponse || "I'm here to help! Can you provide more details about what you need?";
      confidence = 0.8;
    }

    // Check if user wants to save this as a meaningful moment
    if (context?.saveAsMoment || lowerText.includes('save this') || lowerText.includes('remember this')) {
      if (meaningfulMoments) {
        await meaningfulMoments.captureMoment(agentId, {
          moment_type: 'coaching_moment',
          context: `Coach conversation: ${text.substring(0, 200)}`,
          transcript: text,
          tags: ['coach_chat']
        });
        replyText += '\n\n✓ Saved as a meaningful moment!';
      }
    }

    res.json({
      ok: true,
      replyText,
      confidence,
      suggestedActions
    });
  } catch (error) {
    console.error("Coach chat error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== PROGRESS TRACKING ENDPOINTS ====================

// Get progress bars for goals
app.get("/api/v1/boldtrail/progress/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get active goals
    const goals = await pool.query(
      `SELECT * FROM agent_goals WHERE agent_id = $1 AND status = 'active'`,
      [agentId]
    );

    // Get activities counts
    const activities = await pool.query(
      `SELECT activity_type, COUNT(*) as count,
              COUNT(CASE WHEN outcome IN ('appointment_set', 'sale', 'showing_scheduled') THEN 1 END) as success_count
       FROM agent_activities
       WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY activity_type`,
      [agentId]
    );

    // Calculate progress bars
    const progressBars = {
      goals: goals.rows.map(goal => ({
        goal_id: goal.id,
        goal_name: goal.goal_name,
        current: parseFloat(goal.current_value || 0),
        target: parseFloat(goal.target_value),
        progress_percent: goal.target_value > 0 
          ? Math.min(100, ((goal.current_value / goal.target_value) * 100).toFixed(1))
          : 0,
        on_track: goal.deadline 
          ? this.isOnTrack(goal.current_value, goal.target_value, goal.deadline, goal.created_at)
          : null,
        projected_completion: goal.deadline || null
      })),
      activities: activities.rows.map(act => ({
        activity_type: act.activity_type,
        total: parseInt(act.count),
        successful: parseInt(act.success_count),
        success_rate: act.count > 0 ? ((act.success_count / act.count) * 100).toFixed(1) : 0
      })),
      appointments: {
        current: activities.rows.find(a => a.activity_type === 'appointment')?.count || 0,
        target: 0, // Would come from goal
        progress_percent: 0
      },
      calls: {
        current: activities.rows.find(a => a.activity_type === 'call')?.count || 0,
        target: 0,
        progress_percent: 0
      },
      deals: {
        current: activities.rows.find(a => a.outcome === 'sale')?.count || 0,
        target: 0,
        progress_percent: 0
      }
    };

    res.json({ ok: true, progress: progressBars });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Helper to check if goal is on track
function isOnTrack(current, target, deadline, startDate) {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const start = new Date(startDate);
  
  const totalTime = deadlineDate - start;
  const elapsed = now - start;
  const expectedProgress = (elapsed / totalTime) * 100;
  const actualProgress = (current / target) * 100;
  
  return actualProgress >= expectedProgress * 0.9; // 90% of expected = on track
}

// ==================== INCOME DIAGNOSTIC ENDPOINT ====================
app.get("/api/v1/income/diagnostic", requireKey, async (req, res) => {
  try {
    const { IncomeDiagnostic } = await import("./core/income-diagnostic.js");
    const diagnostic = new IncomeDiagnostic(pool);
    const result = await diagnostic.runDiagnostic();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
