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
 * Sends an outreach email to a prospect via Postmark.
 * Updates the prospect_sites table with send status.
 *
 * @param {object} pool - PostgreSQL connection pool.
 * @param {object} prospect - The prospect object, expected to contain client_id, contact_email, email_subject, email_body.
 * @param {object} [opts={}] - Options for sending.
 * @param {boolean} [opts.dry_run=false] - If true, generates payload but does not send email.
 * @returns {Promise<{sent: boolean, message_id: string|null, error: string|null, payload?: object}>}
 */
export async function sendProspectOutreach(pool, prospect, opts = {}) {
  if (!POSTMARK_SERVER_TOKEN) {
    logger.warn('[OUTREACH] POSTMARK_SERVER_TOKEN not set. Skipping email send.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'POSTMARK_SERVER_TOKEN not set' };
  }

  if (!EMAIL_FROM) {
    logger.error('[OUTREACH] EMAIL_FROM environment variable not set. Cannot send email.', { clientId: prospect.client_id });
    return { sent: false, message_id: null, error: 'EMAIL_FROM not set' };
  }

  const { client_id, contact_email, email_subject, email_body } = prospect;

  if (!contact_email || !email_subject || !email_body) {
    logger