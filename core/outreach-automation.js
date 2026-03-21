/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OUTREACH AUTOMATION ENGINE                                   ║
 * ║                    Calls, Emails, Texts, Social Media                           ║
 * ║                    Ready for Monday Sales Launch                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

// No imports needed - dependencies passed in constructor

export class OutreachAutomation {
  constructor(pool, modelRouter, getTwilioClient, callCouncilMember, notificationService = null) {
    this.pool = pool;
    this.router = modelRouter;
    this.getTwilioClient = getTwilioClient;
    this.callCouncilMember = callCouncilMember;
    this.notificationService = notificationService;
    this.campaigns = new Map();
  }

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  normalizePhone(phone) {
    return String(phone || '').trim();
  }

  recipientKeyFor(channel, recipient) {
    if (!recipient) return null;
    if (channel === 'email') return `email:${this.normalizeEmail(recipient)}`;
    if (channel === 'sms' || channel === 'call') return `phone:${this.normalizePhone(recipient)}`;
    return `recipient:${String(recipient).trim()}`;
  }

  isWithinQuietHoursUtc(policy) {
    const start = policy?.quiet_hours_start_utc;
    const end = policy?.quiet_hours_end_utc;
    if (start == null || end == null) return false;

    const hour = new Date().getUTCHours();
    const s = Number(start);
    const e = Number(end);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return false;

    // If start < end: quiet between [start, end)
    // If start > end: quiet wraps midnight
    if (s === e) return true; // fully quiet day
    if (s < e) return hour >= s && hour < e;
    return hour >= s || hour < e;
  }

  /**
   * Outbound governance gate (fail-closed): blocks if consent record missing.
   */
  async enforceOutboundPolicy(channel, recipient) {
    const key = this.recipientKeyFor(channel, recipient);
    if (!key) return { ok: false, error: 'Missing recipient' };

    // Social posting is platform-targeted; treat as internal/log-only for now.
    if (channel === 'social') {
      return { ok: true };
    }

    let row;
    try {
      const result = await this.pool.query(
        `SELECT *
         FROM outreach_recipients
         WHERE recipient_key = $1
         LIMIT 1`,
        [key]
      );
      row = result.rows[0] || null;
    } catch (e) {
      return { ok: false, error: `Governance DB error (fail-closed): ${e.message}` };
    }

    if (!row) {
      return { ok: false, error: `No consent record for ${key} (fail-closed)` };
    }

    if (row.do_not_contact) {
      return { ok: false, error: `Recipient is marked do_not_contact` };
    }

    if (this.isWithinQuietHoursUtc(row)) {
      return { ok: false, error: `Within recipient quiet hours (UTC)` };
    }

    if (channel === 'email' && !row.consent_email) {
      return { ok: false, error: `No email consent` };
    }
    if (channel === 'sms' && !row.consent_sms) {
      return { ok: false, error: `No SMS consent` };
    }
    if (channel === 'call' && !row.consent_call) {
      return { ok: false, error: `No call consent` };
    }

    // Per-recipient rate limit (DB-backed)
    const maxPerHour = Number(process.env.OUTREACH_MAX_PER_RECIPIENT_PER_HOUR || '3');
    const maxPerDay = Number(process.env.OUTREACH_MAX_PER_RECIPIENT_PER_DAY || '10');

    try {
      const hour = await this.pool.query(
        `SELECT COUNT(*)::int AS c
         FROM outreach_log
         WHERE recipient = $1
           AND channel = $2
           AND created_at >= NOW() - INTERVAL '1 hour'
           AND status IN ('sent','initiated')`,
        [recipient, channel]
      );
      const day = await this.pool.query(
        `SELECT COUNT(*)::int AS c
         FROM outreach_log
         WHERE recipient = $1
           AND channel = $2
           AND created_at >= NOW() - INTERVAL '24 hours'
           AND status IN ('sent','initiated')`,
        [recipient, channel]
      );

      const hourCount = hour.rows[0]?.c || 0;
      const dayCount = day.rows[0]?.c || 0;

      if (Number.isFinite(maxPerHour) && hourCount >= maxPerHour) {
        return { ok: false, error: `Rate limited: recipient hourly cap reached` };
      }
      if (Number.isFinite(maxPerDay) && dayCount >= maxPerDay) {
        return { ok: false, error: `Rate limited: recipient daily cap reached` };
      }
    } catch (e) {
      return { ok: false, error: `Rate-limit check failed (fail-closed): ${e.message}` };
    }

    return { ok: true };
  }

  /**
   * Generate personalized outreach message using AI
   */
  async generateOutreachMessage(contact, channel = 'email') {
    const prompt = `Generate a personalized ${channel} message for:

COMPANY: ${contact.company || 'Unknown'}
ROLE: ${contact.role || 'Executive'}
INDUSTRY: ${contact.industry || 'Unknown'}

MESSAGE TYPE: Sales pitch for AI cost reduction service
KEY POINTS:
- Reduce AI/LLM costs by 90-95%
- Pay only % of savings (no upfront cost)
- White-label solution
- Setup fee: $100-300 (can be waived or taken from savings)

TONE: Professional, value-focused, no technical jargon
LENGTH: ${channel === 'email' ? '3-4 paragraphs' : channel === 'text' ? '2-3 sentences' : '1-2 sentences'}`;

    const result = await this.router.route(prompt, {
      taskType: 'analysis',
      riskLevel: 'low',
      userFacing: false,
    });

    return result.success ? result.result : null;
  }

