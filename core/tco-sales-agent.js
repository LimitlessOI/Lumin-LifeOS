/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TCO AI SALES AGENT (TCO-F01)                                   ║
 * ║        Autonomous agent for detecting and responding to cost complaints          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * STATUS: IN_BUILD
 * TYPE: GROWTH
 * MECHANISM: AI monitors mentions, helps, routes to free audit, follows up
 * METRIC: Leads/week + conversion rate
 * SAFETY: All actions logged, human approval required by default
 */

export class TCOSalesAgent {
  constructor(pool, callCouncilMember) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
  }

  /**
   * Process incoming mention/message (from webhook)
   */
  async processMention({
    sourcePlatform,
    sourceId,
    sourceUrl,
    message,
    authorUsername,
    authorProfileUrl,
    metadata = {},
  }) {
    try {
      console.log(`🤖 [TCO AGENT] Processing mention from ${sourcePlatform}: ${sourceId}`);

      // Check if we've already processed this
      const existing = await this.pool.query(
        'SELECT id FROM tco_agent_interactions WHERE source_platform = $1 AND source_id = $2',
        [sourcePlatform, sourceId]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️ [TCO AGENT] Already processed ${sourceId}, skipping`);
        return { success: true, duplicate: true };
      }

      // Check rate limits
      const canRespond = await this.checkRateLimit();
      if (!canRespond) {
        console.log('⚠️ [TCO AGENT] Rate limit exceeded, skipping');
        return { success: false, error: 'Rate limit exceeded' };
      }

      // Detect if this is a cost complaint
      const detection = await this.detectCostComplaint(message);

      console.log(`🔍 [TCO AGENT] Detection: ${detection.isCostComplaint ? 'YES' : 'NO'} (confidence: ${detection.confidenceScore}%)`);

      // Generate response if it's a complaint
      let agentResponse = null;
      let responseStatus = 'not_applicable';

      if (detection.isCostComplaint) {
        const config = await this.getConfig();

        // Only generate response if confidence is high enough
        if (detection.confidenceScore >= config.confidenceThreshold) {
          agentResponse = await this.generateResponse({
            message,
            authorUsername,
            platform: sourcePlatform,
            keywords: detection.keywords,
          });

          // Check if auto-reply is enabled
          responseStatus = config.autoReply ? 'approved' : 'pending';

          console.log(`💬 [TCO AGENT] Generated response (status: ${responseStatus})`);
        } else {
          console.log(`⚠️ [TCO AGENT] Confidence too low (${detection.confidenceScore}% < ${config.confidenceThreshold}%), not responding`);
          responseStatus = 'rejected_low_confidence';
        }
      }

      // Log interaction to database
      const result = await this.pool.query(
        `INSERT INTO tco_agent_interactions (
          source_platform,
          source_id,
          source_url,
          original_message,
          author_username,
          author_profile_url,
          cost_complaint_detected,
          confidence_score,
          keywords_matched,
          agent_response,
          response_status,
          follow_up_scheduled,
          follow_up_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          sourcePlatform,
          sourceId,
          sourceUrl,
          message,
          authorUsername,
          authorProfileUrl,
          detection.isCostComplaint,
          detection.confidenceScore,
          detection.keywords,
          agentResponse,
          responseStatus,
          detection.isCostComplaint && agentResponse !== null, // Schedule follow-up if we respond
          detection.isCostComplaint && agentResponse !== null
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            : null,
          JSON.stringify(metadata),
        ]
      );

      const interactionId = result.rows[0].id;

      console.log(`✅ [TCO AGENT] Logged interaction #${interactionId}`);

      // If auto-reply is enabled and response is approved, send it
      if (responseStatus === 'approved') {
        await this.sendResponse(interactionId);
      }

      return {
        success: true,
        interactionId,
        detection,
        response: agentResponse,
        status: responseStatus,
      };
    } catch (error) {
      console.error('❌ [TCO AGENT] Error processing mention:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detect if a message is a cost complaint using AI
   */
  async detectCostComplaint(message) {
    try {
      // Get keywords from config
      const config = await this.getConfig();
      const keywords = config.keywords || [];

      // Simple keyword matching first (fast)
      const lowercaseMessage = message.toLowerCase();
      const matchedKeywords = keywords.filter((keyword) =>
        lowercaseMessage.includes(keyword.toLowerCase())
      );

      // If no keywords matched, probably not a cost complaint
      if (matchedKeywords.length === 0) {
        return {
          isCostComplaint: false,
          confidenceScore: 0,
          keywords: [],
        };
      }

      // Use AI to analyze sentiment and intent
      const prompt = `Analyze this social media message and determine if the person is complaining about AI API costs or pricing.

Message: "${message}"

Consider:
1. Are they mentioning costs, pricing, or expenses?
2. Is the tone negative or frustrated?
3. Are they looking for alternatives or solutions?
4. Are they specifically talking about AI APIs (OpenAI, Anthropic, Google, etc.)?

Return ONLY a JSON object with:
{
  "isCostComplaint": true/false,
  "confidenceScore": 0-100,
  "reasoning": "brief explanation"
}`;

      const aiResponse = await this.callCouncilMember('groq_llama', prompt, {
        maxTokens: 200,
        useTwoTier: false, // Use cheap model for detection
      });

      // Parse AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to keyword-based detection
        return {
          isCostComplaint: true,
          confidenceScore: 50 + matchedKeywords.length * 10, // Rough heuristic
          keywords: matchedKeywords,
        };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        isCostComplaint: analysis.isCostComplaint,
        confidenceScore: analysis.confidenceScore,
        keywords: matchedKeywords,
        reasoning: analysis.reasoning,
      };
    } catch (error) {
      console.error('Error detecting cost complaint:', error);
      // Fallback to simple detection
      return {
        isCostComplaint: false,
        confidenceScore: 0,
        keywords: [],
      };
    }
  }

  /**
   * Generate helpful response offering free audit
   */
  async generateResponse({ message, authorUsername, platform, keywords }) {
    try {
      const prompt = `You are a helpful sales assistant for TotalCostOptimizer (TCO), a service that reduces AI API costs by 90-95%.

Someone just posted this on ${platform}:
"${message}"

Generate a SHORT, HELPFUL reply that:
1. Acknowledges their pain point (high AI costs)
2. Offers a free cost audit (no commitment)
3. Mentions we typically save 90-95% on AI API costs
4. Includes a call-to-action (DM us or reply)
5. Is friendly and NOT salesy or pushy
6. Is under 280 characters (Twitter-friendly)

${authorUsername ? `Address them as @${authorUsername}` : ''}

Tone: Helpful, empathetic, solution-focused
Don't use: emojis, hashtags, or hype words

Return ONLY the reply text, nothing else.`;

      const response = await this.callCouncilMember('groq_llama', prompt, {
        maxTokens: 150,
        temperature: 0.7,
        useTwoTier: false,
      });

      // Clean up response
      const cleanResponse = response
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\n\n+/g, '\n') // Remove excessive newlines
        .trim();

      return cleanResponse;
    } catch (error) {
      console.error('Error generating response:', error);
      // Fallback template
      return `Hey ${authorUsername ? '@' + authorUsername : 'there'}! We help companies reduce AI API costs by 90-95%. Would you be interested in a free cost audit? No commitment - just see how much you could save. DM us if you'd like to learn more!`;
    }
  }

  /**
   * Send response to platform (placeholder - needs platform-specific implementation)
   */
  async sendResponse(interactionId) {
    try {
      const config = await this.getConfig();

      // In test mode, just log
      if (config.testMode) {
        console.log(`🧪 [TCO AGENT] TEST MODE - Would send response for interaction #${interactionId}`);

        await this.pool.query(
          `UPDATE tco_agent_interactions
           SET response_status = 'sent', response_sent_at = NOW()
           WHERE id = $1`,
          [interactionId]
        );

        return { success: true, testMode: true };
      }

      // Get interaction
      const result = await this.pool.query(
        'SELECT * FROM tco_agent_interactions WHERE id = $1',
        [interactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Interaction not found');
      }

      const interaction = result.rows[0];

      // TODO: Implement platform-specific sending
      // For now, just mark as sent
      console.log(`📤 [TCO AGENT] Sending response to ${interaction.source_platform}:`, interaction.agent_response);

      await this.pool.query(
        `UPDATE tco_agent_interactions
         SET response_status = 'sent', response_sent_at = NOW()
         WHERE id = $1`,
        [interactionId]
      );

      // Update stats
      await this.pool.query(
        `UPDATE tco_agent_stats
         SET responses_sent = responses_sent + 1
         WHERE date = CURRENT_DATE`
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending response:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process follow-ups (run periodically)
   */
  async processFollowUps() {
    try {
      console.log('🔄 [TCO AGENT] Processing follow-ups...');

      // Get interactions that need follow-up
      const result = await this.pool.query(
        `SELECT * FROM tco_agent_interactions
         WHERE follow_up_scheduled = TRUE
           AND follow_up_sent = FALSE
           AND follow_up_at <= NOW()
           AND response_status = 'sent'
         LIMIT 10`
      );

      console.log(`📬 [TCO AGENT] Found ${result.rows.length} follow-ups to send`);

      for (const interaction of result.rows) {
        await this.sendFollowUp(interaction.id);
      }

      return {
        success: true,
        processed: result.rows.length,
      };
    } catch (error) {
      console.error('Error processing follow-ups:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send follow-up message
   */
  async sendFollowUp(interactionId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tco_agent_interactions WHERE id = $1',
        [interactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Interaction not found');
      }

      const interaction = result.rows[0];

      // Generate follow-up message
      const followUpMessage = await this.generateFollowUpMessage(interaction);

      console.log(`📤 [TCO AGENT] Sending follow-up to ${interaction.author_username}`);

      // Update database
      await this.pool.query(
        `UPDATE tco_agent_interactions
         SET follow_up_sent = TRUE,
             follow_up_sent_at = NOW(),
             follow_up_response = $1
         WHERE id = $2`,
        [followUpMessage, interactionId]
      );

      // Update stats
      await this.pool.query(
        `UPDATE tco_agent_stats
         SET follow_ups_sent = follow_ups_sent + 1
         WHERE date = CURRENT_DATE`
      );

      return { success: true };
    } catch (error) {
      console.error('Error sending follow-up:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate follow-up message
   */
  async generateFollowUpMessage(interaction) {
    const username = interaction.author_username;

    // Simple template for now
    const templates = [
      `Hey ${username ? '@' + username : 'there'}! Just following up - did you get a chance to think about the free cost audit? Happy to answer any questions!`,
      `${username ? '@' + username : 'Hi'}! Checking in - still interested in seeing how much you could save on AI API costs? The audit is completely free and takes just 5 minutes.`,
      `Hey ${username ? '@' + username : 'there'}! No pressure, but wanted to make sure you saw our offer for a free cost analysis. Most companies save 90%+ on their AI bills. Let me know if you'd like to learn more!`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Check rate limits
   */
  async checkRateLimit() {
    try {
      const config = await this.getConfig();
      const limit = config.rateLimitPerHour || 10;

      // Count responses in the last hour
      const result = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM tco_agent_interactions
         WHERE response_sent_at > NOW() - INTERVAL '1 hour'
           AND response_status = 'sent'`
      );

      const count = parseInt(result.rows[0].count);

      return count < limit;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }

  /**
   * Get agent configuration
   */
  async getConfig() {
    try {
      const result = await this.pool.query(
        'SELECT config_key, config_value FROM tco_agent_config'
      );

      const config = {};
      for (const row of result.rows) {
        // Parse JSON values
        try {
          config[this.camelCase(row.config_key)] = JSON.parse(row.config_value);
        } catch {
          config[this.camelCase(row.config_key)] = row.config_value;
        }
      }

      return config;
    } catch (error) {
      console.error('Error getting config:', error);
      // Return defaults
      return {
        enabled: true,
        autoReply: false,
        followUpEnabled: true,
        followUpDelayHours: 24,
        rateLimitPerHour: 10,
        confidenceThreshold: 70,
        keywords: [],
        blockedUsers: [],
        testMode: true,
      };
    }
  }

  /**
   * Update agent configuration
   */
  async updateConfig(key, value) {
    try {
      await this.pool.query(
        `INSERT INTO tco_agent_config (config_key, config_value)
         VALUES ($1, $2)
         ON CONFLICT (config_key)
         DO UPDATE SET config_value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get agent statistics
   */
  async getStats(startDate = null, endDate = null) {
    try {
      let query = 'SELECT * FROM tco_agent_stats';
      const params = [];

      if (startDate && endDate) {
        query += ' WHERE date BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE date >= $1';
        params.push(startDate);
      }

      query += ' ORDER BY date DESC LIMIT 30';

      const result = await this.pool.query(query, params);

      return {
        success: true,
        stats: result.rows,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get pending interactions (for human review)
   */
  async getPendingInteractions() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM tco_agent_interactions
         WHERE response_status = 'pending'
           AND human_reviewed = FALSE
         ORDER BY created_at DESC
         LIMIT 50`
      );

      return {
        success: true,
        interactions: result.rows,
      };
    } catch (error) {
      console.error('Error getting pending interactions:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Approve/reject interaction
   */
  async reviewInteraction(interactionId, action, notes = null) {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';

      await this.pool.query(
        `UPDATE tco_agent_interactions
         SET response_status = $1,
             human_reviewed = TRUE,
             review_notes = $2,
             reviewed_at = NOW()
         WHERE id = $3`,
        [status, notes, interactionId]
      );

      // If approved, send the response
      if (action === 'approve') {
        await this.sendResponse(interactionId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error reviewing interaction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Convert snake_case to camelCase
   */
  camelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}

export default TCOSalesAgent;
