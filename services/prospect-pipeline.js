/**
 * Prospect Pipeline — Find a business → build their mock site → email it to them
 *
 * Flow:
 *   Business URL/email → SiteBuilder builds mock site → Deploy preview →
 *   Send cold email: "We built a free upgrade of your website — here's the link" →
 *   Track in DB → Follow-up sequence
 *
 * Cold email strategy (research-confirmed best):
 *   - Subject: personalized with their business name
 *   - Body: 3-4 sentences max, leads with the value (preview link), no pitch
 *   - CTA: single link to their preview site
 *   - Follow-up: 3-email sequence over 7 days
 *
 * Revenue model:
 *   - One-time site build fee: $997-$1,997
 *   - Monthly maintenance/SEO/content: $297-$597/mo
 *   - POS referral commission: $50-$200 per signup
 *
 * Usage:
 *   import ProspectPipeline from './services/prospect-pipeline.js';
 *   const pipeline = new ProspectPipeline({ siteBuilder, pool, callCouncil, sendEmail });
 *   const result = await pipeline.processProspect({
 *     businessUrl: 'https://theirsite.com',
 *     contactEmail: 'owner@theirsite.com',
 *     contactName: 'Jane',
 *     businessName: 'Gentle Hands Midwifery',
 *   });
 */

import logger from './logger.js';

// Pricing tiers to include in outreach emails
const PRICING = {
  starter: { name: 'Starter', price: '$997', description: 'New site + SEO + 3 blog posts' },
  growth: { name: 'Growth', price: '$1,497', description: 'Starter + monthly SEO content + social media sync' },
  full: { name: 'Full Service', price: '$297/mo', description: 'Everything managed: site, SEO, blogs, social, POS setup + booking system' },
};

function createNoopEmailAdapter() {
  return async (to, subject) => {
    logger.info('[PROSPECT] Email (no sender configured)', { to, subject });
    return { success: false, error: 'No email sender configured' };
  };
}

export default class ProspectPipeline {
  constructor({ siteBuilder, pool, callCouncil, sendEmail, baseUrl = '' } = {}) {
    this.siteBuilder = siteBuilder;
    this.pool = pool;
    this.callCouncil = callCouncil;
    this.sendEmail = sendEmail; // fn(to, subject, html) => Promise
    this.baseUrl = baseUrl;
  }

  /**
   * Full prospect pipeline: build mock site + send outreach email.
   */
  async processProspect(options = {}) {
    const {
      businessUrl,
      contactEmail,
      contactName = '',
      businessName = '',
      skipEmail = false,
    } = options;

    if (!businessUrl) return { success: false, error: 'businessUrl required' };

    logger.info('[PROSPECT] Processing prospect', { businessUrl, contactEmail });

    // Step 1: Build their mock site
    const buildResult = await this.siteBuilder.buildFromUrl(businessUrl, {
      businessInfo: options.businessInfo || null,
    });

    if (!buildResult.success) {
      return { success: false, error: `Site build failed: ${buildResult.error}` };
    }

    const previewUrl = buildResult.previewUrl;
    const name = contactName || buildResult.businessName || businessName || 'there';
    const biz = buildResult.businessName || businessName || 'your business';

    // Step 2: Generate personalized email copy
    const emailContent = await this.generateOutreachEmail({
      contactName: name,
      businessName: biz,
      previewUrl,
      industry: buildResult.metadata?.businessInfo?.industry,
      posPartnerName: buildResult.posPartner,
    });

    // Step 3: Send email (if contact email provided and not skipped)
    let emailSent = false;
    if (contactEmail && !skipEmail) {
      try {
        const delivery = await this.sendEmail(contactEmail, emailContent.subject, emailContent.html);
        emailSent = delivery?.success !== false;
        if (emailSent) {
          logger.info('[PROSPECT] Outreach email sent', { contactEmail, previewUrl });
        } else {
          logger.warn('[PROSPECT] Outreach email not sent', { contactEmail, previewUrl, error: delivery?.error || 'unknown' });
        }
      } catch (err) {
        logger.warn('[PROSPECT] Email send failed', { error: err.message });
      }
    }

    // Step 4: Record in DB
    await this.recordProspect({
      businessUrl,
      contactEmail,
      contactName: name,
      businessName: biz,
      clientId: buildResult.clientId,
      previewUrl,
      emailSent,
      metadata: buildResult.metadata,
    });

    return {
      success: true,
      clientId: buildResult.clientId,
      previewUrl,
      emailSent,
      emailSubject: emailContent.subject,
      businessName: biz,
      posPartner: buildResult.posPartner,
    };
  }

