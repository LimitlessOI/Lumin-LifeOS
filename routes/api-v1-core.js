/**
 * Core API v1 routes: tasks, ideas, snapshot, drones, comprehensive ideas, vapi.
 * Register with: registerApiV1CoreRoutes(app, getDeps)
 * getDeps() must return { pool, requireKey, executionQueue, ideaEngine, taskTracker, recallConversationMemory,
 *   createSystemSnapshot, rollbackToSnapshot, implementNextQueuedIdea, incomeDroneSystem, callCouncilMember }
 * and mutable refs for comprehensiveIdeaTracker, vapiIntegration (lazy init in handlers).
 */
export function registerApiV1CoreRoutes(app, getDeps) {
  const auth = (req, res, next) => {
    const d = getDeps();
    if (!d?.requireKey) return res.status(503).json({ error: "Service starting up" });
    return d.requireKey(req, res, next);
  };

  app.post("/api/v1/task", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { type = "general", description } = req.body;
      if (!description) return res.status(400).json({ error: "Description required" });
      const taskId = await d.executionQueue.addTask(type, description);
      res.json({ ok: true, taskId });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/tasks", auth, async (req, res) => {
    try {
      const d = getDeps();
      const status = d.executionQueue.getStatus();
      res.json({ ok: true, ...status });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/tasks/:taskId/details", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { taskId } = req.params;
      const taskResult = await d.pool.query(
        `SELECT task_id, type, description, status, created_at, completed_at, result, error, ai_model
         FROM execution_tasks WHERE task_id = $1`,
        [taskId]
      );
      if (taskResult.rows.length === 0) return res.status(404).json({ ok: false, error: "Task not found" });
      const task = taskResult.rows[0];
      let steps = [];
      let verificationResults = [];
      try {
        if (d.taskTracker) {
          const taskData = await d.taskTracker.getTask(taskId);
          if (taskData) {
            steps = taskData.steps || [];
            verificationResults = taskData.verificationResults || [];
          }
        }
      } catch (e) {
        console.warn("Could not get task tracker data:", e.message);
      }
      let filesModified = [];
      if (task.result && task.result.includes("filesModified")) {
        try {
          const resultData = JSON.parse(task.result);
          filesModified = resultData.filesModified || [];
        } catch (_) {}
      }
      res.json({
        ok: true,
        task: {
          id: task.task_id,
          type: task.type,
          description: task.description,
          status: task.status,
          createdAt: task.created_at,
          completedAt: task.completed_at,
          result: task.result,
          error: task.error,
          aiModel: task.ai_model,
          steps,
          verificationResults,
          filesModified,
          whatIsBeingBuilt: task.description,
        },
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/memory/search", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { q = "", limit = 50 } = req.query;
      const memories = await d.recallConversationMemory(q, parseInt(limit));
      res.json({ ok: true, count: memories.length, memories });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/ideas/generate", auth, async (req, res) => {
    try {
      const d = getDeps();
      if (!d.ideaEngine) return res.status(503).json({ ok: false, error: "Idea engine not initialized" });
      await d.ideaEngine.generateDailyIdeas();
      res.json({ ok: true, ideasGenerated: d.ideaEngine.getIdeaCount() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/analysis/spending-breakdown", auth, async (req, res) => {
    try {
      const d = getDeps();
      const spending = await d.pool.query(`SELECT date, usd, updated_at FROM daily_spend ORDER BY date DESC LIMIT 30`);
      const ideas = await d.pool.query(`SELECT idea_id, idea_title, idea_description, proposed_by, status, votes_for, votes_against, created_at FROM daily_ideas ORDER BY created_at DESC`);
      const opportunities = await d.pool.query(`SELECT id, drone_id, opportunity_type, data, status, revenue_estimate, created_at FROM drone_opportunities ORDER BY created_at DESC`);
      const tasks = await d.pool.query(`SELECT task_id, type, description, status, created_at, completed_at, result FROM execution_tasks ORDER BY created_at DESC LIMIT 100`);
      const aiUsage = await d.pool.query(
        `SELECT ai_member, task_type, COUNT(*) as call_count, SUM(cost) as total_cost, AVG(duration_ms) as avg_duration, SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count
         FROM ai_performance WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY ai_member, task_type ORDER BY total_cost DESC`
      );
      const totalSpend = spending.rows.reduce((sum, row) => sum + parseFloat(row.usd || 0), 0);
      const totalOpportunityValue = opportunities.rows.reduce((sum, row) => sum + parseFloat(row.revenue_estimate || 0), 0);
      const roi = totalOpportunityValue > 0 ? totalOpportunityValue / totalSpend : 0;
      res.json({
        ok: true,
        summary: {
          totalSpend: totalSpend.toFixed(2),
          totalOpportunities: opportunities.rows.length,
          totalOpportunityValue: totalOpportunityValue.toFixed(2),
          totalIdeas: ideas.rows.length,
          totalTasks: tasks.rows.length,
          roi: roi.toFixed(2),
          roiPercentage: ((roi - 1) * 100).toFixed(1) + "%",
        },
        spending: spending.rows,
        ideas: ideas.rows,
        opportunities: opportunities.rows,
        tasks: tasks.rows,
        aiUsage: aiUsage.rows,
      });
    } catch (error) {
      console.error("Spending analysis error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/ideas", auth, async (req, res) => {
    try {
      const d = getDeps();
      const ideas = await d.pool.query(`SELECT * FROM daily_ideas WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY votes_for DESC`);
      res.json({ ok: true, ideas: ideas.rows });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/blindspots", auth, async (req, res) => {
    try {
      const d = getDeps();
      const blindSpots = await d.pool.query(`SELECT * FROM blind_spots ORDER BY created_at DESC LIMIT 20`);
      res.json({ ok: true, blindSpots: blindSpots.rows });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/snapshot", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { reason = "Manual snapshot" } = req.body;
      const snapshotId = await d.createSystemSnapshot(reason);
      res.json({ ok: true, snapshotId });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/rollback/:snapshotId", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { snapshotId } = req.params;
      const result = await d.rollbackToSnapshot(snapshotId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/system/implement-next-idea", auth, async (req, res) => {
    try {
      const d = getDeps();
      const result = await d.implementNextQueuedIdea();
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/drones/deploy", auth, async (req, res) => {
    try {
      const d = getDeps();
      const { type = "affiliate", expectedRevenue = 500 } = req.body;
      const droneId = await d.incomeDroneSystem.deployDrone(type, expectedRevenue);
      res.json({ ok: true, droneId });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/drones", auth, async (req, res) => {
    try {
      const d = getDeps();
      const status = await d.incomeDroneSystem.getStatus();
      res.json({ ok: true, ...status });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Comprehensive idea tracker (lazy init)
  const ensureComprehensiveTracker = async (d) => {
    if (d.comprehensiveIdeaTracker) return;
    const m = await import("../core/comprehensive-idea-tracker.js");
    d.comprehensiveIdeaTracker = new m.ComprehensiveIdeaTracker(d.pool);
  };

  app.post("/api/v1/ideas/comprehensive", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const ideaId = await d.comprehensiveIdeaTracker.storeIdea(req.body);
      res.json({ ok: true, ideaId });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/ideas/comprehensive", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const ideas = await d.comprehensiveIdeaTracker.getIdeas(req.query);
      res.json({ ok: true, count: ideas.length, ideas });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/ideas/comprehensive/search", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const { q } = req.query;
      const ideas = await d.comprehensiveIdeaTracker.searchIdeas(q);
      res.json({ ok: true, count: ideas.length, ideas });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/ideas/comprehensive/statistics", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const stats = await d.comprehensiveIdeaTracker.getStatistics();
      res.json({ ok: true, statistics: stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/ideas/export", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const exportData = await d.comprehensiveIdeaTracker.exportAllIdeas();
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/ideas/comprehensive/:ideaId/contribute", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const { author, contribution } = req.body;
      const contributionData = await d.comprehensiveIdeaTracker.addContribution(req.params.ideaId, author, contribution);
      res.json({ ok: true, contribution: contributionData });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.put("/api/v1/ideas/comprehensive/:ideaId/status", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureComprehensiveTracker(d);
      const { status, reason } = req.body;
      await d.comprehensiveIdeaTracker.updateStatus(req.params.ideaId, status, reason);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Vapi (lazy init)
  const ensureVapi = async (d) => {
    if (d.vapiIntegration) return;
    const vapiModule = await import("../core/vapi-integration.js");
    d.vapiIntegration = new vapiModule.VapiIntegration(d.pool, d.callCouncilMember);
    await d.vapiIntegration.initialize();
  };

  app.post("/api/v1/vapi/call", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureVapi(d);
      const callData = await d.vapiIntegration.makeCall(req.body);
      res.json({ ok: true, call: callData });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/v1/vapi/webhook", async (req, res) => {
    try {
      const d = getDeps();
      if (!d?.pool) return res.status(503).json({ error: "Starting up" });
      await ensureVapi(d);
      const { event, data } = req.body;
      await d.vapiIntegration.handleWebhook(event, data);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/v1/vapi/calls", auth, async (req, res) => {
    try {
      const d = getDeps();
      await ensureVapi(d);
      const { limit = 50 } = req.query;
      const calls = await d.vapiIntegration.getCallHistory(parseInt(limit));
      res.json({ ok: true, count: calls.length, calls });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  console.log("✅ [ROUTES] api-v1-core registered");
}
