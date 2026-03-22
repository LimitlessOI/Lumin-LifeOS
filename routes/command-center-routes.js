/**
 * Command Center Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createCommandCenterRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilMember,
    callCouncilWithFailover,
    executionQueue,
    aiPerformanceScores,
    logMonitor,
    costReExamination,
    compressionMetrics,
    getDailySpend,
    MAX_DAILY_SPEND,
    roiTracker,
    autoBuilder,
    getCouncilConsensus,
    sourceOfTruthManager,
    systemMetrics,
    systemSnapshots,
    incomeDroneSystem,
    ideaEngine,
    createProposal,
    conductEnhancedConsensus,
    makePhoneCall,
    sendSMS,
  } = ctx;
  // autonomyOrchestrator accessed as ctx.autonomyOrchestrator (lazy — created after routes register)

// ==================== COMMAND CENTER ENDPOINTS ====================
app.get("/api/v1/tasks/queue", requireKey, async (req, res) => {
  try {
    // Get active tasks/projects
    const queueStatus = executionQueue.getStatus();
    
    // Get tasks from database (pending, running, and recent completed)
    const dbTasks = await pool.query(
      `SELECT task_id, type, description, status, created_at, completed_at, result, error, ai_model
       FROM execution_tasks
       WHERE status IN ('pending', 'running', 'queued')
       ORDER BY 
         CASE status
           WHEN 'running' THEN 1
           WHEN 'queued' THEN 2
           WHEN 'pending' THEN 3
           ELSE 4
         END,
         created_at ASC
       LIMIT 50`
    );
    
    // Get active task progress if available
    const activeTask = queueStatus.currentTask;
    
    // Format for command center
    const projects = dbTasks.rows.map((task, index) => {
      const isRunning = task.status === 'running';
      const isActive = activeTask && activeTask.id === task.task_id;
      
      // Calculate progress
      let progress = 0;
      if (isRunning || isActive) {
        // If actively running, estimate progress based on time
        const createdTime = new Date(task.created_at).getTime();
        const now = Date.now();
        const elapsed = (now - createdTime) / 1000 / 60; // minutes
        // Estimate 10-15 minutes per task on average
        progress = Math.min(95, Math.round((elapsed / 12) * 100));
      } else {
        // Queued tasks: progress based on position
        const queuePosition = index;
        progress = 0;
      }
      
      // Estimate ETA based on task type and position
      let eta = 'Calculating...';
      if (isRunning || isActive) {
        const createdTime = new Date(task.created_at).getTime();
        const now = Date.now();
        const elapsed = (now - createdTime) / 1000 / 60; // minutes
        const estimatedTotal = 12; // average 12 minutes per task
        const remaining = Math.max(1, Math.ceil(estimatedTotal - elapsed));
        eta = `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`;
      } else {
        // Calculate ETA based on queue position and average task time
        const queuePosition = index;
        const avgTaskTime = 12; // minutes
        const minutes = Math.ceil(queuePosition * avgTaskTime);
        if (minutes < 60) {
          eta = `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          eta = `~${hours}h ${mins}m`;
        }
      }
      
      return {
        id: task.task_id,
        title: task.description?.substring(0, 80) || task.type || 'Task',
        description: task.description || '',
        status: task.status || 'pending',
        progress: isRunning || isActive ? progress : 0,
        eta,
        priority: 'high',
        type: task.type,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        result: task.result,
        error: task.error,
        aiModel: task.ai_model,
      };
    });

    res.json({ 
      ok: true, 
      tasks: projects,
      queueSize: queueStatus.queued || 0,
      active: queueStatus.active || 0,
      currentTask: activeTask,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ai/performance", requireKey, async (req, res) => {
  try {
    // Get AI performance scores
    const scores = Array.from(aiPerformanceScores.entries()).map(([member, score]) => ({
      member,
      accuracy: score.accuracy || 0,
      self_evaluation: score.self_evaluation || 0,
      total_guesses: score.total_guesses || 0,
      correct_guesses: score.correct_guesses || 0,
    }));

    const avgAccuracy = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length 
      : 0;
    
    const avgSelfEval = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.self_evaluation, 0) / scores.length
      : 0;

    res.json({
      ok: true,
      accuracy: avgAccuracy,
      self_evaluation: avgSelfEval,
      scores,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/ai/self-evaluate", requireKey, async (req, res) => {
  try {
    const { user_input, ai_response, member = 'chatgpt' } = req.body;

    // AI evaluates its own response
    const evaluationPrompt = `Evaluate your own response to this user input:

USER INPUT: ${user_input}
YOUR RESPONSE: ${ai_response}

Rate your response on:
1. Accuracy (0-1): Did you answer correctly?
2. Completeness (0-1): Did you address all aspects?
3. Relevance (0-1): Was your response relevant?
4. User satisfaction prediction (0-1): How satisfied would the user be?

Respond with JSON: {"accuracy": 0.0-1.0, "completeness": 0.0-1.0, "relevance": 0.0-1.0, "satisfaction": 0.0-1.0}`;

    const evaluation = await callCouncilMember(member, evaluationPrompt);
    
    // Parse evaluation
    let scores = { accuracy: 0.5, completeness: 0.5, relevance: 0.5, satisfaction: 0.5 };
    try {
      const jsonMatch = evaluation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse self-evaluation:', e);
    }

    // Store evaluation
    if (!aiPerformanceScores.has(member)) {
      aiPerformanceScores.set(member, {
        accuracy: 0,
        self_evaluation: 0,
        total_guesses: 0,
        correct_guesses: 0,
        evaluations: [],
      });
    }

    const memberScore = aiPerformanceScores.get(member);
    memberScore.evaluations.push({
      user_input,
      ai_response,
      scores,
      timestamp: new Date().toISOString(),
    });

    // Update averages
    const avgAccuracy = memberScore.evaluations.reduce((sum, e) => sum + e.scores.accuracy, 0) / memberScore.evaluations.length;
    const avgSelfEval = memberScore.evaluations.reduce((sum, e) => sum + (e.scores.satisfaction || e.scores.accuracy), 0) / memberScore.evaluations.length;
    
    memberScore.accuracy = avgAccuracy;
    memberScore.self_evaluation = avgSelfEval;
    memberScore.total_guesses++;

    res.json({ ok: true, scores, member });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Cost saving re-examination endpoint
app.post("/api/v1/system/re-examine-costs", requireKey, async (req, res) => {
  try {
    if (!costReExamination) {
      return res.status(503).json({ error: "Cost re-examination not initialized" });
    }
    const analysis = await costReExamination.examine();
    res.json({ ok: true, analysis });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== LOG MONITORING ENDPOINTS ====================
app.post("/api/v1/system/monitor-logs", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const result = await logMonitor.monitorLogs();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/fix-history", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const history = await logMonitor.getFixHistory(parseInt(req.query.limit) || 50);
    res.json({ ok: true, history, count: history.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== LOG MONITORING ENDPOINTS ====================
app.post("/api/v1/system/monitor-logs", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const result = await logMonitor.monitorLogs();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/fix-history", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const history = await logMonitor.getFixHistory(parseInt(req.query.limit) || 50);
    res.json({ ok: true, history, count: history.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MISSING OVERLAY ENDPOINTS ====================

// AI Effectiveness ratings
app.get("/api/v1/ai/effectiveness", requireKey, async (req, res) => {
  try {
    // Get effectiveness ratings for each AI member
    const ratings = [];
    const members = ['chatgpt', 'gemini', 'deepseek', 'grok', 'claude'];
    
    for (const member of members) {
      const memberScore = aiPerformanceScores.get(member) || {
        accuracy: 0.5,
        self_evaluation: 0.5,
        total_guesses: 0,
        correct_guesses: 0,
      };
      
      // Calculate effectiveness (weighted average of accuracy and self-evaluation)
      const effectiveness = (memberScore.accuracy * 0.6 + memberScore.self_evaluation * 0.4);
      
      ratings.push({
        member,
        effectiveness,
        accuracy: memberScore.accuracy,
        self_evaluation: memberScore.self_evaluation,
        taskType: 'general',
        total_tasks: memberScore.total_guesses || 0,
      });
    }
    
    res.json({ ok: true, ratings });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// User simulation accuracy
app.get("/api/v1/user/simulation/accuracy", requireKey, async (req, res) => {
  try {
    // Placeholder: return a default accuracy score
    // In a real implementation, this would track how well the system predicts user behavior
    const accuracyPercent = 75; // Default 75% accuracy
    
    res.json({ 
      ok: true, 
      accuracyPercent,
      accuracy: accuracyPercent / 100,
      note: "User simulation accuracy tracking"
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Internal autopilot cron heartbeat
app.get("/internal/cron/autopilot", requireKey, async (req, res) => {
  try {
    // Heartbeat endpoint for autopilot cron jobs
    const queueStatus = executionQueue.getStatus();
    const spendStatus = await getDailySpend();
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      queued_tasks: queueStatus.queued || 0,
      active_tasks: queueStatus.active || 0,
      daily_spend: spendStatus.daily_spend || 0,
      max_daily_spend: spendStatus.max_daily_spend || MAX_DAILY_SPEND,
      spend_percentage: spendStatus.spend_percentage || '0%',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Internal autopilot build-now
app.post("/internal/autopilot/build-now", requireKey, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.body.force === true;
    
    // Check if autoBuilder is available
    if (!autoBuilder) {
      // Try to initialize if not available
      try {
        const { AutoBuilder } = await import("./core/auto-builder.js");
        autoBuilder = new AutoBuilder(pool, callCouncilMember, executionQueue, getCouncilConsensus);
        await autoBuilder.start();
      } catch (initError) {
        console.warn('AutoBuilder not available:', initError.message);
        return res.json({
          ok: true,
          skipped: true,
          reason: 'AutoBuilder not initialized',
          message: 'Autopilot build system not available'
        });
      }
    }
    
    // Trigger build
    const result = await autoBuilder.runBuildCycle({ force });
    
    res.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Autopilot build-now error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Overlay state management
app.post("/api/overlay/:sid/state", requireKey, async (req, res) => {
  try {
    const { sid } = req.params;
    const state = req.body;
    
    // Store overlay state (could use Redis or database in production)
    // For now, just return success
    res.json({
      ok: true,
      sessionId: sid,
      state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Overlay status
app.get("/api/overlay/status", async (req, res) => {
  try {
    // Return overlay system status
    const queueStatus = executionQueue.getStatus();
    const spendStatus = await getDailySpend();
    
    res.json({
      ok: true,
      status: "active",
      queued_tasks: queueStatus.queued || 0,
      active_tasks: queueStatus.active || 0,
      daily_spend: spendStatus.daily_spend || 0,
      max_daily_spend: spendStatus.max_daily_spend || MAX_DAILY_SPEND,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function analyzeCostSavings() {
  // Analyze current cost optimization strategies
  const analysis = {
    current_savings: {
      cache_hit_rate: compressionMetrics.cache_hits / (compressionMetrics.cache_hits + compressionMetrics.cache_misses) || 0,
      model_downgrades: compressionMetrics.model_downgrades,
      prompt_optimizations: compressionMetrics.prompt_optimizations,
      tokens_saved: compressionMetrics.tokens_saved_total,
    },
    recommendations: [],
    potential_savings: [],
  };

  // Check cache performance
  if (analysis.current_savings.cache_hit_rate < 0.5) {
    analysis.recommendations.push({
      type: 'cache',
      issue: 'Low cache hit rate',
      suggestion: 'Increase cache TTL or improve cache key generation',
      potential_savings: '20-30%',
    });
  }

  // Check model selection
  if (compressionMetrics.model_downgrades < 10) {
    analysis.recommendations.push({
      type: 'model_selection',
      issue: 'Not using cheaper models enough',
      suggestion: 'Route more tasks to Tier 0 (free/cheap models)',
      potential_savings: '80-95%',
    });
  }

  // Check prompt optimization
  if (compressionMetrics.prompt_optimizations < 50) {
    analysis.recommendations.push({
      type: 'prompt_optimization',
      issue: 'Prompts not being optimized',
      suggestion: 'Enable automatic prompt compression',
      potential_savings: '10-15%',
    });
  }

  return analysis;
}

app.post("/api/v1/trial/start", requireKey, async (req, res) => {
  try {
    const { source = 'overlay' } = req.body;
    const userId = req.headers['x-user-id'] || 'default';
    const commandKey = req.headers['x-command-key'];

    // Check if already has active trial
    const existing = await pool.query(
      `SELECT * FROM user_trials 
       WHERE (user_id = $1 OR command_key = $2) AND active = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId, commandKey]
    );

    if (existing.rows.length > 0) {
      const trial = existing.rows[0];
      const trialEnd = new Date(trial.created_at);
      trialEnd.setDate(trialEnd.getDate() + (trial.duration_days || 7));
      
      if (new Date() < trialEnd) {
        return res.json({
          ok: true,
          message: 'Trial already active',
          trialEndsAt: trialEnd.toISOString(),
        });
      }
    }

    // Create new trial
    const result = await pool.query(
      `INSERT INTO user_trials (user_id, command_key, duration_days, active, source, created_at)
       VALUES ($1, $2, $3, true, $4, NOW())
       RETURNING *`,
      [userId, commandKey, 7, source]
    );

    res.json({
      ok: true,
      trial: result.rows[0],
      message: 'Free trial started! 7 days of full access.',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Phone System Endpoints (Twilio)
app.post("/api/v1/phone/call", requireKey, async (req, res) => {
  try {
    const { to, from, message, aiMember = "chatgpt" } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Phone number (to) and message required" });
    }
    const result = await makePhoneCall(to, from, message, aiMember);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/phone/sms", requireKey, async (req, res) => {
  try {
    const { to, message, aiMember = "chatgpt" } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Phone number (to) and message required" });
    }
    const result = await sendSMS(to, message, aiMember);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/phone/call-handler", async (req, res) => {
  // Twilio webhook handler for call events
  try {
    const { CallSid, CallStatus, From, To } = req.body;
    console.log(`📞 Call event: ${CallSid} - ${CallStatus} from ${From} to ${To}`);
    
    // Use AI to generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is LifeOS AI assistant. How can I help you today?</Say>
  <Gather input="speech" action="/api/v1/phone/call-process" method="POST">
    <Say>Please speak your message.</Say>
  </Gather>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    res.status(500).send(`<Response><Say>Error processing call</Say></Response>`);
  }
});

app.post("/api/v1/phone/call-process", async (req, res) => {
  // Process voice input from phone call
  try {
    const { SpeechResult, From, To } = req.body;
    if (SpeechResult) {
      // Send to AI council for processing (with compression for cost savings)
      const response = await callCouncilWithFailover(SpeechResult, "chatgpt", { compress: true });
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${response}</Say>
  <Gather input="speech" action="/api/v1/phone/call-process" method="POST">
    <Say>Anything else I can help with?</Say>
  </Gather>
  <Say>Thank you for calling. Goodbye.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      res.type('text/xml');
      res.send(`<Response><Say>I didn't catch that. Please try again.</Say></Response>`);
    }
  } catch (error) {
    res.status(500).send(`<Response><Say>Error: ${error.message}</Say></Response>`);
  }
});

// ── Project Backlog ───────────────────────────────────────────────────────────

// List all projects in priority order
app.get("/api/v1/projects/backlog", requireKey, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, amendment, priority, status, notes,
              last_triggered_at, completed_at, created_at
       FROM project_backlog
       ORDER BY priority ASC`
    );
    res.json({ ok: true, projects: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add a new project to the backlog
app.post("/api/v1/projects/backlog", requireKey, async (req, res) => {
  try {
    const { name, description, priority, notes } = req.body;
    if (!name || !description) {
      return res.status(400).json({ ok: false, error: 'name and description required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO project_backlog (name, description, priority, notes, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [name, description, priority ?? 50, notes ?? null]
    );
    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mark a project complete → system moves to next one
app.post("/api/v1/projects/backlog/:id/complete", requireKey, async (req, res) => {
  try {
    const { id } = req.params;
    if (ctx.autonomyOrchestrator?.completeProject) {
      await ctx.autonomyOrchestrator.completeProject(Number(id));
    } else {
      await pool.query(
        `UPDATE project_backlog SET status = 'complete', completed_at = NOW() WHERE id = $1`,
        [id]
      );
    }
    res.json({ ok: true, message: `Project ${id} marked complete` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Skip current project → activate next pending one
app.post("/api/v1/projects/backlog/:id/skip", requireKey, async (req, res) => {
  try {
    const { id } = req.params;
    if (ctx.autonomyOrchestrator?.skipProject) {
      await ctx.autonomyOrchestrator.skipProject(Number(id));
    } else {
      await pool.query(
        `UPDATE project_backlog SET status = 'skipped' WHERE id = $1`,
        [id]
      );
    }
    res.json({ ok: true, message: `Project ${id} skipped` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Reactivate a skipped/complete project
app.post("/api/v1/projects/backlog/:id/reactivate", requireKey, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE project_backlog SET status = 'pending', completed_at = NULL WHERE id = $1`,
      [id]
    );
    res.json({ ok: true, message: `Project ${id} reactivated` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update priority / notes
app.patch("/api/v1/projects/backlog/:id", requireKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, notes } = req.body;
    const updates = [];
    const vals = [];
    let i = 1;
    if (priority !== undefined) { updates.push(`priority = $${i++}`); vals.push(priority); }
    if (notes !== undefined)    { updates.push(`notes = $${i++}`);    vals.push(notes); }
    if (updates.length === 0) return res.status(400).json({ ok: false, error: 'nothing to update' });
    vals.push(id);
    await pool.query(
      `UPDATE project_backlog SET ${updates.join(', ')} WHERE id = $${i}`,
      vals
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Stripe endpoints (safe) ───────────────────────────────────────────────────

// Stripe endpoints (safe)
app.post(
  "/api/v1/stripe/checkout-session",
  requireKey,
  async (req, res) => {
    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        return res
          .status(503)
          .json({ ok: false, error: "Stripe not configured" });
      }

      const {
        amount,
        currency = "usd",
        mode = "payment",
        metadata = {},
        success_url,
        cancel_url,
        description,
      } = req.body || {};

      const cleanAmount = Number(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        return res
          .status(400)
          .json({ ok: false, error: "Valid amount required" });
      }

      const origin = req.headers.origin || "";
      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description || "Service",
              },
              unit_amount: Math.round(cleanAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url:
          success_url ||
          `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/cancel`,
        metadata,
      });

      res.json({ ok: true, id: session.id, url: session.url });
    } catch (err) {
      console.error("Stripe checkout error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);


}