  /**
   * Generate personalized cold outreach email copy.
   * Keeps it short — 3-4 sentences, leads with the value.
   */
  async generateOutreachEmail({ contactName, businessName, previewUrl, industry, posPartnerName }) {
    if (this.callCouncil) {
      const prompt = `Write a cold outreach email for a web agency that built a FREE mock website upgrade for a prospect.

CONTEXT:
- Their business: ${businessName}
- Industry: ${industry || 'wellness/health'}
- Contact name: ${contactName}
- Preview URL: ${previewUrl}
- We built them a free upgraded site with: SEO optimization, click funnel, blog posts, booking system, ${posPartnerName} integration

EMAIL RULES:
- Subject: Under 8 words, personalized with business name, no clickbait
- Body: 3-4 short paragraphs maximum
- Paragraph 1: Lead with the value — "I built a free upgrade of your website"
- Paragraph 2: What's included (1-2 sentences, bullet points ok)
- Paragraph 3: Single clear CTA — view the preview at [URL]
- Paragraph 4: No-pressure close — "No obligation, just wanted to share"
- Tone: warm, direct, professional — NOT salesy
- NO: "I hope this email finds you well", "synergies", corporate jargon
- Include actual preview URL as a clickable link

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body_text": "plain text version",
  "body_html": "HTML version with proper formatting"
}`;

      try {
        const response = await this.callCouncil('chatgpt', prompt, { model: 'gpt-4o-mini', maxTokens: 800 });
        const jsonMatch = response.match(/\{[\s\S]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            subject: parsed.subject,
            html: parsed.body_html || this.fallbackEmailHtml(contactName, businessName, previewUrl),
          };
        }
      } catch { /* fall through to template */ }
    }

    // Fallback template email
    return {
      subject: `${businessName} — free website upgrade preview`,
      html: this.fallbackEmailHtml(contactName, businessName, previewUrl),
    };
  }

