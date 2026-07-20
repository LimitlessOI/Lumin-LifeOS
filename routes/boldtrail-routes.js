/**
 * SYNOPSIS: BoldTrail Real Estate CRM Routes
 * Extracted from server.js
 * @ssot docs/products/boldtrail/PRODUCT_HOME.md
 */
import logger from '../services/logger.js';
import { getStripeClient } from '../services/stripe-client.js';

// Resolve a client-reachable base URL from the incoming request (the origin the
// caller actually used), falling back to configured public origins. Avoids
// "https://undefined/..." when RAILWAY_PUBLIC_DOMAIN was never injected.
function resolveBaseUrl(req) {
  const fwdProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const fwdHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (fwdHost) return `${fwdProto || 'https'}://${fwdHost}`;
  if (req.headers.origin) return String(req.headers.origin);
  const env = process.env.PUBLIC_BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');
  return env.replace(/\/+$/, '');
}

export function createBoldTrailRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    callCouncilWithFailover,
  } = ctx;

// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================
app.get("/api/v1/boldtrail/api/status", requireKey, async (req, res) => {
  try {
    const boldtrail = await import("../src/integrations/boldtrail.js");
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
      const { draftEmailWithBoldTrailAI } = await import("../src/integrations/boldtrail.js");
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
      const { planShowingsWithBoldTrailAI } = await import("../src/integrations/boldtrail.js");
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
        // Create agent first — start 'incomplete' so an unpaid agent is never
        // treated as an active subscriber (the table default is 'active').
        const newAgent = await pool.query(
          "INSERT INTO boldtrail_agents (email, name, subscription_status) VALUES ($1, $2, 'incomplete') RETURNING *",
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
      success_url: `${resolveBaseUrl(req)}/api/v1/boldtrail/subscription/success?agent_id=${agent.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${resolveBaseUrl(req)}/boldtrail?canceled=true`,
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

// Post-payment access grant. Stripe redirects here (no JWT/command key) with the
// session id; we retrieve the session, confirm it is genuinely paid/active, and
// only then flip the agent to an active subscriber. Fail-closed: an unpaid or
// mismatched session grants nothing.
app.get("/api/v1/boldtrail/subscription/success", async (req, res) => {
  try {
    const agentId = String(req.query.agent_id || "").trim();
    const sessionId = String(req.query.session_id || "").trim();
    if (!agentId || !sessionId) {
      return res.status(400).send("Missing payment confirmation parameters.");
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).send("Stripe not configured.");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      session.status === "active";
    const metaAgentId = session.metadata?.agent_id;

    if (!paid) {
      return res.status(400).send("Payment not completed.");
    }
    if (metaAgentId && metaAgentId !== agentId) {
      return res.status(400).send("Checkout session does not match this account.");
    }

    await pool.query(
      `UPDATE boldtrail_agents
          SET subscription_status = 'active',
              stripe_subscription_id = COALESCE($2, stripe_subscription_id)
        WHERE id = $1`,
      [agentId, session.subscription ? String(session.subscription) : null]
    );

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Subscription active — BoldTrail</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#111}h1{font-size:1.5rem}.card{border:1px solid #99f6e4;border-radius:12px;padding:20px;margin-top:16px}</style>
</head><body><h1>You're subscribed — welcome to BoldTrail Pro</h1>
<div class="card"><p>Your subscription is active. Your AI assistant is now enabled on your account.</p></div>
</body></html>`);
  } catch (error) {
    logger.error("[BOLDTRAIL] subscription success handler error", { error: error.message });
    res.status(500).send("Something went wrong confirming your subscription.");
  }
});


}

// Auto-register aliases: the module is mounted by both `registerBoldtrailRoutes`
// (lowercase-t, used in config/auto-registered-product-modules.json) and the
// original `registerBoldTrailRoutes` (uppercase-T, asserted by outreach-crm step1).
export function registerBoldtrailRoutes(app, ctx) {
  return createBoldTrailRoutes(app, ctx);
}
export function registerBoldTrailRoutes(app, ctx) {
  return createBoldTrailRoutes(app, ctx);
}