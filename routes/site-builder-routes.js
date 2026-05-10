import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_API_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';
import { rk } from '../mw/auth.js'; // Assuming rk is from this path
import { pool } from '../db/pool.js'; // ASSUMPTION: pool is available here for DB access
const router = Router();
// Inlined discovery logic from scripts/site-builder-prospect-discovery.mjs
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];
/*
- Adapted searchGooglePlaces function for API context.
- @param {string} city - The city to search in.
- @param {string} type - The type of business (niche).
- @param {string|undefined} apiKey - Google Places apiKey.
- @param {number} count - Maximum number of results to return.
- @returns {Promise<{results: object[], source: string, error: string|null}>}
*/
async function searchGooglePlacesForApi(city, type, apiKey, count) {
  if (!apiKey) {
    return { results: [], source: 'manual_guidance', error: 'GOOGLE_PLACES_KEY not set. Manual research guidance needed.' };
  }
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10-second timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.status === 'REQUEST_DENIED') {
      return { results: [], source: 'google_places_error', error: `Google Places apiKey rejected: ${json.error_message || 'Unknown error'}` };
    }
    if (!json.results?.length) {
      return { results: [], source: 'google_places', error: `No results found for "${type}" in "${city}".` };
    }
    const prospects = json.results.slice(0, count).map(place => ({
      name: place.name,
      website: place.website || null,
      address: place.formatted_address || null,
      rating: place.rating || null,
      city,
      type,
      source: 'google_places',
    }));
    return { results: prospects, source: 'google_places', error: null };
  } catch (err) {
    clearTimeout(timer);
    return { results: [], source: 'google_places_error', error: `Google Places fetch error: ${err.message}` };
  }
}
/*
- @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
- apiEP for one-click prospect discovery.
- Accepts city, niche, and count, then uses Google Places API (if key is set)
- to find businesses.
-
- @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
*/
router.post('/discover', rk, rateLimit({ windowMs: 60 * 1000, max: 5 }), async (req, res) => {
  const { city, niche, count } = req.body; // niche maps to type in the script
  if (niche && !SUPPORTED_TYPES.includes(niche)) {
    return res.status(400).json({ ok: false, error: `Unsupported niche: "${niche}". Supported: ${SUPPORTED_TYPES.join(', ')}` });
  }
  const discoveryCount = Math.min(20, Math.max(1, parseInt(count, 10) || 10));
  const googlePlacesApiKey = process.env.GOOGLE_PLACES_KEY;
  const { results, source, error } = await searchGooglePlacesForApi(
    city || 'San Diego, CA', // Default city from script
    niche || 'wellness', // Default type from script
    googlePlacesApiKey,
    discoveryCount
  );
  if (error && source === 'google_places_error') {
    return res.status(500).json({ ok: false, error: error, receipt: { source } });
  }
  return res.json({ ok: true, count: results.length, prospects: results, receipt: { source, error } });
});

/*
- @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
- API for Site Builder Command Center to check launch readiness.
- Returns whether revenue-blocking env vars are present and lists the missing names.
*/
router.get('/launch-readiness', rk, async (req, res) => {
  const healthReport = getRegistryHealth();

  const siteBuilderVars = healthReport.vars.filter(
    (v) => v.category === 'sitebuilder'
  );

  const missingNeededSiteBuilder = siteBuilderVars
    .filter((v) => v.registryStatus === 'NEEDED' && !v.present)
    .map((v) => v.name);

  const revenueBlockersSiteBuilder = siteBuilderVars
    .filter((v) => v.revenueBlocking && !v.present)
    .map((v) => v.name);

  // The 'ready' status is true if there are no missing needed or revenue blocking vars specific to sitebuilder
  const ready = missingNeededSiteBuilder.length === 0 && revenueBlockersSiteBuilder.length === 0;

  return res.json({
    ok: true,
    ready: ready,
    missing_needed: missingNeededSiteBuilder,
    revenue_blockers: revenueBlockersSiteBuilder,
    checked_at: new Date().toISOString(),
  });
});

export default router;