/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                   TCO AI SALES AGENT API ROUTES                                   ║
 * ║          Webhooks and management endpoints for the autonomous agent              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';

const router = express.Router();

/**
 * Initialize TCO Agent routes
 */
export function initTCOAgentRoutes({ pool, tcoSalesAgent }) {
  /**
   * POST /api/tco-agent/webhook/mention
   * Receive mentions from social media platforms
   */
  router.post('/webhook/mention', async (req, res) => {
    try {
      const {
        platform, // 'twitter', 'linkedin', 'reddit', etc.
        id, // Platform-specific ID
        url, // Link to post
        message, // The actual message/post content
        username, // Author username
        profile_url, // Author profile
        metadata, // Additional data
      } = req.body;

      if (!platform || !message) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['platform', 'message'],
        });
      }

      console.log(`🔔 [WEBHOOK] Received mention from ${platform}: ${username}`);

      // Process the mention with the agent
      const result = await tcoSalesAgent.processMention({
        sourcePlatform: platform,
        sourceId: id,
        sourceUrl: url,
        message,
        authorUsername: username,
        authorProfileUrl: profile_url,
        metadata,
      });

      res.json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/tco-agent/webhook/twitter
   * Twitter-specific webhook (Account Activity API format)
   */
  router.post('/webhook/twitter', async (req, res) => {
    try {
      // Twitter webhook verification
      if (req.body.challenge) {
        return res.json({ response_token: req.body.challenge });
      }

      // Extract tweet mentions
      const tweets = req.body.tweet_create_events || [];

      for (const tweet of tweets) {
        await tcoSalesAgent.processMention({
          sourcePlatform: 'twitter',
          sourceId: tweet.id_str,
          sourceUrl: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
          message: tweet.text,
          authorUsername: tweet.user.screen_name,
          authorProfileUrl: `https://twitter.com/${tweet.user.screen_name}`,
          metadata: tweet,
        });
      }

      res.json({ success: true, processed: tweets.length });
    } catch (error) {
      console.error('Twitter webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/pending
   * Get pending interactions for human review
   */
  router.get('/pending', async (req, res) => {
    try {
      const result = await tcoSalesAgent.getPendingInteractions();
      res.json(result);
    } catch (error) {
      console.error('Error getting pending interactions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/tco-agent/review/:id
   * Approve or reject a pending interaction
   */
  router.post('/review/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body; // action: 'approve' or 'reject'

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          error: 'Invalid action',
          message: 'action must be "approve" or "reject"',
        });
      }

      const result = await tcoSalesAgent.reviewInteraction(
        parseInt(id),
        action,
        notes
      );

      res.json(result);
    } catch (error) {
      console.error('Error reviewing interaction:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/stats
   * Get agent performance statistics
   */
  router.get('/stats', async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      const result = await tcoSalesAgent.getStats(start_date, end_date);
      res.json(result);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/config
   * Get agent configuration
   */
  router.get('/config', async (req, res) => {
    try {
      const config = await tcoSalesAgent.getConfig();
      res.json({ success: true, config });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/tco-agent/config/:key
   * Update agent configuration
   */
  router.put('/config/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          error: 'Missing value',
          message: 'Request body must include "value" field',
        });
      }

      const result = await tcoSalesAgent.updateConfig(key, value);
      res.json(result);
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/tco-agent/process-followups
   * Manually trigger follow-up processing (usually run by cron)
   */
  router.post('/process-followups', async (req, res) => {
    try {
      const result = await tcoSalesAgent.processFollowUps();
      res.json(result);
    } catch (error) {
      console.error('Error processing follow-ups:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/tco-agent/test
   * Test the agent with a sample message
   */
  router.post('/test', async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Missing message',
          message: 'Request body must include "message" field',
        });
      }

      // Test detection
      const detection = await tcoSalesAgent.detectCostComplaint(message);

      // Generate response if it's a complaint
      let generatedResponse = null;
      if (detection.isCostComplaint) {
        generatedResponse = await tcoSalesAgent.generateResponse({
          message,
          authorUsername: 'testuser',
          platform: 'test',
          keywords: detection.keywords,
        });
      }

      res.json({
        success: true,
        detection,
        generatedResponse,
        wouldRespond: detection.isCostComplaint,
      });
    } catch (error) {
      console.error('Error testing agent:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/interactions
   * Get all interactions (with pagination)
   */
  router.get('/interactions', async (req, res) => {
    try {
      const { limit = 50, offset = 0, status } = req.query;

      let query = 'SELECT * FROM tco_agent_interactions';
      const params = [];

      if (status) {
        query += ' WHERE response_status = $1';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(parseInt(limit));

      query += ' OFFSET $' + (params.length + 1);
      params.push(parseInt(offset));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        interactions: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error('Error getting interactions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/leads
   * Get leads generated by the agent
   */
  router.get('/leads', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM tco_agent_interactions
         WHERE became_lead = TRUE
         ORDER BY created_at DESC
         LIMIT 100`
      );

      res.json({
        success: true,
        leads: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error('Error getting leads:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/tco-agent/negotiate
   * Negotiate pricing for a customer
   */
  router.post('/negotiate', async (req, res) => {
    try {
      const { customer_id, tier, notes } = req.body;

      if (!customer_id || !tier) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['customer_id', 'tier'],
        });
      }

      const result = await tcoSalesAgent.negotiatePrice({
        customerId: customer_id,
        tier,
        notes,
      });

      res.json(result);
    } catch (error) {
      console.error('Error negotiating price:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/negotiations
   * Get all negotiations (for review)
   */
  router.get('/negotiations', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM tco_agent_negotiations
         ORDER BY created_at DESC
         LIMIT 100`
      );

      res.json({
        success: true,
        negotiations: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      console.error('Error getting negotiations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/objections
   * Get objection analytics
   */
  router.get('/objections', async (req, res) => {
    try {
      // Get count of each objection type
      const result = await pool.query(
        `SELECT
           objection_type,
           COUNT(*) as count,
           AVG(CASE WHEN became_lead = TRUE THEN 1 ELSE 0 END) * 100 as conversion_rate
         FROM tco_agent_interactions
         WHERE objection_type IS NOT NULL
         GROUP BY objection_type
         ORDER BY count DESC`
      );

      res.json({
        success: true,
        objections: result.rows,
      });
    } catch (error) {
      console.error('Error getting objections:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/tco-agent/persistence-stats
   * Get persistence mode analytics (follow-up effectiveness)
   */
  router.get('/persistence-stats', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           follow_up_count,
           COUNT(*) as total_interactions,
           SUM(CASE WHEN became_lead = TRUE THEN 1 ELSE 0 END) as conversions,
           AVG(CASE WHEN became_lead = TRUE THEN 1 ELSE 0 END) * 100 as conversion_rate
         FROM tco_agent_interactions
         WHERE follow_up_count IS NOT NULL
         GROUP BY follow_up_count
         ORDER BY follow_up_count ASC`
      );

      res.json({
        success: true,
        stats: result.rows,
        message: 'Shows how many conversions happen at each follow-up stage',
      });
    } catch (error) {
      console.error('Error getting persistence stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default initTCOAgentRoutes;
