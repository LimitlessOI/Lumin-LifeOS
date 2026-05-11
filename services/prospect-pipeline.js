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

// Environment