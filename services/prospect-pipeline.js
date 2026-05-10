import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';
// Pricing tiers to include in outreach emails
const PRICING = { starter: { name: 'Starter', price: '$997', description: 'New site + SEO + 3 blog posts' }, growth: { name: 'Growth', price: '$1,497', description: 'Starter + monthly SEO content + social media sync' }, full: { name: 'Full Service', price: '$297/mo', description: 'Everything managed: site, SEO, blogs, social, POS setup + booking system' },
};
// Environment variables for Postmark
const POSTMARK_API_URL = 'https://api.postmarkapp.com/email';
const EMAIL_FROM = process.env.EMAIL_FROM;
const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Sends an outreach email to a prospect via Postmark.
 * Updates prospect_sites table with sent_at, delivery_status, and Postmark message ID.
 * @param {object} pool - PostgreSQL connection pool.
 * @param {object} prospect - The prospect object containing client_id, contact_email, email_subject, and email_body.
 * @param {object} opts - Options: { dry_run: boolean }
 * @returns {Promise<{ sent: boolean, message_id: string|null, error: string|null }>}
 */
export async function sendProspectOutreach(pool, prospect, opts = {}) {
  const { dry_run } = opts;

  if (!EMAIL_FROM) {
    logger.warn('[OUTREACH] EMAIL_FROM environment variable not set. Cannot send email.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'EMAIL_FROM not set' };
  }

  if (!POSTMARK_SERVER_TOKEN) {
    logger.warn('[OUTREACH] POSTMARK_SERVER_TOKEN environment variable not set. Skipping email send.', { clientId: prospect.client_id });
    // Update DB to reflect skipped send if not dry_run
    if (!dry_run) {
      await pool.query(
        `UPDATE prospect_sites SET last_contacted_at = NOW(), delivery_status = $1, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{send_error}', $2::jsonb, true) WHERE client_id = $3`,
        ['skipped_no_token', JSON.stringify('POSTMARK_SERVER_TOKEN not set'), prospect.client_id]
      );
    }
    return { sent: false, message_id: null, error: 'POSTMARK_SERVER_TOKEN not set' };
  }

  const emailPayload = {
    From: EMAIL_FROM,
    To: prospect.contact_email,
    Subject: prospect.email_subject,
    HtmlBody: prospect.email_body,
    MessageStream: 'outbound', // Standard for cold outreach
  };

  if (dry_run) {
    logger.info('[OUTREACH] Dry run: Email payload generated but not sent.', { clientId: prospect.client_id, emailPayload });
    return { sent: false, message_id: null, error: 'Dry run, email not sent', payload: emailPayload };
  }

  let message_id = null;
  let delivery_status = 'failed';
  let error = null;

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

    const result = await response.json();

    if (response.ok) {
      message_id = result.MessageID;
      delivery_status = 'sent';
      logger.info('[OUTREACH] Email sent successfully via Postmark.', { clientId: prospect.client_id, message_id, to: prospect.contact_email });
    } else {
      error = result.Message || `Postmark API error: ${response.status} ${response.statusText}`;
      logger.error('[OUTREACH] Failed to send email via Postmark.', { clientId: prospect.client_id, error, postmarkResponse: result });
    }
  } catch (err) {
    error = `Network or unexpected error: ${err.message}`;
    logger.error('[OUTREACH] Exception while sending email via Postmark.', { clientId: prospect.client_id, error: err.message });
  }

  // Update prospect_sites table with send status
  try {
    const updateQuery = `
      UPDATE prospect_sites
      SET
        email_sent = TRUE,
        sent_at = NOW(),
        delivery_status = $1,
        last_contacted_at = NOW(),
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{postmark_message_id}', $2::jsonb, true)
      WHERE client_id = $3
      RETURNING *;
    `;
    await pool.query(updateQuery, [delivery_status, JSON.stringify(message_id), prospect.client_id]);
    logger.debug('[OUTREACH] Prospect record updated with email send status.', { clientId: prospect.client_id, delivery_status });
  } catch (dbErr) {
    logger.error('[OUTREACH] Failed to update prospect_sites after email send attempt.', { clientId: prospect.client_id, dbError: dbErr.message });
    // This error is secondary to the email send attempt, but important to log.
    // We still return the result of the email send.
  }

  return { sent: delivery_status === 'sent', message_id, error };
}