  /**
   * Fallback email template when AI is unavailable.
   */
  fallbackEmailHtml(contactName, businessName, previewUrl) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <p>Hi ${contactName || 'there'},</p>
  <p>I took a look at ${businessName || 'your website'} and built a free upgraded version to show you what's possible — fully optimized for SEO, with a modern booking flow and automated blog content for your industry.</p>
  <p>Here's what's included in the free preview:</p>
  <ul>
    <li>✅ Modern click-funnel design (built to convert visitors to bookings)</li>
    <li>✅ SEO-optimized pages + 3 industry blog posts</li>
    <li>✅ Integrated booking system setup</li>
    <li>✅ Mobile responsive + fast-loading</li>
    <li>✅ YouTube video sync (your videos auto-appear on the site)</li>
  </ul>
  <p style="margin: 24px 0;">
    <a href="${previewUrl}" style="background: #7C3AED; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; display: inline-block;">
      👀 View Your Free Preview
    </a>
  </p>
  <p>No obligation at all — I just wanted to show you what's possible. If you like it and want to go live with it, we can talk. If not, keep the preview as inspiration.</p>
  <p>Best,<br>The Lumin AI Team</p>
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 11px; color: #999;">
    Pricing if interested: Site build from $997 | Monthly care plan from $297/mo<br>
    <a href="${previewUrl}" style="color: #7C3AED;">${previewUrl}</a>
  </p>
</body>
</html>`;
  }

  /**
   * Save prospect record to database.
   */
  async recordProspect(data) {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO prospect_sites
          (client_id, business_url, contact_email, contact_name, business_name, preview_url, email_sent, status, metadata, created_at, last_contacted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), CASE WHEN $7 THEN NOW() ELSE NULL END)
         ON CONFLICT (client_id) DO NOTHING`,
        [
          data.clientId,
          data.businessUrl,
          data.contactEmail || null,
          data.contactName || null,
          data.businessName || null,
          data.previewUrl,
          data.emailSent || false,
          data.emailSent ? 'sent' : 'built',
          JSON.stringify(data.metadata || {}),
        ]
      );
    } catch (err) {
      // Table may not exist yet — log but don't crash
      logger.warn('[PROSPECT] DB record failed (table may not exist)', { error: err.message });
    }
  }

  /**
   * Get all prospects from DB.
   */
  async listProspects(limit = 50) {
    if (!this.pool) return [];
    try {
      const result = await this.pool.query(
        `SELECT * FROM prospect_sites ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  /**
   * Send follow-up sequence to a prospect (3 emails over 7 days).
   * Call this on day 3 and day 7 after initial outreach.
   */
  async sendFollowUp(prospectId, followUpNumber = 2) {
    if (!this.pool || !this.sendEmail) return { success: false, error: 'pool and sendEmail are required' };

    let row;
    try {
      const result = await this.pool.query(
        'SELECT * FROM prospect_sites WHERE client_id = $1',
        [prospectId]
      );
      row = result.rows[0];
    } catch {
      return { success: false, error: 'prospect lookup failed' };
    }

    if (!row || !row.contact_email) return { success: false, error: 'prospect or contact email missing' };
    if (['converted', 'lost', 'expired'].includes(String(row.status || '').toLowerCase())) {
      return { success: false, error: `prospect status ${row.status} is not follow-up eligible` };
    }

    const subjects = {
      2: `Quick question about ${row.business_name || 'your site preview'}`,
      3: `Last follow-up — ${row.business_name || 'your free preview'}`,
    };

    const bodies = {
      2: this.fallbackEmailHtml(row.contact_name, row.business_name, row.preview_url)
        .replace('I just wanted to show you', 'Just following up — did you get a chance to see the preview?'),
      3: this.fallbackEmailHtml(row.contact_name, row.business_name, row.preview_url)
        .replace('No obligation at all', 'This is my last follow-up — completely understand if the timing isn\'t right'),
    };

    if (subjects[followUpNumber]) {
      const delivery = await this.sendEmail(row.contact_email, subjects[followUpNumber], bodies[followUpNumber]);
      if (delivery?.success === false) {
        logger.warn('[PROSPECT] Follow-up email not sent', {
          prospectId,
          followUpNumber,
          recipient: row.contact_email,
          error: delivery.error || 'unknown',
        });
        return { success: false, error: delivery.error || 'follow-up send failed' };
      }

      await this.pool.query(
        `UPDATE prospect_sites
            SET follow_up_count = COALESCE(follow_up_count, 0) + 1,
                last_follow_up_at = NOW(),
                last_contacted_at = NOW(),
                updated_at = NOW()
          WHERE client_id = $1`,
        [prospectId]
      ).catch(() => {});

      logger.info('[PROSPECT] Follow-up sent', { prospectId, followUpNumber, recipient: row.contact_email });
      return { success: true, prospectId, followUpNumber, recipient: row.contact_email };
    }

    return { success: false, error: `unsupported followUpNumber ${followUpNumber}` };
  }
}

export async function runFollowUpCron({ pool, sendEmail } = {}) {
  if (!pool) {
    logger.warn('[PROSPECT] Follow-up cron disabled — no DB pool');
    return { success: false, error: 'pool required', processed: 0, sent: 0 };
  }

  const pipeline = new ProspectPipeline({
    pool,
    sendEmail: sendEmail || createNoopEmailAdapter(),
  });

  logger.info('[PROSPECT] Running follow-up cron');

  try {
    const result = await pool.query(`
      SELECT client_id,
             business_name,
             contact_email,
             created_at,
             follow_up_count,
             last_follow_up_at,
             status
        FROM prospect_sites
       WHERE email_sent = TRUE
         AND contact_email IS NOT NULL
         AND status NOT IN ('converted', 'lost', 'expired')
         AND (
           (COALESCE(follow_up_count, 0) = 0 AND created_at <= NOW() - INTERVAL '3 days')
           OR
           (COALESCE(follow_up_count, 0) = 1 AND created_at <= NOW() - INTERVAL '7 days')
         )
       ORDER BY created_at ASC
    `);

    let sent = 0;
    const errors = [];

    for (const row of result.rows) {
      const followUpNumber = Number(row.follow_up_count || 0) === 0 ? 2 : 3;
      const outcome = await pipeline.sendFollowUp(row.client_id, followUpNumber);
      if (outcome?.success) sent += 1;
      else if (outcome?.error) errors.push({ clientId: row.client_id, error: outcome.error });
    }

    logger.info('[PROSPECT] Follow-up cron complete', {
      eligible: result.rows.length,
      sent,
      failed: errors.length,
    });

    return {
      success: true,
      processed: result.rows.length,
      sent,
      failed: errors.length,
      errors,
    };
  } catch (err) {
    logger.error('[PROSPECT] Follow-up cron failed', { error: err.message });
    return { success: false, error: err.message, processed: 0, sent: 0 };
  }
}