  /**
   * Send email via configured SMTP or service
   */
  async sendEmail(to, subject, body, from = null) {
    const policy = await this.enforceOutboundPolicy('email', to);
    if (!policy.ok) {
      return { success: false, error: policy.error };
    }

    // Prefer the canonical NotificationService (production path)
    if (this.notificationService) {
      return await this.notificationService.sendEmail({
        to,
        subject,
        text: body,
        from: from || undefined,
      });
    }

    // Generate email using AI if body is a prompt
    let emailBody = body;
    if (body.length < 100) {
      // Probably a prompt, generate full email
      const generated = await this.generateOutreachMessage(
        { company: to.split('@')[1]?.split('.')[0] || 'Company' },
        'email'
      );
      if (generated) emailBody = generated;
    }

    // Legacy fallback: log only (non-production)
    console.warn('⚠️ [EMAIL] NotificationService not configured; falling back to log-only mode');
    
    try {
      await this.pool.query(
        `INSERT INTO outreach_log (channel, recipient, subject, body, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['email', to, subject, emailBody, 'logged_only']
      );
    } catch (err) {
      console.warn(`Failed to log email: ${err.message}`);
    }

    return { success: false, error: 'Email not sent (NotificationService not configured)', messageId: null };
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, message) {
    const policy = await this.enforceOutboundPolicy('sms', to);
    if (!policy.ok) {
      return { success: false, error: policy.error };
    }

    const client = await this.getTwilioClient();
    if (!client) {
      return { success: false, error: 'Twilio not configured' };
    }

    // Generate message if it's a prompt
    let smsBody = message;
    if (message.length < 50) {
      const generated = await this.generateOutreachMessage(
        { company: 'Company' },
        'text'
      );
      if (generated) smsBody = generated.substring(0, 160); // SMS limit
    }

    try {
      const sms = await client.messages.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: smsBody,
      });

      await this.pool.query(
        `INSERT INTO outreach_log (channel, recipient, body, status, external_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['sms', to, smsBody, 'sent', sms.sid]
      );

      return { success: true, messageSid: sms.sid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Make phone call via Twilio
   */
  async makeCall(to, script = null) {
    const policy = await this.enforceOutboundPolicy('call', to);
    if (!policy.ok) {
      return { success: false, error: policy.error };
    }

    const client = await this.getTwilioClient();
    if (!client) {
      return { success: false, error: 'Twilio not configured' };
    }

    // Generate call script if not provided
    if (!script) {
      const generated = await this.generateOutreachMessage(
        { company: 'Company' },
        'call'
      );
      script = generated || 'Hello, I\'m calling about reducing your AI costs by 90-95%.';
    }

    try {
      const call = await client.calls.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080'}/api/v1/phone/call-handler`,
        method: 'POST',
      });

      await this.pool.query(
        `INSERT INTO outreach_log (channel, recipient, body, status, external_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['call', to, script, 'initiated', call.sid]
      );

      return { success: true, callSid: call.sid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Post to social media
   */
  async postToSocial(platform, content) {
    // Generate content if it's a prompt
    let postContent = content;
    if (content.length < 100) {
      const generated = await this.generateOutreachMessage(
        { company: 'General' },
        'social'
      );
      if (generated) postContent = generated;
    }

    // TODO: Implement actual social media APIs
    // For now, log it
    console.log(`📱 [SOCIAL] ${platform}: ${postContent.substring(0, 100)}...`);

    try {
      await this.pool.query(
        `INSERT INTO outreach_log (channel, recipient, body, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        ['social', platform, postContent, 'posted']
      );
    } catch (err) {
      console.warn(`Failed to log social post: ${err.message}`);
    }

    return { success: true, postId: `social_${Date.now()}` };
  }

  /**
   * Launch outreach campaign
   */
  async launchCampaign(campaignConfig) {
    const {
      name,
      targets, // Array of {email, phone, company, role, industry}
      channels = ['email'], // email, sms, call, social
      messageTemplate,
    } = campaignConfig;

    const campaignId = `camp_${Date.now()}`;
    const results = {
      campaignId,
      name,
      total: targets.length,
      sent: 0,
      failed: 0,
      byChannel: {},
    };

    for (const target of targets) {
      for (const channel of channels) {
        try {
          let result;
          const message = messageTemplate || await this.generateOutreachMessage(target, channel);

          switch (channel) {
            case 'email':
              result = await this.sendEmail(
                target.email,
                `Reduce Your AI Costs by 90-95% - ${target.company || 'Your Company'}`,
                message
              );
              break;
            case 'sms':
              result = await this.sendSMS(target.phone, message);
              break;
            case 'call':
              result = await this.makeCall(target.phone, message);
              break;
            case 'social':
              result = await this.postToSocial(target.platform || 'linkedin', message);
              break;
          }

          if (result?.success) {
            results.sent++;
            results.byChannel[channel] = (results.byChannel[channel] || 0) + 1;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Campaign error for ${target.email || target.phone}:`, error.message);
          results.failed++;
        }
      }
    }

    this.campaigns.set(campaignId, results);
    return results;
  }

  /**
   * Get campaign results
   */
  getCampaignResults(campaignId) {
    return this.campaigns.get(campaignId) || null;
  }
}
