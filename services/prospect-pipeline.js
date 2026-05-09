import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';

// Pricing tiers to include in outreach emails
const PRICING = {
  starter: { name: 'Starter', price: '$997', description: 'New site + SEO + 3 blog posts' },
  growth: { name: 'Growth', price: '$1,497', description: 'Starter + monthly SEO content + social media sync' },
  full: { name: 'Full Service', price: '$297/mo', description: 'Everything managed: site, SEO, blogs, social, POS setup + booking system' },
};

/**
 * Sends an outreach email to a prospect via Postmark.
 * Updates the prospect_sites table with sent_at and delivery_status.
 *
 * @param {object} pool - PostgreSQL connection pool.
 * @param {object} prospect - Prospect data (e.g., from prospect