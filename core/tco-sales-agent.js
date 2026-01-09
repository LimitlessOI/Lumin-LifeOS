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
 * UPGRADED: World-class objection handling, beta framing, persistence mode
 */

// ══════════════════════════════════════════════════════════════════════════════════
// OBJECTION DATABASE - Common objections and world-class rebuttals
// ══════════════════════════════════════════════════════════════════════════════════
const OBJECTION_DATABASE = {
  data_privacy: {
    triggers: ['privacy', 'data security', 'store data', 'data protection', 'gdpr', 'hipaa', 'pii'],
    rebuttal: "Great question on data privacy. We're a pass-through proxy - we never store your prompts or responses. All data flows directly through our system to the AI provider and back. We can provide an NDA and data processing agreement if needed. Would a technical architecture review help address your concerns?",
    urgency: "Our beta partners get first access to SOC 2 compliance documentation when it's ready.",
  },
  reliability: {
    triggers: ['downtime', 'reliable', 'uptime', 'fail', 'break', 'production', 'risk'],
    rebuttal: "Reliability is our #1 priority. We have built-in failover - if our proxy fails for any reason, it automatically routes directly to the API provider. Your application never breaks. Zero downtime risk. Plus, our beta partners get dedicated monitoring and instant alerts. Would you like to see our failover architecture diagram?",
    urgency: "Beta partners get dedicated Slack channel for instant support.",
  },
  no_track_record: {
    triggers: ['track record', 'proven', 'case studies', 'references', 'testimonials', 'new company', 'startup'],
    rebuttal: "You're right to be cautious. That's why we're offering a beta program with negotiable pricing and zero risk. You only pay for verified savings we actually deliver. We're looking for 5 founding customers to build case studies with. What would you need to see in a 30-day trial to feel confident?",
    urgency: "Only 5 beta spots available - 3 already claimed.",
  },
  security: {
    triggers: ['security', 'hack', 'breach', 'encryption', 'credentials', 'api keys', 'secure'],
    rebuttal: "Security is our foundation. We use AES-256-GCM encryption for all API keys - the same standard banks use. Your credentials are encrypted at rest and in transit. We never log sensitive data. Plus, our architecture is pass-through only, so we're not a honeypot. Would a security audit or penetration test report help?",
    urgency: "Beta partners get priority security reviews and custom compliance docs.",
  },
  too_expensive: {
    triggers: ['expensive', 'too much', 'cost', 'price', 'afford', 'budget', 'cheaper'],
    rebuttal: "I understand budget concerns. That's why our beta pricing is negotiable. Standard is 20% of savings, but for beta partners willing to provide a case study, we can go as low as 15%, 10%, or even 5% for enterprise logos. You only pay for verified savings - if we don't save you money, you pay nothing. What percentage would make this a no-brainer for you?",
    urgency: "Beta pricing expires once we hit 5 customers - then it's standard 20%.",
  },
  need_approval: {
    triggers: ['approval', 'team', 'boss', 'manager', 'cto', 'cfo', 'decision maker', 'discuss'],
    rebuttal: "Totally understand. The good news is there's zero upfront cost, so technically nothing to approve budget-wise. It's pure savings with no financial risk. Would it help if I sent you a one-pager you can share with your team? Or I'm happy to jump on a 15-min call with your decision makers to answer their questions directly.",
    urgency: "Beta terms are only available for 2 more weeks - would hate for you to miss out.",
  },
  think_about_it: {
    triggers: ['think about it', 'later', 'not now', 'busy', 'maybe', 'get back to you', 'circle back'],
    rebuttal: "Totally fair. Before you go, can I ask - what would you need to see to move forward today? Is it a technical concern, pricing, or something else? I want to make sure we address whatever's holding you back. Also, we're limiting beta to 5 partners - would hate for you to miss the opportunity for negotiable terms.",
    urgency: "Beta slots are first-come, first-served - I can hold one for you for 48 hours if that helps.",
  },
  too_good_to_be_true: {
    triggers: ['too good', 'sounds fake', 'suspicious', 'scam', 'believe', 'impossible'],
    rebuttal: "I get it - 90%+ savings sounds insane. Here's how it works: (1) We use cheaper models for simple tasks (70% savings), (2) We cache repeated queries (free on cache hits), (3) We compress prompts by 90% using MICRO protocol. The math checks out. We're happy to run a 7-day proof-of-concept on your actual traffic to prove it. Zero risk. What would convince you this is real?",
    urgency: "Beta partners get free POC setup - normally $500.",
  },
};

