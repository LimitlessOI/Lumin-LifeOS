/**
 * Auto-Builder Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import logger from '../services/logger.js';

export function createAutoBuilderRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilMember,
    executionQueue,
    selfBuilder,
    ideaToImplementationPipeline,
    autoBuilder,
    getStripeClient,
    RAILWAY_PUBLIC_DOMAIN,
  } = ctx;

// ==================== AUTO-BUILDER ENDPOINTS ====================
app.get("/api/v1/auto-builder/status", requireKey, async (req, res) => {
  try {
    // Get auto-builder status if available
    let builderStatus = null;
    try {
      const autoBuilderMod = await import("./core/auto-builder.js");
      builderStatus = typeof autoBuilderMod.getStatus === "function" ? autoBuilderMod.getStatus() : null;
    } catch (e) {
      // Builder not initialized yet
    }

    // Get opportunity counts
    const revenueOpps = await pool.query(
      `SELECT COUNT(*) as count, 
              SUM(revenue_potential) as total_potential,
              AVG(time_to_implement) as avg_time
       FROM revenue_opportunities 
       WHERE status IN ('pending', 'building')`
    );

    const droneOpps = await pool.query(
      `SELECT COUNT(*) as count,
              SUM(revenue_estimate) as total_estimate
       FROM drone_opportunities 
       WHERE status IN ('pending', 'building')`
    );

    const builds = await pool.query(
      `SELECT COUNT(*) as count,
              COUNT(*) FILTER (WHERE status = 'deployed') as deployed_count
       FROM build_artifacts`
    );

    res.json({
      ok: true,
      builder: builderStatus,
      opportunities: {
        revenue: {
          pending: parseInt(revenueOpps.rows[0]?.count || 0),
          total_potential: parseFloat(revenueOpps.rows[0]?.total_potential || 0),
          avg_time: parseFloat(revenueOpps.rows[0]?.avg_time || 0),
        },
        drone: {
          pending: parseInt(droneOpps.rows[0]?.count || 0),
          total_estimate: parseFloat(droneOpps.rows[0]?.total_estimate || 0),
        },
      },
      builds: {
        total: parseInt(builds.rows[0]?.count || 0),
        deployed: parseInt(builds.rows[0]?.deployed_count || 0),
      },
    });
  } catch (error) {
    console.error("Auto-builder status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/auto-builder/prioritize", requireKey, async (req, res) => {
  try {
    const { opportunity_id, priority, source = 'revenue' } = req.body;

    if (!opportunity_id || priority === undefined) {
      return res.status(400).json({ ok: false, error: "opportunity_id and priority required" });
    }

    if (source === 'revenue') {
      await pool.query(
        `UPDATE revenue_opportunities 
         SET priority = $1 
         WHERE opportunity_id = $2`,
        [priority, opportunity_id]
      );
    } else {
      await pool.query(
        `UPDATE drone_opportunities 
         SET priority = $1 
         WHERE id = $2`,
        [priority, parseInt(opportunity_id)]
      );
    }

    res.json({
      ok: true,
      message: `Priority set to ${priority} for opportunity ${opportunity_id}`,
    });
  } catch (error) {
    console.error("Priority update error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/auto-builder/build-now", requireKey, async (req, res) => {
  try {
    const { opportunity_id, source = 'revenue' } = req.body;

    if (!opportunity_id) {
      return res.status(400).json({ ok: false, error: "opportunity_id required" });
    }

    // Get opportunity
    let opportunity;
    if (source === 'revenue') {
      const result = await pool.query(
        `SELECT 
           'revenue' as source,
           opportunity_id as id,
           name,
           revenue_potential,
           time_to_implement,
           required_resources,
           market_demand,
           competitive_advantage,
           status
         FROM revenue_opportunities
         WHERE opportunity_id = $1`,
        [opportunity_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Opportunity not found" });
      }
      opportunity = result.rows[0];
    } else {
      const result = await pool.query(
        `SELECT 
           'drone' as source,
           id::text as id,
           opportunity_type as name,
           revenue_estimate as revenue_potential,
           1 as time_to_implement,
           data as required_resources,
           'High' as market_demand,
           'Automated' as competitive_advantage,
           status
         FROM drone_opportunities
         WHERE id = $1`,
        [parseInt(opportunity_id)]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Opportunity not found" });
      }
      opportunity = result.rows[0];
    }

    // Import and use auto-builder
    const { AutoBuilder } = await import("./core/auto-builder.js");
    const builder = new AutoBuilder(pool, callCouncilMember, executionQueue);

    // Start build (async)
    builder.buildOpportunity(opportunity).catch(err => {
      console.error(`Build error:`, err);
    });

    res.json({
      ok: true,
      message: `Build started for ${opportunity.name || opportunity_id}`,
      opportunity_id,
    });
  } catch (error) {
    console.error("Build-now error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VIRTUAL REAL ESTATE CLASS ====================
app.post("/api/v1/class/enroll", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Check if already enrolled
    const existing = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        enrollment: existing.rows[0],
        message: "Already enrolled",
      });
    }

    // Create enrollment (free)
    const result = await pool.query(
      `INSERT INTO virtual_class_enrollments (student_email, student_name, progress, current_module, completed_modules)
       VALUES ($1, $2, '{}', 'module_1', '[]')
       RETURNING *`,
      [email, name || null]
    );

    res.json({
      ok: true,
      enrollment: result.rows[0],
      message: "Enrolled in free virtual real estate class",
    });
  } catch (error) {
    console.error("Class enrollment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/class/upgrade-to-express", requireKey, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Get class enrollment
    const classEnrollment = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (classEnrollment.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not enrolled in class" });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    // Create or get lead
    let leadResult = await pool.query(
      "SELECT * FROM recruitment_leads WHERE email = $1 OR phone = (SELECT phone FROM recruitment_leads WHERE email = $1 LIMIT 1)",
      [email]
    );

    let leadId;
    if (leadResult.rows.length === 0) {
      const newLead = await pool.query(
        `INSERT INTO recruitment_leads (name, email, source, status)
         VALUES ($1, $2, 'class_upgrade', 'enrolled')
         RETURNING *`,
        [classEnrollment.rows[0].student_name, email]
      );
      leadId = newLead.rows[0].id;
    } else {
      leadId = leadResult.rows[0].id;
    }

    // Create BoldTrail agent account
    const agentResult = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, subscription_tier)
       VALUES ($1, $2, 'express')
       ON CONFLICT (email) DO UPDATE SET subscription_tier = 'express'
       RETURNING *`,
      [email, classEnrollment.rows[0].student_name]
    );

    // Create enrollment record
    const enrollmentResult = await pool.query(
      `INSERT INTO recruitment_enrollments (lead_id, agent_id, enrollment_tier, status, onboarding_stage, mastery_level)
       VALUES ($1, $2, 'express', 'enrolled', 'learning', 0)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [leadId, agentResult.rows[0].id]
    );

    // Initialize basic feature unlocks
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, 'email_drafting', false),
              ($1, 'showing_planner', false),
              ($1, 'basic_crm', false)
       ON CONFLICT DO NOTHING`,
      [agentResult.rows[0].id]
    );

    // Update class enrollment
    await pool.query(
      "UPDATE virtual_class_enrollments SET enrolled_in_express = true WHERE student_email = $1",
      [email]
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "BoldTrail Express Line",
              description: "Full system access + step-by-step success coaching",
            },
            unit_amount: 9900, // $99/month
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?success=true&express=true`,
      cancel_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/class?canceled=true`,
      metadata: { agent_id: agentResult.rows[0].id.toString(), enrollment_type: 'express' },
    });

    res.json({
      ok: true,
      message: "Upgraded to Express Line",
      agent: agentResult.rows[0],
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Express upgrade error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/class/modules", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM virtual_class_modules ORDER BY module_order ASC"
    );

    res.json({
      ok: true,
      modules: result.rows,
    });
  } catch (error) {
    console.error("Class modules error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/class/complete-module", requireKey, async (req, res) => {
  try {
    const { email, module_name } = req.body;

    if (!email || !module_name) {
      return res.status(400).json({ ok: false, error: "email and module_name required" });
    }

    // Update progress
    const enrollment = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not enrolled" });
    }

    // completed_modules is JSONB, so it's already an object/array, not a string
    const completed = enrollment.rows[0].completed_modules || [];
    const completedArray = Array.isArray(completed) ? completed : (typeof completed === 'string' ? JSON.parse(completed) : []);
    
    if (!completedArray.includes(module_name)) {
      completedArray.push(module_name);
    }

    await pool.query(
      `UPDATE virtual_class_enrollments 
       SET completed_modules = $1, updated_at = NOW()
       WHERE student_email = $2`,
      [JSON.stringify(completedArray), email]
    );

    // If enrolled in Express line, update mastery level
    if (enrollment.rows[0].enrolled_in_express) {
      const agentResult = await pool.query(
        "SELECT id FROM boldtrail_agents WHERE email = $1",
        [email]
      );

      if (agentResult.rows.length > 0) {
        const agentId = agentResult.rows[0].id;
        const enrollmentData = await pool.query(
          "SELECT * FROM recruitment_enrollments WHERE agent_id = $1",
          [agentId]
        );

        if (enrollmentData.rows.length > 0) {
          // Increase mastery level based on modules completed
          const newMasteryLevel = Math.min(completed.length, 10);
          await pool.query(
            `UPDATE recruitment_enrollments 
             SET mastery_level = $1, 
                 onboarding_stage = CASE 
                   WHEN $1 >= 7 THEN 'mastered'
                   WHEN $1 >= 3 THEN 'building'
                   ELSE 'learning'
                 END
             WHERE agent_id = $2`,
            [newMasteryLevel, agentId]
          );
        }
      }
    }

    res.json({
      ok: true,
      message: `Module ${module_name} completed`,
      completed_modules: completed,
    });
  } catch (error) {
    console.error("Module completion error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/set-vacation-mode", requireKey, async (req, res) => {
  try {
    const { agent_id, vacation_mode, busy_mode, return_date } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    const currentPrefs = await pool.query(
      "SELECT preferences FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );

    if (currentPrefs.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    const prefs = currentPrefs.rows[0].preferences || {};
    // Store as actual booleans, not strings
    if (vacation_mode !== undefined) prefs.vacation_mode = Boolean(vacation_mode);
    if (busy_mode !== undefined) prefs.busy_mode = Boolean(busy_mode);
    if (return_date) prefs.return_date = return_date;

    await pool.query(
      "UPDATE boldtrail_agents SET preferences = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(prefs), agent_id]
    );

    res.json({
      ok: true,
      message: vacation_mode ? "Vacation mode enabled" : busy_mode ? "Busy mode enabled" : "Mode updated",
      preferences: prefs,
    });
  } catch (error) {
    console.error("Vacation mode update error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/agent/:agentId/features", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    const features = await pool.query(
      "SELECT feature_name, unlocked_at FROM agent_feature_unlocks WHERE agent_id = $1",
      [agentId]
    );

    const enrollment = await pool.query(
      `SELECT e.mastery_level, e.onboarding_stage, e.unlocked_features
       FROM recruitment_enrollments e
       JOIN boldtrail_agents a ON e.agent_id = a.id
       WHERE a.id = $1`,
      [agentId]
    );

    res.json({
      ok: true,
      unlocked_features: features.rows,
      mastery_level: enrollment.rows[0]?.mastery_level || 0,
      onboarding_stage: enrollment.rows[0]?.onboarding_stage || 'learning',
      available_features: {
        basic: ['email_drafting', 'showing_planner', 'basic_crm'],
        advanced: { requires_mastery: 3, features: ['advanced_crm', 'analytics'] },
        automation: { requires_mastery: 5, features: ['youtube_automation', 'social_media'] },
        full: { requires_mastery: 7, features: ['full_automation', 'ai_content_generation'] },
      },
    });
  } catch (error) {
    console.error("Feature check error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SELF-BUILDER ENDPOINTS ====================
app.post("/api/v1/system/build", requireKey, async (req, res) => {
  try {
    if (!selfBuilder) {
      return res.status(503).json({ error: "Self-Builder not initialized" });
    }

    const {
      installDependencies = true,
      runTests = false,
      validateSyntax = true,
      commitChanges = false,
      pushToGit = false,
      triggerDeployment = false,
      message = 'Self-build: Automated build',
    } = req.body;

    console.log('🔨 [API] Build requested via API');
    
    const buildResult = await selfBuilder.build({
      installDependencies,
      runTests,
      validateSyntax,
      commitChanges,
      pushToGit,
      triggerDeployment,
      strict: false,
    });

    res.json({
      ok: buildResult.success,
      build: buildResult,
      message: buildResult.success 
        ? 'Build completed successfully' 
        : `Build completed with ${buildResult.errors.length} error(s)`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/build-history", requireKey, async (req, res) => {
  try {
    if (!selfBuilder) {
      return res.status(503).json({ error: "Self-Builder not initialized" });
    }

    const limit = parseInt(req.query.limit || 10);
    const history = await selfBuilder.getBuildHistory(limit);
    
    res.json({ ok: true, count: history.length, builds: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== TASK COMPLETION TRACKER ENDPOINTS ====================
app.get("/api/v1/tasks/:taskId", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const task = await tracker.getTaskStatus(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ ok: true, task });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/tasks", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const activeTasks = await tracker.getActiveTasks();
    
    res.json({ ok: true, count: activeTasks.length, tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/tasks/:taskId/verify", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const { checks } = req.body;
    
    if (!checks || !Array.isArray(checks)) {
      return res.status(400).json({ error: "checks array required" });
    }
    
    const verification = await tracker.verifyCompletion(req.params.taskId, checks);
    
    res.json({ ok: true, ...verification });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== IDEA TO IMPLEMENTATION PIPELINE ENDPOINTS ====================
app.post("/api/v1/pipeline/implement-idea", requireKey, async (req, res) => {
  try {
    if (!ideaToImplementationPipeline) {
      return res.status(503).json({ error: "Idea-to-Implementation Pipeline not initialized" });
    }

    const { idea, autoDeploy = true, verifyCompletion = true } = req.body;
    
    if (!idea) {
      return res.status(400).json({ error: "idea required" });
    }

    const result = await ideaToImplementationPipeline.implementIdea(idea, {
      autoDeploy,
      verifyCompletion,
    });

    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/pipeline/auto-implement-queued", requireKey, async (req, res) => {
  try {
    if (!ideaToImplementationPipeline) {
      return res.status(503).json({ error: "Idea-to-Implementation Pipeline not initialized" });
    }

    const { limit = 5 } = req.body;
    
    const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(limit);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Financial Dashboard & ROI
app.get("/api/v1/dashboard", requireKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/roi/status", requireKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({
      ok: true,
      roi: {
        ...roiTracker,
        daily_spend: roiTracker.daily_ai_cost,
        ratio: roiTracker.roi_ratio,
      },
      dashboard,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Revenue events
app.post("/api/v1/revenue/event", requireKey, async (req, res) => {
  try {
    const {
      source = "manual",
      event_id,
      amount,
      currency = "USD",
      drone_id,
      description = "",
      category = "general",
      meta = {},
    } = req.body || {};

    if (amount == null) {
      return res.status(400).json({ ok: false, error: "amount is required" });
    }

    const result = await recordRevenueEvent({
      source,
      eventId: event_id || null,
      amount,
      currency,
      droneId: drone_id || null,
      description,
      category,
    });

    const roi = roiTracker;
    const droneStatus = await incomeDroneSystem.getStatus();

    res.json({
      ok: true,
      revenue: {
        source,
        event_id: event_id || null,
        amount: result.amount,
        currency,
        drone_id: drone_id || null,
        tx: result.tx,
        meta,
      },
      roi,
      drones: droneStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revenue event error:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Governance
app.post("/api/v1/proposal/create", requireKey, async (req, res) => {
  try {
    const { title, description, proposedBy = "system" } = req.body;
    if (!title || !description)
      return res
        .status(400)
        .json({ error: "Title and description required" });

    const proposalId = await createProposal(title, description, proposedBy);
    if (!proposalId)
      return res.status(500).json({ error: "Failed to create proposal" });

    res.json({ ok: true, proposalId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/proposal/:proposalId/vote", requireKey, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await conductEnhancedConsensus(proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// AI Performance
app.get("/api/v1/ai/performance", requireKey, async (req, res) => {
  try {
    const performance = await pool.query(
      `SELECT ai_member, 
              COUNT(*) as total_tasks,
              AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
              AVG(duration_ms) as avg_duration,
              SUM(cost) as total_cost,
              SUM(tokens_used) as total_tokens
       FROM ai_performance
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY ai_member
       ORDER BY success_rate DESC`
    );

    res.json({
      ok: true,
      performance: performance.rows,
      currentScores: Object.fromEntries(aiPerformanceScores),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Source of Truth endpoints
app.post("/api/v1/system/source-of-truth/store", requireKey, async (req, res) => {
  try {
    if (!sourceOfTruthManager) {
      return res.status(503).json({ error: "Source of Truth Manager not initialized" });
    }

    const { documentType = 'master_vision', title, content, section = null, version = '1.0', priority = 0 } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const success = await sourceOfTruthManager.storeDocument(documentType, title, content, section, version, priority);

    if (success) {
      res.json({ ok: true, message: "Source of Truth stored successfully" });
    } else {
      res.status(500).json({ ok: false, error: "Failed to store Source of Truth" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/source-of-truth", requireKey, async (req, res) => {
  try {
    if (!sourceOfTruthManager) {
      return res.status(503).json({ error: "Source of Truth Manager not initialized" });
    }

    const { documentType, section, formatted } = req.query;
    const includeInactive = req.query.includeInactive === 'true';

    if (formatted === 'true') {
      const formattedText = await sourceOfTruthManager.getFormattedForAI();
      return res.json({ ok: true, formatted: formattedText });
    }

    const docs = await sourceOfTruthManager.getDocument(documentType || null, section || null, includeInactive);
    res.json({ ok: true, documents: docs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// System metrics
// Cost savings diagnostic endpoint
app.get("/api/v1/system/cost-savings", requireKey, async (req, res) => {
  try {
    // Get current spend
    const spend = await getDailySpend();
    
    // Calculate cache hit rate
    const totalCacheRequests = compressionMetrics.cache_hits + compressionMetrics.cache_misses;
    const cacheHitRate = totalCacheRequests > 0 
      ? (compressionMetrics.cache_hits / totalCacheRequests) * 100 
      : 0;
    
    // Estimate savings
    const estimatedSavings = {
      fromCache: compressionMetrics.cache_hits * 0.001, // ~$0.001 per cache hit
      fromCompression: compressionMetrics.tokens_saved_total * 0.0000001, // ~$0.0000001 per token
      fromModelDowngrades: compressionMetrics.model_downgrades * 0.0005, // ~$0.0005 per downgrade
      fromOptimization: compressionMetrics.prompt_optimizations * 0.0001, // ~$0.0001 per optimization
    };
    
    const totalEstimatedSavings = Object.values(estimatedSavings).reduce((a, b) => a + b, 0);
    
    // Get ROI tracker data
    const roiData = roiTracker;
    
    res.json({
      ok: true,
      currentSpend: spend.daily_spend || spend || 0,
      maxSpend: spend.max_daily_spend || MAX_DAILY_SPEND,
      spendPercentage: spend.daily_spend ? ((spend.daily_spend / MAX_DAILY_SPEND) * 100).toFixed(1) + '%' : '0%',
      
      // Cost-saving measures status
      costSavingMeasures: {
        caching: {
          active: true,
          cacheHits: compressionMetrics.cache_hits,
          cacheMisses: compressionMetrics.cache_misses,
          hitRate: cacheHitRate.toFixed(1) + '%',
          working: cacheHitRate > 20, // >20% hit rate means it's working
          estimatedSavings: estimatedSavings.fromCache.toFixed(4),
        },
        compression: {
          active: true,
          compressions: compressionMetrics.v3_compressions,
          bytesSaved: compressionMetrics.total_bytes_saved,
          tokensSaved: compressionMetrics.tokens_saved_total,
          working: compressionMetrics.v3_compressions > 0,
          estimatedSavings: estimatedSavings.fromCompression.toFixed(4),
        },
        modelRouting: {
          active: true,
          downgrades: compressionMetrics.model_downgrades,
          working: compressionMetrics.model_downgrades > 0,
          estimatedSavings: estimatedSavings.fromModelDowngrades.toFixed(4),
        },
        promptOptimization: {
          active: true,
          optimizations: compressionMetrics.prompt_optimizations,
          working: compressionMetrics.prompt_optimizations > 0,
          estimatedSavings: estimatedSavings.fromOptimization.toFixed(4),
        },
      },
      
      // Overall assessment
      totalEstimatedSavings: totalEstimatedSavings.toFixed(4),
      savingsWorking: cacheHitRate > 20 || compressionMetrics.v3_compressions > 0 || compressionMetrics.model_downgrades > 0,
      
      // Recommendations
      recommendations: [
        cacheHitRate < 20 ? 'Cache hit rate is low - increase cache TTL or improve cache keys' : null,
        compressionMetrics.v3_compressions === 0 ? 'Compression not being used - check compression settings' : null,
        compressionMetrics.model_downgrades === 0 ? 'Model routing not downgrading - check model router settings' : null,
        compressionMetrics.prompt_optimizations === 0 ? 'Prompt optimization not active - check optimization settings' : null,
      ].filter(r => r !== null),
      
      roi: roiData,
      compression: compressionMetrics,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/metrics", requireKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      metrics: {
        system: systemMetrics,
        roi: roiTracker,
        compression: compressionMetrics,
        tasks: executionQueue.getStatus(),
        drones: await incomeDroneSystem.getStatus(),
        aiPerformance: Object.fromEntries(aiPerformanceScores),
        dailyIdeas: ideaEngine ? ideaEngine.getIdeaCount() : 0,
        snapshots: systemSnapshots.length,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== AUTO-BUILDER CONTROL ENDPOINTS ====================
// Trigger build manually
app.post('/api/build/run', async (req, res) => {
  try {
    const result = await autoBuilder.runCycleWithArtifacts('manual');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get build status
app.get('/api/build/status', (req, res) => {
  res.json(autoBuilder.getStatus());
});

// Reset failed components
app.post('/api/build/reset-failed', (req, res) => {
  const count = autoBuilder.resetAllFailed();
  res.json({ reset: count });
});

app.get("/api/v1/builder/receipts", requireKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await pool.query(
      `SELECT id, product, component, status, metadata, created_at
       FROM build_artifacts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ ok: true, receipts: result.rows, count: result.rows.length });
  } catch (err) {
    logger.error('[BUILDER] Failed to fetch receipts', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/v1/builder/enqueue", requireKey, async (req, res) => {
  try {
    const { instruction, description, priority = 'normal', ssotRef } = req.body;
    if (!instruction && !description) {
      return res.status(400).json({ ok: false, error: 'instruction or description required' });
    }
    const taskDesc = instruction || description;
    if (!executionQueue) {
      return res.status(503).json({ ok: false, error: 'Execution queue not available' });
    }
    const task = await executionQueue.addTask('build', taskDesc, { priority, ssotRef });
    res.json({ ok: true, taskId: task?.id || 'queued', description: taskDesc });
  } catch (err) {
    logger.error('[BUILDER] Failed to enqueue task', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});


}
