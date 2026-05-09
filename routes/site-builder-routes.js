import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { getRegistryHealth } from '../services/env-registry-map.js'; // Added import for env-registry-map
let _siteBuilder = null;
let _prospectPipeline = null;
// --- Start of copied/adapted discovery logic from scripts/site-builder-prospect-discovery.mjs ---
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];
async function searchGooglePlaces(city, type, apiKey, count) {
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.status === 'REQUEST_DENIED') {
      logger.error('Google Places apiKey rejected:', json.error_message);
      return [];
    }
    if (!json.results?.length) {
      logger.warn(`No Google Places results found for "${type}" in "${city}".`);
      return [];
    }
    return json.results.slice(0, count).map(place => ({
      name: place.name,
      website: place.website || null,
      address: place.formatted_address || null,
      rating: place.rating || null,
      city,
      type,
      source: 'google_places',
    }));
  } catch (err) {
    clearTimeout(timer);
    logger.error('Google Places fetch error:', err.message);
    return [];
  }
}
// --- End of copied/adapted discovery logic ---
async function notifySlack(event, businessName, detail = '') {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const emoji = event === 'replied' ? '💬' : '👀';
  const label = event === 'replied' ? 'REPLIED to cold email' : 'VIEWED preview';
  const text = `${emoji} Warm lead alert — ${label}\nBusiness: ${businessName}\n${detail}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Slack notify is best-effort
  }
}
function getSiteBuilder({ ccm, baseUrl }) {
  if (!_siteBuilder) {
    _siteBuilder = new SiteBuilder({
      callCouncil: ccm,
      previewsDir: 'public/previews',
      baseUrl,
    });
  }
  return _siteBuilder;
}
function getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl }) {
  if (!_prospectPipeline) {
    const builder = getSiteBuilder({ ccm, baseUrl });
    // Build sendEmail adapter — prefer NotificationService (Postmark + suppression),
    // fall back to outreachAutomation, then log-only.
    let sendEmail;
    if (notificationService) {
      sendEmail = async (to, subject, html) => {
        const result = await notificationService.sendEmail({ to, subject, html, text: '' });
        if (!result.success) logger.warn('[PROSPECT] Email not sent', { to, reason: result.error });
        return result;
      };
    } else if (outreachAutomation) {
      sendEmail = async (to, subject, html) => outreachAutomation.sendEmail(to, subject, html);
    } else {
      sendEmail = async (to, subject) => {
        logger.info('[PROSPECT] Email (no sender configured)', { to, subject });
      };
    }
    _prospectPipeline = new ProspectPipeline({
      siteBuilder: builder,
      pool,
      callCouncil: ccm,
      sendEmail,
      baseUrl,
    });
  }
  return _prospectPipeline;
}
/**
 * Register siteBld routes on the Express app. Also registers static file serving for /previews/.
 */
export function createSiteBuilderRoutes(app, { pool, rk, ccm, baseUrl, outreachAutomation, notificationService } = {}) {
  const router = Router();
  const buildLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, //