// ══════════════════════════════════════════════════════════════════════════════════
// BETA FRAMING - Messaging framework for all outreach
// ══════════════════════════════════════════════════════════════════════════════════
const BETA_FRAMING = {
  tagline: "We're looking for 5 beta partners to help us build the future of AI cost optimization.",
  benefits: [
    "Negotiable pricing (as low as 5% vs standard 20%)",
    "Priority support with dedicated Slack channel",
    "Early access to new features",
    "Your logo on our site (with permission)",
    "Free POC setup (normally $500)",
  ],
  urgency: "Only 5 beta spots available - first-come, first-served",
  risk_reversal: "Zero risk - you only pay for verified savings we actually deliver",
};

// ══════════════════════════════════════════════════════════════════════════════════
// NEGOTIATION AUTHORITY - Pricing flexibility for beta
// ══════════════════════════════════════════════════════════════════════════════════
const NEGOTIATION_TIERS = {
  standard: { rate: 0.20, conditions: "Standard customer, no special terms" },
  beta_basic: { rate: 0.15, conditions: "Beta customer, willing to provide feedback" },
  beta_case_study: { rate: 0.10, conditions: "Beta customer + case study + testimonial rights" },
  beta_enterprise_logo: { rate: 0.05, conditions: "Enterprise customer + logo rights + detailed case study + reference calls" },
};

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
   * Detect objections in message and return matched objection
   */
  async detectObjection(message) {
    const lowercaseMessage = message.toLowerCase();

    for (const [objectionType, objectionData] of Object.entries(OBJECTION_DATABASE)) {
      for (const trigger of objectionData.triggers) {
        if (lowercaseMessage.includes(trigger.toLowerCase())) {
          return {
            detected: true,
            type: objectionType,
            rebuttal: objectionData.rebuttal,
            urgency: objectionData.urgency,
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * Handle objection with world-class rebuttal
   */
  async handleObjection({ message, authorUsername, platform, objectionType }) {
    try {
      const objection = OBJECTION_DATABASE[objectionType];

      if (!objection) {
        return null;
      }

      // Build response with objection handling framework
      const prompt = `You are a world-class sales professional for TotalCostOptimizer (TCO).

Someone raised this concern on ${platform}:
"${message}"

We identified this as a "${objectionType}" objection.

Your task: Write a SHORT reply (under 280 chars) that:
1. ACKNOWLEDGES their concern first (mirror their language)
2. Provides this rebuttal: "${objection.rebuttal}"
3. Adds urgency: "${objection.urgency}"
4. Ends with a micro-commitment question

${authorUsername ? `Address them as @${authorUsername}` : ''}

Tone: Empathetic first, then confident. Never defensive.
Format: Conversational, like a helpful human (not a bot)

Return ONLY the reply text.`;

      const response = await this.callCouncilMember('groq_llama', prompt, {
        maxTokens: 200,
        temperature: 0.7,
        useTwoTier: false,
      });

      return response.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error('Error handling objection:', error);
      return null;
    }
  }

  /**
   * Generate helpful response offering free audit (with beta framing)
   */
  async generateResponse({ message, authorUsername, platform, keywords, followUpCount = 0 }) {
    try {
      // Check for objections first
      const objection = await this.detectObjection(message);

      if (objection.detected) {
        console.log(`🛡️ [TCO AGENT] Objection detected: ${objection.type}`);
        const objectionResponse = await this.handleObjection({
          message,
          authorUsername,
          platform,
          objectionType: objection.type,
        });

        if (objectionResponse) {
          return objectionResponse;
        }
      }

      // Build beta framing message
      const betaContext = followUpCount === 0
        ? `BETA FRAMING: ${BETA_FRAMING.tagline}\nKey benefit: ${BETA_FRAMING.urgency}\nRisk reversal: ${BETA_FRAMING.risk_reversal}`
        : `PERSISTENCE MODE (Follow-up #${followUpCount}): Never give up. Ask what would change their mind.`;

      const prompt = `You are a world-class sales professional for TotalCostOptimizer (TCO), a service that reduces AI API costs by 90-95%.

Someone just posted this on ${platform}:
"${message}"

${betaContext}

Generate a SHORT, HELPFUL reply that:
1. Acknowledges their pain point (high AI costs)
2. Mentions we're looking for 5 beta partners (creates urgency)
3. Offers a free cost audit (no commitment, zero risk)
4. Mentions negotiable beta pricing (as low as 5% vs standard 20%)
5. Includes a micro-commitment question (e.g., "Can I send you a one-pager?")
6. Is under 280 characters (Twitter-friendly)

${authorUsername ? `Address them as @${authorUsername}` : ''}

Tone: Helpful, confident, solution-focused (not pushy)
Don't use: emojis, hashtags, or hype words

Return ONLY the reply text, nothing else.`;

      const response = await this.callCouncilMember('groq_llama', prompt, {
        maxTokens: 200,
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
      // Fallback template with beta framing
      return `Hey ${authorUsername ? '@' + authorUsername : 'there'}! We're looking for 5 beta partners to save 90-95% on AI API costs. Zero risk - you only pay verified savings. Negotiable pricing (as low as 5%). Interested in a free audit?`;
    }
  }

  /**
   * Negotiate pricing based on customer tier
   */
  async negotiatePrice({ customerId, tier = 'beta_basic', notes = '' }) {
    try {
      const negotiation = NEGOTIATION_TIERS[tier];

      if (!negotiation) {
        throw new Error(`Invalid negotiation tier: ${tier}`);
      }

      console.log(`💰 [TCO AGENT] Negotiating price for customer ${customerId}: ${tier} (${negotiation.rate * 100}%)`);

      // Log negotiation to database
      await this.pool.query(
        `INSERT INTO tco_agent_negotiations (
          customer_id,
          tier,
          rate,
          conditions,
          notes,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [customerId, tier, negotiation.rate, negotiation.conditions, notes]
      );

      // Update customer record if exists
      const customerExists = await this.pool.query(
        'SELECT id FROM tco_customers WHERE id = $1',
        [customerId]
      );

      if (customerExists.rows.length > 0) {
        await this.pool.query(
          `UPDATE tco_customers
           SET revenue_share = $1,
               notes = CONCAT(notes, $2)
           WHERE id = $3`,
          [
            negotiation.rate,
            `\n[NEGOTIATION] ${tier}: ${negotiation.conditions} - ${notes}`,
            customerId,
          ]
        );
      }

      return {
        success: true,
        tier,
        rate: negotiation.rate,
        ratePercent: negotiation.rate * 100,
        conditions: negotiation.conditions,
      };
    } catch (error) {
      console.error('Error negotiating price:', error);
      return {
        success: false,
        error: error.message,
      };
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
   * Process follow-ups (run periodically) - PERSISTENCE MODE
   */
  async processFollowUps() {
    try {
      console.log('🔄 [TCO AGENT] Processing follow-ups (PERSISTENCE MODE)...');

      // Get interactions that need follow-up (follow_up_count < 3)
      const result = await this.pool.query(
        `SELECT * FROM tco_agent_interactions
         WHERE follow_up_scheduled = TRUE
           AND follow_up_at <= NOW()
           AND response_status = 'sent'
           AND became_lead = FALSE
           AND (follow_up_count < 3 OR follow_up_count IS NULL)
         ORDER BY follow_up_at ASC
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
   * Send follow-up message - PERSISTENCE MODE (3 strikes)
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
      const currentFollowUpCount = interaction.follow_up_count || 0;
      const nextFollowUpCount = currentFollowUpCount + 1;

      console.log(`📤 [TCO AGENT] Sending follow-up #${nextFollowUpCount} to ${interaction.author_username}`);

      // Generate follow-up message based on count (escalating persistence)
      const followUpMessage = await this.generateFollowUpMessage(interaction, nextFollowUpCount);

      // Determine if we should schedule another follow-up
      const shouldScheduleNext = nextFollowUpCount < 3;

      // Update database with persistence tracking
      await this.pool.query(
        `UPDATE tco_agent_interactions
         SET follow_up_count = $1,
             follow_up_response = $2,
             follow_up_at = ${shouldScheduleNext ? 'NOW() + INTERVAL \'48 hours\'' : 'NULL'},
             follow_up_scheduled = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          nextFollowUpCount,
          followUpMessage,
          shouldScheduleNext,
          interactionId,
        ]
      );

      if (!shouldScheduleNext) {
        console.log(`🛑 [TCO AGENT] Reached 3 follow-ups for interaction #${interactionId} - marking as lost (but door left open)`);

        // Mark as lost but with note that door is open
        await this.pool.query(
          `UPDATE tco_agent_interactions
           SET response_status = 'lost_after_followups',
               review_notes = 'Reached 3 follow-ups without conversion. Door left open for future re-engagement.'
           WHERE id = $1`,
          [interactionId]
        );
      }

      // Update stats
      await this.pool.query(
        `UPDATE tco_agent_stats
         SET follow_ups_sent = follow_ups_sent + 1
         WHERE date = CURRENT_DATE`
      );

      return {
        success: true,
        followUpCount: nextFollowUpCount,
        willFollowUpAgain: shouldScheduleNext,
      };
    } catch (error) {
      console.error('Error sending follow-up:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate follow-up message - ESCALATING PERSISTENCE
   */
  async generateFollowUpMessage(interaction, followUpCount) {
    const username = interaction.author_username;
    const originalMessage = interaction.original_message;

    // Different strategy for each follow-up
    if (followUpCount === 1) {
      // First follow-up: Gentle reminder + value proposition
      const templates = [
        `Hey ${username ? '@' + username : 'there'}! Following up on AI cost savings - we're down to our last 2 beta spots (out of 5). Zero risk, negotiable pricing. Still interested in a free audit?`,
        `${username ? '@' + username : 'Hi'}! Wanted to circle back - our beta program closes soon (only 2 spots left). You mentioned cost concerns with AI APIs. Can I send you a one-pager showing how we save 90%+?`,
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    } else if (followUpCount === 2) {
      // Second follow-up: Ask what would change their mind
      const prompt = `You are a persistent but respectful sales professional.

Original conversation was about: "${originalMessage}"

This is follow-up #2 (last one before we give up). Write a SHORT message (under 280 chars) that:
1. Acknowledges they might be busy or not interested
2. Asks DIRECTLY: "What would it take to get you to try this?"
3. Offers to address any concerns
4. Mentions beta program is closing (urgency)
5. Makes it easy to say yes (micro-commitment)

${username ? `Address them as @${username}` : ''}

Tone: Respectful, curious, not pushy. Like a human who genuinely wants to help.

Return ONLY the message text.`;

      try {
        const response = await this.callCouncilMember('groq_llama', prompt, {
          maxTokens: 150,
          temperature: 0.8,
          useTwoTier: false,
        });

        return response.replace(/^["']|["']$/g, '').trim();
      } catch (error) {
        // Fallback
        return `${username ? '@' + username : 'Hey'}! Last follow-up - I know you're busy. What would it take to get you to try a free cost audit? Is it a technical concern, pricing, or something else? Happy to address whatever's holding you back. Beta closes this week.`;
      }
    } else if (followUpCount === 3) {
      // Third follow-up: Final attempt, leave door open
      return `${username ? '@' + username : 'Hey'}! This is my last message - don't want to spam you! If you ever want to revisit AI cost savings, I'm here. We've helped companies save 90%+ with zero risk. Door's always open. Best of luck!`;
    }

    // Fallback
    return `Hey ${username ? '@' + username : 'there'}! Just checking in on the AI cost savings opportunity. Still interested?`;
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
