// @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';
import { createSiteBuilderService } from './site-builder.js';
import { db } from '../db/db.js'; // Assuming db.js exports a configured pool or client

// Pricing tiers to include in outreach emails
const PRICING = {
  starter: { name: 'Starter', price: '$997', description: 'New site + SEO + 3 blog posts' },
  growth: { name: 'Growth', price: '$1,497', description: 'Starter + monthly SEO content + social media sync' },
  full: { name: 'Full Service', price: '$297/mo', description: 'Everything managed: site, SEO, blogs, social, POS setup + booking system' },
};

// Environment variables for Postmark
const POSTMARK_API_URL = 'https://api.postmarkapp.com/email';
const EMAIL_FROM = process.env.EMAIL_FROM;
const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const SITE_BASE_URL = process.env.SITE_BASE_URL;

/**
 * Generates a personalized cold outreach email.
 * This is a placeholder; in a real scenario, this would involve AI generation
 * based on prospect pain points and site preview.
 * @param {object} prospect - The prospect data.
 * @param {object} siteBuildResult - Result from site builder, including previewUrl and qualityReport.
 * @returns {{subject: string, body: string}}
 */
function generateOutreachEmail(prospect, siteBuildResult) {
  const businessName = prospect.business_name || 'your business';
  const contactName = prospect.contact_name || 'there';
  const previewUrl = siteBuildResult.previewUrl;
  const painPoints = prospect.metadata?.painPoints?.slice(0, 3).map(p => `- ${p}`).join('\n') || '';

  const subject = `Quick question about ${businessName}'s online presence`;
  const body = `Hi ${contactName},

I noticed a few things on ${businessName}'s current website that might be holding you back, like:
${painPoints || '- Outdated design\n- Lack of clear calls to action\n- Missing mobile responsiveness'}

We specialize in helping wellness businesses like yours attract more clients online. I took the liberty of creating a quick, AI-generated preview of what a modern, high-converting website could look like for ${businessName}:

${previewUrl}

This isn't live yet, just a concept to show you the potential. If you like what you see, we can discuss how to make it a reality and boost your bookings.

Let me know what you think!

Best,
[Your Name/Company Name]
`;
  return { subject, body };
}

/**
 * Sends an outreach email to a prospect via Postmark.
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * @param {object} pool - Database connection pool.
 * @param {object} prospect - The prospect object containing client_id, contact_email, contact_name, business_name.
 * @param {string} emailSubject - The subject of the email.
 * @param {string} emailBody - The HTML body of the email.
 * @param {object} [opts={}] - Options for sending.
 * @param {boolean} [opts.dry_run=false] - If true, returns email payload without sending.
 * @returns {Promise<{sent: boolean, message_id: string|null, error: string|null, payload?: object}>}
 */
export async function sendProspectOutreach(pool, prospect, emailSubject, emailBody, opts = {}) {
  const { dry_run = false } = opts;

  if (!POSTMARK_SERVER_TOKEN) {
    logger.warn('[OUTREACH] POSTMARK_SERVER_TOKEN not set. Skipping email send.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'POSTMARK_SERVER_TOKEN not set' };
  }

  if (!EMAIL_FROM) {
    logger.error('[OUTREACH] EMAIL_FROM environment variable is not set.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'EMAIL_FROM not set' };
  }

  // Rule 1: Cold emails MUST track consent — never email same address twice without consent
  const suppressedCheck = await pool.query('SELECT suppressed FROM email_suppressions WHERE email = $1 AND suppressed = TRUE', [prospect.contact_email]);
  if (suppressedCheck.rows.length > 0) {
    logger.warn('[OUTREACH] Email suppressed, not sending', { clientId: prospect.client_id, email: prospect.contact_email });
    return { sent: false, message_id: null, error: 'Email address suppressed' };
  }

  const emailPayload = {
    From: EMAIL_FROM,
    To: prospect.contact_email,
    Subject: emailSubject,
    HtmlBody: emailBody,
    TextBody: emailBody.replace(/<[^>]*>?/gm, ''), // Basic HTML to text conversion
    MessageStream: 'outbound', // Categorize emails for Postmark analytics
    Metadata: {
      clientId: prospect.client_id,
      businessName: prospect.business_name,
    },
  };

  if (dry_run) {
    logger.info('[OUTREACH] Dry run: Email payload generated, not sent.', { clientId: prospect.client_id, email: prospect.contact_email });
    return { sent: false, message_id: null, error: 'Dry run', payload: emailPayload };
  }

  try {
    const response = await fetch(POSTMARK_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify(emailPayload),
    });

    const postmarkResponse = await response.json();

    if (response.ok && postmarkResponse.MessageID) {
      logger.info('[OUTREACH] Email sent successfully via Postmark', {
        clientId: prospect.client_id,
        email: prospect.contact_email,
        messageId: postmarkResponse.MessageID,
      });

      // Update prospect_sites table: sent_at, delivery_status, status
      await pool.query(
        'UPDATE prospect_sites SET status = $1, email_sent = TRUE, sent_at = $2, delivery_status = $3, last_contacted_at = $2 WHERE client_id = $4',
        ['sent', new Date(), 'delivered', prospect.client_id]
      );

      // Log the outreach
      await pool.query(
        'INSERT INTO outreach_log (channel, recipient, subject, body, status, external_id, sent_at, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['email', prospect.contact_email, emailSubject, emailBody, 'sent', postmarkResponse.MessageID, new Date(), emailPayload.Metadata]
      );

      return { sent: true, message_id: postmarkResponse.MessageID, error: null };
    } else {
      const error = postmarkResponse.Message || `Postmark error: ${postmarkResponse.ErrorCode} - ${postmarkResponse.Message}`;
      logger.error('[OUTREACH] Failed to send email via Postmark', {
        clientId: prospect.client_id,
        email: prospect.contact_email,
        error: error,
        postmarkResponse,
      });

      // Update prospect_sites table with failure status
      await pool.query(
        'UPDATE prospect_sites SET status = $1, email_sent = FALSE, delivery_status = $2, last_contacted