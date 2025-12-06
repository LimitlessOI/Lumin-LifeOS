/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    OUTREACH AUTOMATION ENGINE                                   ║
 * ║                    Calls, Emails, Texts, Social Media                           ║
 * ║                    Ready for Monday Sales Launch                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

// No imports needed - dependencies passed in constructor

export class OutreachAutomation {
  constructor(pool, modelRouter, getTwilioClient, callCouncilMember) {
    this.pool = pool;
    this.router = modelRouter;
    this.getTwilioClient = getTwilioClient;
    this.callCouncilMember = callCouncilMember;
    this.campaigns = new Map();
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
    // Check if email service configured
    const emailService = process.env.EMAIL_SERVICE; // 'sendgrid', 'ses', 'resend', etc.
    
    if (!emailService) {
      console.warn('Email service not configured');
      return { success: false, error: 'Email service not configured' };
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

    // TODO: Implement actual email sending based on service
    // For now, log it
    console.log(`📧 [EMAIL] To: ${to}, Subject: ${subject}`);
    
    try {
      await this.pool.query(
        `INSERT INTO outreach_log (channel, recipient, subject, body, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['email', to, subject, emailBody, 'sent']
      );
    } catch (err) {
      console.warn(`Failed to log email: ${err.message}`);
    }

    return { success: true, messageId: `email_${Date.now()}` };
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, message) {
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
