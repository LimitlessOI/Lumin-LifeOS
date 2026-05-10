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
 * Sends an outreach email to a prospect via