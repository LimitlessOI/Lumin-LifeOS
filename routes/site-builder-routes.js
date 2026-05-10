import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_API_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';
import { requireKey } from '../middleware/auth.js'; // Assuming requireKey is from this path

const router = Router();

// Inlined discovery logic from scripts/site-builder-prospect-discovery.mjs
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

// Completed searchGooglePlaces function based on existing fragment and common patterns
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
      console.error('Google Places apiKey rejected:', json.error_message);
      return [];
    }
    if (!json.results?.length) {
      console.error(`No results found for "${type}" in "${city}".`);
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
    console.error('Google Places fetch error:', err.message);
    return [];
  }
}

// Rate limiting for discovery endpoint
const discoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 discovery requests per window
  message: 'Too many discovery requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rateLimit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// New discovery endpoint
router.post('/discover', discoverLimiter, async (req, res) => {
  const { city, niche, count: rawCount } = req.body;
  if (!niche || !SUPPORTED_TYPES.includes(niche)) {
    return res.status(400).json({ ok: false, error: `Invalid or missing 'niche'. Supported types: ${SUPPORTED_TYPES.join(', ')}` });
  }
  if (!city) {
    return res.status(400).json({ ok: false, error: 'Missing \'city\' parameter.' });
  }
  const count = Math.min(20, Math.max(1, parseInt(rawCount, 10) || 10)); // Cap count between 1 and 20
  const apiKey = process.env.GOOGLE_PLACES_API_KEY; // Aligned with env-registry-map.js
  let prospects = [];
  let source = 'manual_guidance';
  if (apiKey) {
    source = 'google_places';
    prospects = await searchGooglePlaces(city, niche, apiKey, count);
  } else {
    console.warn(`GOOGLE_PLACES_API_KEY not set. Manual research guidance for "${niche}" in "${city}" would be provided via CLI.`);
  }
  return res.json({
    ok: true,
    discovered: prospects.length,
    prospects,
    receipt: {
      source,
      city: city || null,
      niche: niche || null,
    },
  });
});

// New launch-readiness endpoint
router.get('/launch-readiness', requireKey, async (req, res) => {
  const healthReport = getRegistryHealth();

  const ready = healthReport.summary.healthy;
  const missingNeededNames = healthReport.missingNeeded.map(v => v.name);
  const revenueBlockerNames = healthReport.revenueBlockers.map(v => v.name);
  const checkedAt = new Date().toISOString();

  return res.json({
    ok: true,
    ready,
    missing_needed: missingNeededNames,
    revenue_blockers: revenueBlockerNames,
    checked_at: checkedAt,
  });
});

export default router;