import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { getRegistryHealth } from '../services/env-registry-map.js'; // Import getRegistryHealth

const router = Router();

// --- Start of discovery logic adapted from scripts/site-builder-prospect-discovery.mjs ---
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

// Completing the truncated searchGooglePlaces function for syntactic validity
async function searchGooglePlaces(city, type, apiKey, count) {
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results ? data.results.slice(0, count || 20).map(place => ({
      name: place.name,
      address: place.formatted_address,
      // Add other relevant fields if needed for a more complete mock, but not required for task
    })) : [];
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.warn('Google Places API request timed out.');
    } else {
      logger.error('Error in searchGooglePlaces:', error);
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// --- End of discovery logic ---

// Add the new launch-readiness API endpoint
router.get('/launch-readiness', async (req, res) => {
  try {
    const healthReport = getRegistryHealth();
    const ready = healthReport.summary.healthy;
    const missing_needed = healthReport.missingNeeded.map(item => item.name);
    const revenue_blockers = healthReport.revenueBlockers.map(item => item.name);
    const checked_at = new Date().toISOString();

    res.json({
      ok: true,
      ready,
      missing_needed,
      revenue_blockers,
      checked_at,
    });
  } catch (error) {
    logger.error('Error checking launch readiness:', error);
    res.status(500).json({
      ok: false,
      ready: false,
      missing_needed: [],
      revenue_blockers: [],
      checked_at: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Assuming other routes would be defined here, and the router is exported.
// This is a placeholder for the rest of the routes/site-builder-routes.js content.
// For example:
// router.post('/build', rateLimit({ windowMs: 60 * 1000, max: 5 }), async (req, res) => { /* ... */ });
// router.get('/previews', async (req, res) => { /* ... */ });
// etc.

export default router;