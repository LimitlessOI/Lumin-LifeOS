/**
 * BoldTrail Real Estate CRM Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createBoldTrailRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilWithFailover,
    getStripeClient,
    RAILWAY_PUBLIC_DOMAIN,
  } = ctx;

// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================
app.get("/api/v1/boldtrail/api/status", requireKey, async (req, res) => {
  try {
    const boldtrail = await import("./src/integrations/boldtrail.js");
    const status = await boldtrail.probeBoldTrailApi();

    res.json({
      ok: true,
      boldtrail: {
        configured: !!status.configured,
        ok: !!status.ok,
        baseUrl: status.baseUrl || null,
        apiPrefix: status.apiPrefix || null,
        probe: status.probe || null,
        status: status.status || null,
        reason: status.reason || null,
      },
      note: "Public docs indicate BoldTrail Public API maps to kvCORE v2; AI endpoints are not publicly documented.",
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/register", requireKey, async (req, res) => {
  try {
    const { email, name, agent_tone, preferences } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    // Check if agent already exists
    const existing = await pool.query(
      "SELECT * FROM boldtrail_agents WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        agent: existing.rows[0],
        message: "Agent already registered",
      });
    }

    // Create new agent
    const result = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, agent_tone, preferences)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, name || null, agent_tone || null, preferences ? JSON.stringify(preferences) : null]
    );

    res.json({
      ok: true,
      agent: result.rows[0],
      message: "Agent registered successfully",
    });
  } catch (error) {
    console.error("BoldTrail registration error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/draft-email", requireKey, async (req, res) => {
  try {
    const { agent_id, draft_type, recipient_email, recipient_name, context_data } = req.body;

    if (!agent_id || !draft_type) {
      return res.status(400).json({ ok: false, error: "agent_id and draft_type required" });
    }

    // Get agent info for tone
    const agentResult = await pool.query(
      "SELECT agent_tone, name FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    const agent = agentResult.rows[0];
    const tone = agent.agent_tone || "professional and friendly";

    let subject, body, aiSource = "our_ai";

    // Try BoldTrail AI first (if API key exists)
    try {
      const { draftEmailWithBoldTrailAI } = await import("./src/integrations/boldtrail.js");
      const boldtrailResult = await draftEmailWithBoldTrailAI({
        agent_tone: tone,
        draft_type,
        recipient_name,
        recipient_email,
        context_data,
      });

      if (boldtrailResult.ok && boldtrailResult.source === "boldtrail_ai") {
        subject = boldtrailResult.subject;
        body = boldtrailResult.content;
        aiSource = "boldtrail_ai";
        console.log("✅ Used BoldTrail AI for email drafting");
      } else {
        // Fallback to our AI
        throw new Error("BoldTrail AI not available, using fallback");
      }
    } catch (boldtrailError) {
      // Fallback to our AI
      console.log("📝 Using our AI for email drafting (BoldTrail AI unavailable)");
      
      const prompt = `Draft a ${draft_type} email for a real estate agent.

Agent's tone/style: ${tone}
Recipient: ${recipient_name || recipient_email || "client"}
Context: ${JSON.stringify(context_data || {})}

Write a complete email with:
- Appropriate subject line
- Professional greeting
- Clear, helpful body content
- Professional closing

Format as:
SUBJECT: [subject line]

[email body]`;

      const emailContent = await callCouncilWithFailover(prompt, "chatgpt");

      // Extract subject and body
      const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
      subject = subjectMatch ? subjectMatch[1].trim() : `${draft_type} - ${recipient_name || "Client"}`;
      body = emailContent.replace(/SUBJECT:.*/i, "").trim();
    }

    // Save draft
    const draftResult = await pool.query(
      `INSERT INTO boldtrail_email_drafts 
       (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        agent_id,
        draft_type,
        recipient_email || null,
        recipient_name || null,
        subject,
        body,
        context_data ? JSON.stringify(context_data) : null,
      ]
    );

    res.json({
      ok: true,
      draft: draftResult.rows[0],
      subject,
      content: body,
      ai_source: aiSource, // "boldtrail_ai" or "our_ai"
    });
  } catch (error) {
    console.error("BoldTrail email draft error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/plan-showing", requireKey, async (req, res) => {
  try {
    const { agent_id, properties, client_name, client_email, client_phone } = req.body;

    if (!agent_id || !properties || !Array.isArray(properties) || properties.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "agent_id and properties array required",
      });
    }

    let optimizedShowings = [];
    let aiSource = "our_ai";

    // Try BoldTrail AI first (if API key exists)
    try {
      const { planShowingsWithBoldTrailAI } = await import("./src/integrations/boldtrail.js");
      const boldtrailResult = await planShowingsWithBoldTrailAI({
        properties,
        client_name,
        client_email,
        client_phone,
      });

      if (boldtrailResult.ok && boldtrailResult.source === "boldtrail_ai") {
        optimizedShowings = boldtrailResult.showings || [];
        aiSource = "boldtrail_ai";
        console.log("✅ Used BoldTrail AI for showing planning");
      } else {
        // Fallback to our simple route order
        throw new Error("BoldTrail AI not available, using fallback");
      }
    } catch (boldtrailError) {
      // Fallback: Simple route order (1, 2, 3...)
      console.log("📝 Using our simple route planning (BoldTrail AI unavailable)");
      optimizedShowings = properties.map((prop, i) => ({
        ...prop,
        route_order: i + 1,
        estimated_drive_time: null,
      }));
    }

    // Save showings to database
    const showings = [];
    for (let i = 0; i < optimizedShowings.length; i++) {
      const prop = optimizedShowings[i];
      const showingResult = await pool.query(
        `INSERT INTO boldtrail_showings 
         (agent_id, property_address, property_details, showing_date, client_name, client_email, client_phone, route_order, estimated_drive_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          agent_id,
          prop.address || prop.property_address || "Address TBD",
          prop.details ? JSON.stringify(prop.details) : null,
          prop.showing_date || null,
          client_name || null,
          client_email || null,
          client_phone || null,
          prop.route_order || i + 1,
          prop.estimated_drive_time || null,
        ]
      );
      showings.push(showingResult.rows[0]);
    }

    // Generate showing confirmation email draft
    const agentResult = await pool.query(
      "SELECT name, agent_tone FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );
    const agent = agentResult.rows[0];

    const emailPrompt = `Draft a showing confirmation email for a real estate agent.

Agent: ${agent.name || "Agent"}
Client: ${client_name || "Client"}
Properties: ${properties.map((p, i) => `${i + 1}. ${p.address || p.property_address}`).join("\n")}
Showing date: ${properties[0]?.showing_date || "TBD"}

Include:
- Friendly greeting
- List of properties we'll be viewing
- Meeting time and location
- What to expect
- Professional closing

Format as:
SUBJECT: [subject]

[email body]`;

    const emailContent = await callCouncilWithFailover(emailPrompt, "chatgpt");
    const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Showing Confirmation - ${properties.length} Properties`;
    const body = emailContent.replace(/SUBJECT:.*/i, "").trim();

    res.json({
      ok: true,
      showings,
      confirmation_email: {
        subject,
        body,
        recipient: client_email,
      },
      route_summary: {
        total_properties: properties.length,
        estimated_time: "TBD (integrate with Maps API)",
      },
      ai_source: aiSource, // "boldtrail_ai" or "our_ai"
    });
  } catch (error) {
    console.error("BoldTrail showing plan error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/showings/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await pool.query(
      `SELECT * FROM boldtrail_showings 
       WHERE agent_id = $1 
       ORDER BY showing_date DESC, route_order ASC
       LIMIT 50`,
      [agentId]
    );

    res.json({
      ok: true,
      showings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("BoldTrail get showings error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/agent/:email", requireKey, async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      "SELECT * FROM boldtrail_agents WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    res.json({
      ok: true,
      agent: result.rows[0],
    });
  } catch (error) {
    console.error("BoldTrail get agent error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/create-subscription", requireKey, async (req, res) => {
  try {
    const { agent_id, email, name } = req.body;

    if (!agent_id && !email) {
      return res.status(400).json({ ok: false, error: "agent_id or email required" });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    // Get or create agent
    let agent;
    if (agent_id) {
      const result = await pool.query("SELECT * FROM boldtrail_agents WHERE id = $1", [agent_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Agent not found" });
      }
      agent = result.rows[0];
    } else {
      const result = await pool.query("SELECT * FROM boldtrail_agents WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        // Create agent first
        const newAgent = await pool.query(
          "INSERT INTO boldtrail_agents (email, name) VALUES ($1, $2) RETURNING *",
          [email, name || null]
        );
        agent = newAgent.rows[0];
      } else {
        agent = result.rows[0];
      }
    }

    // Create Stripe customer if needed
    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.name || undefined,
        metadata: { agent_id: agent.id.toString() },
      });
      customerId = customer.id;
      await pool.query(
        "UPDATE boldtrail_agents SET stripe_customer_id = $1 WHERE id = $2",
        [customerId, agent.id]
      );
    }

    // Create subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "BoldTrail Pro",
              description: "AI Assistant for Real Estate Agents",
            },
            unit_amount: 9900, // $99.00
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?success=true`,
      cancel_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?canceled=true`,
      metadata: { agent_id: agent.id.toString() },
    });

    res.json({
      ok: true,
      session_id: session.id,
      url: session.url,
      agent_id: agent.id,
    });
  } catch (error) {
    console.error("BoldTrail subscription creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
