/**
 * Agent Recruitment & Onboarding Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createAgentRecruitmentRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilWithFailover,
    callCouncilMember,
    makePhoneCall,
  } = ctx;

// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ====================
app.post("/api/v1/recruitment/create-lead", requireKey, async (req, res) => {
  try {
    const { name, phone, email, source } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ ok: false, error: "Phone or email required" });
    }

    const result = await pool.query(
      `INSERT INTO recruitment_leads (name, phone, email, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name || null, phone || null, email || null, source || 'manual']
    );

    res.json({
      ok: true,
      lead: result.rows[0],
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("Recruitment lead creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/make-call", requireKey, async (req, res) => {
  try {
    const { lead_id, phone, custom_script } = req.body;

    if (!lead_id && !phone) {
      return res.status(400).json({ ok: false, error: "lead_id or phone required" });
    }

    // Get lead info
    let lead;
    if (lead_id) {
      const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [lead_id]);
      if (leadResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      lead = leadResult.rows[0];
    } else {
      lead = { phone, name: null, email: null };
    }

    const phoneNumber = lead.phone || phone;
    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: "Phone number required" });
    }

    // Generate recruitment call script
    const scriptPrompt = custom_script || `You are calling a real estate agent to introduce BoldTrail - an AI assistant that helps agents:
- Draft emails automatically
- Plan showing routes
- Follow up with clients
- Save hours of admin work

Keep it conversational, under 60 seconds. Ask if they'd like to see a quick demo via webinar.`;

    const callScript = await callCouncilWithFailover(scriptPrompt, "chatgpt");

    // Make the call
    const callResult = await makePhoneCall(phoneNumber, null, callScript, "chatgpt");

    if (callResult.success && lead_id) {
      // Log the call
      await pool.query(
        `INSERT INTO recruitment_calls (lead_id, call_sid, call_status, outcome)
         VALUES ($1, $2, 'initiated', 'pending')`,
        [lead_id, callResult.callSid]
      );

      // Update lead status
      await pool.query(
        "UPDATE recruitment_leads SET status = 'called', updated_at = NOW() WHERE id = $1",
        [lead_id]
      );
    }

    res.json({
      ok: true,
      call: callResult,
      script: callScript,
      message: "Recruitment call initiated",
    });
  } catch (error) {
    console.error("Recruitment call error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/schedule-webinar", requireKey, async (req, res) => {
  try {
    const { title, scheduled_time, lead_ids } = req.body;

    if (!title || !scheduled_time) {
      return res.status(400).json({ ok: false, error: "title and scheduled_time required" });
    }

    // Generate webinar presentation content
    const presentationPrompt = `Create a compelling webinar presentation for BoldTrail - AI Assistant for Real Estate Agents.

Include:
1. Introduction: The problem (agents drowning in admin work)
2. Solution: How BoldTrail automates emails, showings, follow-ups
3. Demo: Show the overlay in action
4. Success stories: Time saved, deals closed faster
5. Pricing: $99/month - ROI in first deal
6. Q&A: Address common concerns
7. Close: Express Line enrollment opportunity

Format as structured JSON with sections and talking points.`;

    const presentationData = await callCouncilWithFailover(presentationPrompt, "gemini");

    // For now, use a placeholder Zoom link (in production, integrate with Zoom API)
    const zoomLink = `https://zoom.us/j/meeting-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO recruitment_webinars (title, scheduled_time, zoom_link, presentation_data, attendees)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        title,
        scheduled_time,
        zoomLink,
        JSON.stringify({ content: presentationData }),
        lead_ids ? JSON.stringify(lead_ids) : JSON.stringify([]),
      ]
    );

    // Send invitations to leads
    if (lead_ids && Array.isArray(lead_ids)) {
      for (const leadId of lead_ids) {
        const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [leadId]);
        if (leadResult.rows.length > 0) {
          const lead = leadResult.rows[0];
          // Send email/SMS invitation (implement sendSMS or email function)
          console.log(`📧 Inviting lead ${lead.name || lead.email} to webinar`);
        }
      }
    }

    res.json({
      ok: true,
      webinar: result.rows[0],
      message: "Webinar scheduled successfully",
    });
  } catch (error) {
    console.error("Webinar scheduling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/handle-objection", requireKey, async (req, res) => {
  try {
    const { lead_id, concern, call_transcript } = req.body;

    if (!lead_id || !concern) {
      return res.status(400).json({ ok: false, error: "lead_id and concern required" });
    }

    // Use AI to generate objection response
    const responsePrompt = `A real estate agent has this concern about BoldTrail: "${concern}"

Generate a helpful, empathetic response that:
1. Acknowledges their concern
2. Provides a clear, honest answer
3. Offers a solution or alternative
4. Maintains trust and doesn't push too hard

Keep it conversational and under 150 words.`;

    const response = await callCouncilWithFailover(responsePrompt, "chatgpt");

    // Log the concern and response
    await pool.query(
      `UPDATE recruitment_calls 
       SET concerns = COALESCE(concerns, '') || $1 || E'\\n',
           transcript = COALESCE(transcript, '') || $2 || E'\\n'
       WHERE lead_id = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [`Concern: ${concern}\n`, `Response: ${response}\n`, lead_id]
    );

    res.json({
      ok: true,
      response,
      message: "Objection handled",
    });
  } catch (error) {
    console.error("Objection handling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/enroll", requireKey, async (req, res) => {
  try {
    const { lead_id, webinar_id, enrollment_tier } = req.body;

    if (!lead_id) {
      return res.status(400).json({ ok: false, error: "lead_id required" });
    }

    // Get lead
    const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [lead_id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    // Create enrollment
    const enrollmentResult = await pool.query(
      `INSERT INTO recruitment_enrollments (lead_id, webinar_id, enrollment_tier, status, onboarding_stage)
       VALUES ($1, $2, $3, 'enrolled', 'learning')
       RETURNING *`,
      [lead_id, webinar_id || null, enrollment_tier || 'express']
    );

    // Create BoldTrail agent account
    const agentResult = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, subscription_tier)
       VALUES ($1, $2, 'express')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [lead.email || `agent-${lead_id}@boldtrail.com`, lead.name]
    );

    // Link enrollment to agent
    await pool.query(
      `UPDATE recruitment_enrollments SET agent_id = $1 WHERE id = $2`,
      [agentResult.rows[0].id, enrollmentResult.rows[0].id]
    );

    // Initialize feature unlocks (start with basic features only)
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, 'email_drafting', false),
              ($1, 'showing_planner', false),
              ($1, 'basic_crm', false)
       ON CONFLICT DO NOTHING`,
      [agentResult.rows[0].id]
    );

    res.json({
      ok: true,
      enrollment: enrollmentResult.rows[0],
      agent: agentResult.rows[0],
      message: "Agent enrolled successfully",
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/unlock-feature", requireKey, async (req, res) => {
  try {
    const { agent_id, feature_name, mastery_achieved } = req.body;

    if (!agent_id || !feature_name) {
      return res.status(400).json({ ok: false, error: "agent_id and feature_name required" });
    }

    // Check if agent has achieved mastery (this would be checked via virtual class progress, etc.)
    const enrollmentResult = await pool.query(
      `SELECT mastery_level, onboarding_stage FROM recruitment_enrollments 
       WHERE agent_id = (SELECT id FROM boldtrail_agents WHERE id = $1)`,
      [agent_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent enrollment not found" });
    }

    const enrollment = enrollmentResult.rows[0];

    // Feature unlock rules
    const featureRequirements = {
      'youtube_automation': { mastery_level: 5, stage: 'mastered' },
      'full_automation': { mastery_level: 7, stage: 'mastered' },
      'advanced_crm': { mastery_level: 3, stage: 'building' },
    };

    const requirement = featureRequirements[feature_name];
    if (requirement) {
      if (enrollment.mastery_level < requirement.mastery_level || 
          enrollment.onboarding_stage !== requirement.stage) {
        return res.status(403).json({
          ok: false,
          error: `Feature requires mastery level ${requirement.mastery_level} and stage ${requirement.stage}`,
          current_level: enrollment.mastery_level,
          current_stage: enrollment.onboarding_stage,
        });
      }
    }

    // Unlock the feature
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, $2, true)
       ON CONFLICT (agent_id, feature_name) DO UPDATE SET unlocked_at = NOW()`,
      [agent_id, feature_name]
    );

    res.json({
      ok: true,
      message: `Feature ${feature_name} unlocked`,
      agent_id,
      feature_name,
    });
  } catch (error) {
    console.error("Feature unlock error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
