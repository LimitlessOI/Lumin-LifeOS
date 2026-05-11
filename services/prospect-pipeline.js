import logger from './logger.js';
import { scoreProspectUrl } from './site-builder-opportunity-scorer.js';

// Pricing tiers to include in outreach emails
const PRICING = {
  starter: { name: 'Starter', price: '$997', description: 'New site + SEO + 3 blog posts' },
  growth: { name: 'Growth', price: '$1,497', description: 'Starter + monthly SEO content + social media sync' },
  full: { name: 'Full Service', price: '$297/mo', description: 'Everything managed: site, SEO, blogs, social, POS setup + booking system' },
};

// Removed createNoopEmailAdapter as email sending logic is now internal to ProspectPipeline

expDef class ProspectPipeline {
  constructor({ siteBuilder, pool, callCouncil, baseUrl = '' } = {}) {
    this.siteBuilder = siteBuilder;
    this.pool = pool;
    this.call