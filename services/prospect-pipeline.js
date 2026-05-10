import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';
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

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Sends an outreach email to a prospect via Postmark.
 * - Updates prospect_sites table with sent_at, delivery_status, and Postmark message ID.
 * - @param {object} pool - PgSQL connection pool.
 * - @param {object} prospect - The prospect object containing client_id, contact_email, email_subject, and email_body.
 * - @param {object} opts - Options: { dry_run: boolean }
 * - @returns {Promise<{ sent: boolean, message_id: string|null, error: string|null }>}
 */
export async function sendProspectOutreach(pool, prospect, opts = {}) {
  const { dry_run } = opts;

  if (!EMAIL_FROM) {
    logger.warn('[OUTREACH] EMAIL_FROM envVar not set. Cannot send email.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'EMAIL_FROM not set' };
  }

  if (!POSTMARK_SERVER_TOKEN) {
    logger.warn('[OUTREACH] POSTMARK_SERVER_TOKEN envVar not set. Skipping email send.', { clientId: prospect.client_id });
    // Update DB to reflect skipped send if not dry_run
    if (!dry_run) {
      await pool.query(
        `UPDATE prospect_sites SET email_sent = FALSE, metadata = jsonb_set(jsonb_set(COALESCE(metadata, '{}'::jsonb), '{outreach