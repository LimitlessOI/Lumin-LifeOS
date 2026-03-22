/**
 * Autonomy scheduler: registers all scheduleAutonomyLoop / scheduleAutonomyOnce tasks.
 * getDeps() returns current refs (pool, crmSequenceRunner, logMonitor, etc.) so server.js only wires once at startup.
 */
import path from "path";
import { pathToFileURL } from "url";

async function handleAgentVacationMode(getDeps) {
  const { pool, callCouncilWithFailover } = getDeps() || {};
  if (!pool || !callCouncilWithFailover) return;
  try {
    const busyAgents = await pool.query(
      `SELECT a.*, e.onboarding_stage, e.mastery_level
       FROM boldtrail_agents a
       LEFT JOIN recruitment_enrollments e ON e.agent_id = a.id
       WHERE (a.preferences->>'vacation_mode' = 'true' OR (a.preferences->>'vacation_mode')::boolean = true)
       OR (a.preferences->>'busy_mode' = 'true' OR (a.preferences->>'busy_mode')::boolean = true)`
    );
    for (const agent of busyAgents.rows) {
      const pendingEmails = await pool.query(
        `SELECT * FROM boldtrail_email_drafts WHERE agent_id = $1 AND status = 'draft' AND created_at < NOW() - INTERVAL '4 hours' LIMIT 5`,
        [agent.id]
      );
      for (const email of pendingEmails.rows) {
        const autoResponsePrompt = `Draft a brief, professional auto-response email for a real estate agent who is temporarily unavailable.\nAgent's tone: ${agent.agent_tone || "professional"}\nRecipient: ${email.recipient_name || email.recipient_email}\nKeep it brief.`;
        try {
          const autoResponse = await callCouncilWithFailover(autoResponsePrompt, "chatgpt");
          await pool.query(
            `INSERT INTO boldtrail_email_drafts (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data, status)
             VALUES ($1, 'auto_response', $2, $3, $4, $5, $6, 'ready_to_send')`,
            [agent.id, email.recipient_email, email.recipient_name, `Re: ${email.subject || "Your inquiry"}`, autoResponse, JSON.stringify({ original_email_id: email.id, auto_generated: true })]
          );
        } catch (err) {
          console.error(`❌ Auto-response error for agent ${agent.id}:`, err.message);
        }
      }
      const upcomingShowings = await pool.query(
        `SELECT * FROM boldtrail_showings WHERE agent_id = $1 AND showing_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours' AND status = 'scheduled'`,
        [agent.id]
      );
      for (const showing of upcomingShowings.rows) {
        const reminderPrompt = `Draft a friendly reminder email for a property showing.\nAgent's tone: ${agent.agent_tone || "professional"}\nClient: ${showing.client_name}\nProperty: ${showing.property_address}\nKeep it brief.`;
        try {
          const reminder = await callCouncilWithFailover(reminderPrompt, "chatgpt");
          await pool.query(
            `INSERT INTO boldtrail_email_drafts (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data, status)
             VALUES ($1, 'showing_reminder', $2, $3, $4, $5, $6, 'ready_to_send')`,
            [agent.id, showing.client_email, showing.client_name, `Reminder: Showing at ${showing.property_address}`, reminder, JSON.stringify({ showing_id: showing.id, auto_generated: true })]
          );
        } catch (err) {
          console.error(`❌ Showing reminder error:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error("Vacation mode automation error:", error.message);
  }
}

async function checkBoldTrailFollowUps(getDeps) {
  const { pool, callCouncilWithFailover } = getDeps() || {};
  if (!pool || !callCouncilWithFailover) return;
  try {
    const result = await pool.query(
      `SELECT s.*, a.agent_tone FROM boldtrail_showings s JOIN boldtrail_agents a ON s.agent_id = a.id
       WHERE s.status = 'completed' AND s.showing_date < NOW() - INTERVAL '24 hours' AND s.showing_date > NOW() - INTERVAL '48 hours'
       AND NOT EXISTS (SELECT 1 FROM boldtrail_email_drafts WHERE agent_id = s.agent_id AND draft_type = 'followup' AND context_data->>'showing_id' = s.id::text AND created_at > s.showing_date)
       LIMIT 10`
    );
    for (const showing of result.rows) {
      const prompt = `Draft a follow-up email for a real estate agent after a property showing.\nAgent's tone: ${showing.agent_tone || "professional"}\nClient: ${showing.client_name || "Client"}\nProperty: ${showing.property_address}\nFormat as SUBJECT: [subject] then [body].`;
      try {
        const emailContent = await callCouncilWithFailover(prompt, "chatgpt");
        const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : `Follow-up: ${showing.property_address}`;
        const body = emailContent.replace(/SUBJECT:.*/i, "").trim();
        await pool.query(
          `INSERT INTO boldtrail_email_drafts (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [showing.agent_id, "followup", showing.client_email, showing.client_name, subject, body, JSON.stringify({ showing_id: showing.id, auto_generated: true })]
        );
        console.log(`✅ BoldTrail: Auto-generated follow-up for showing ${showing.id}`);
      } catch (err) {
        console.error(`❌ BoldTrail follow-up error for showing ${showing.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("BoldTrail follow-up check error:", error.message);
  }
}

/**
 * Start all autonomy loops. Call once at end of server startup.
 * getDeps() should return { pool, projectRoot, crmSequenceRunner, logMonitor, postUpgradeChecker, costReExamination,
 *   ideaToImplementationPipeline, ideaEngine, callCouncilWithFailover, syncStripeRevenue, STRIPE_SECRET_KEY,
 *   continuousSelfImprovement, rotateAIsBasedOnPerformance, tcoSalesAgent, enhancedConversationScraper }.
 */
export function startAutonomySchedulers(scheduleAutonomyLoop, scheduleAutonomyOnce, getDeps) {
  const d = () => getDeps() || {};

  scheduleAutonomyLoop("CRM_SEQUENCE_RUNNER", 60 * 1000, async () => {
    const { crmSequenceRunner } = d();
    if (crmSequenceRunner) await crmSequenceRunner.runDueEnrollments(25);
  }, 60 * 1000);

  scheduleAutonomyLoop("LOG_MONITOR", 5 * 60 * 1000, async () => {
    const { logMonitor } = d();
    if (logMonitor) {
      const result = await logMonitor.monitorLogs(true);
      if (result?.errors?.length > 0) console.log(`🔍 [LOG MONITOR] Checked logs: ${result.errors.length} errors, ${result.fixed || 0} fixed`);
    }
  }, 5 * 60 * 1000);

  scheduleAutonomyOnce("LOG_MONITOR_STARTUP", 30000, async () => {
    const { logMonitor } = d();
    if (logMonitor) await logMonitor.monitorLogs(true);
  });

  scheduleAutonomyOnce("POST_UPGRADE_CHECK", 15000, async () => {
    const { postUpgradeChecker } = d();
    if (postUpgradeChecker) await postUpgradeChecker.checkAfterUpgrade();
  });

  scheduleAutonomyOnce("FEATURE_INDEX", 20000, async () => {
    const { projectRoot } = d();
    if (!projectRoot) return;
    try {
      const indexScript = await import(pathToFileURL(path.join(projectRoot, "scripts", "index-feature-catalog.mjs")).href);
      if (indexScript.indexFeatureCatalog) await indexScript.indexFeatureCatalog();
    } catch (e) {
      console.warn("⚠️ FEATURE_INDEX:", e.message);
    }
  });

  scheduleAutonomyOnce("AUTO_RUN_GUIDES", 25000, async () => {
    const { projectRoot } = d();
    if (!projectRoot) return;
    try {
      const guidesScript = await import(pathToFileURL(path.join(projectRoot, "scripts", "auto-run-guides.mjs")).href);
      if (guidesScript.autoRunGuides) await guidesScript.autoRunGuides();
    } catch (e) {
      console.warn("⚠️ AUTO_RUN_GUIDES:", e.message);
    }
  });

  scheduleAutonomyLoop("EXTRACTOR_PERIODIC", 6 * 60 * 60 * 1000, async () => {
    const { enhancedConversationScraper } = d();
    if (enhancedConversationScraper) {
      const credentials = await enhancedConversationScraper.listStoredCredentials();
      if (credentials?.length > 0) {
        for (const cred of credentials) {
          try {
            await enhancedConversationScraper.scrapeAllConversations(cred.provider);
          } catch (err) {
            console.warn(`⚠️ [EXTRACTOR] Periodic scrape failed for ${cred.provider}:`, err.message);
          }
        }
      }
    }
  }, 6 * 60 * 60 * 1000);

  scheduleAutonomyLoop("COST_REEXAMINATION", 24 * 60 * 60 * 1000, async () => {
    const { costReExamination } = d();
    if (costReExamination) {
      await costReExamination.examine();
      console.log("💰 [COST] Automatic re-examination completed");
    }
  }, 24 * 60 * 60 * 1000);

  scheduleAutonomyLoop("PIPELINE_AUTO_IMPLEMENT", 10 * 60 * 1000, async () => {
    const { ideaToImplementationPipeline } = d();
    if (ideaToImplementationPipeline) {
      const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(3);
      if (result.implemented > 0) console.log(`✅ [PIPELINE] Auto-implemented ${result.implemented} idea(s)`);
    }
  }, 10 * 60 * 1000);

  scheduleAutonomyOnce("PIPELINE_INITIAL", 120000, async () => {
    const { ideaToImplementationPipeline } = d();
    if (ideaToImplementationPipeline) {
      const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(5);
      if (result.implemented > 0) console.log(`✅ [PIPELINE] Initial auto-implementation: ${result.implemented} idea(s)`);
    }
  });

  scheduleAutonomyLoop("SELF_IMPROVEMENT", 30 * 60 * 1000, async () => {
    const { continuousSelfImprovement } = d();
    if (continuousSelfImprovement) await continuousSelfImprovement();
  }, 30 * 60 * 1000);

  scheduleAutonomyOnce("SELF_IMPROVEMENT_STARTUP", 120000, async () => {
    const { continuousSelfImprovement } = d();
    if (continuousSelfImprovement) await continuousSelfImprovement();
  });

  // DAILY_IDEAS and DAILY_IDEAS_STARTUP disabled — Adam provides ideas manually

  scheduleAutonomyLoop("AI_ROTATION", 60 * 60 * 1000, async () => {
    const { rotateAIsBasedOnPerformance } = d();
    if (rotateAIsBasedOnPerformance) await rotateAIsBasedOnPerformance();
  }, 60 * 60 * 1000);

  const depsRef = d();
  if (depsRef.STRIPE_SECRET_KEY) {
    scheduleAutonomyLoop("STRIPE_SYNC", 15 * 60 * 1000, async () => {
      const { syncStripeRevenue } = getDeps() || {};
      if (syncStripeRevenue) await syncStripeRevenue();
    }, 15 * 60 * 1000);
  }

  scheduleAutonomyLoop("VACATION_MODE", 2 * 60 * 60 * 1000, () => handleAgentVacationMode(getDeps), 2 * 60 * 60 * 1000);
  scheduleAutonomyLoop("BOLDTRAIL_FOLLOWUPS", 6 * 60 * 60 * 1000, () => checkBoldTrailFollowUps(getDeps), 6 * 60 * 60 * 1000);

  const tcoDeps = getDeps() || {};
  if (tcoDeps.tcoSalesAgent) {
    console.log("🕐 [TCO AGENT] Starting follow-up scheduler (every hour)");
    scheduleAutonomyLoop("TCO_FOLLOWUPS", 60 * 60 * 1000, async () => {
      const { tcoSalesAgent } = getDeps() || {};
      if (tcoSalesAgent) {
        console.log("⏰ [TCO AGENT] Running scheduled follow-up check...");
        const result = await tcoSalesAgent.processFollowUps();
        if (result.success && result.processed > 0) console.log(`✅ [TCO AGENT] Processed ${result.processed} follow-ups`);
      }
    }, 60 * 60 * 1000);
  }

  console.log("✅ [AUTONOMY] All schedulers started");
}
