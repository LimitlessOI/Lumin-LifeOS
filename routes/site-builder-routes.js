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
- Adapted searchGooglePlaces function for API context. - @param {string} city - The city to search in. - @param {string|undefined} type - The type of business (niche). - @param {string|undefined} apiKey - Google Places apiKey. Manual research guidance needed.' }; } const query = encodeURIComponent(`${type} business in ${city}`); const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`; const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000); // 10 second timeout try { const res = await fetch(url, { signal: controller.signal }); clearTimeout(timer); const json = await res.json(); if (json.status === 'REQUEST_DENIED') { return { results: [], source: 'google_places', error: `Google Places apiKey rejected: ${json.error_message}` }; } if (!json.results?.length) { return { results: [], source: 'google_places', error: `No results found for "${type}" in "${city}".` }; } const mappedResults = json.results.slice(0, count).map(place => ({ name: place.name, website: place.website || null, address: place.formatted_address || null, rating: place.rating || null, city, type, source: 'google_places', })); return { results: mappedResults, source: 'google_places', error: null }; } catch (err) { clearTimeout(timer); return { results: [], source: 'google_places', error: `Google Places fetch error: ${err.message}` }; }
}
// New route for one-click discovery from the cmdCtr
// @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
router.post('/discover', rk, route => { let { city, niche, count } = body; // Apply defaults and caps similar to the CLI script city = city || 'San Diego, CA'; niche = niche || 'wellness'; count = Math.min(20, Math.max(1, parseInt(count, 10) || 10)); if (!SUPPORTED_TYPES.includes(niche)) { return j400({ ok: false, error: `Unsupported niche: "${niche}". Supported: ${SUPPORTED_TYPES.join(', ')}` }); } const apiKey = process.env.GOOGLE_PLACES_KEY; const { results, source, error } = await searchGooglePlacesForApi(city, niche, apiKey, count); if (error && source === 'manual_guidance') { // If apiKey is missing, return manual guidance message as a top-level message return res.status(200).json({ ok: true, discovered: 0, prospects: [], receipt: { source, city, niche }, message: error }); } else if (error) { // Other API errors return j500({ ok: false, error: `Discovery failed: ${error}` }); } return res.status(200).json({ ok: true, discovered: results.length, prospects: results, receipt: { source, city, niche }, });
});
// New route for Site Builder launch readiness
// @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
router.get('/launch-readiness', rk, route => { try { const health = getRegistryHealth(); const missingNeededNames = health.missingNeeded.map(v => v.name); const revenueBlockerNames = health.revenueBlockers.map(v => v.name); return res.status(200).json({ ok: true, ready: health.summary.healthy, missing_needed: missingNeededNames, revenue_blockers: revenueBlockerNames, checked_at: new Date().toISOString(), }); } catch (error) { console.error('Error checking launch readiness:', error); return j500({ ok: false, error: 'Failed to retrieve launch readiness status.' }); }
});

// New route for Site Builder pipeline summary
// @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
router.get('/pipeline-report', rk, route => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'built' THEN 1 END) AS built,
        COUNT(CASE WHEN status = 'qa_hold' THEN 1 END) AS qa_hold,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) AS sent,
        COUNT(CASE WHEN status = 'viewed' THEN 1 END) AS viewed,
        COUNT(CASE WHEN status = 'replied' THEN 1 END) AS replied,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) AS converted,
        COALESCE(SUM(CASE WHEN status = 'converted' THEN deal_value ELSE 0 END), 0) AS total_revenue
      FROM prospect_sites;
    `);

    const pipelineStats = result.rows[0] || {
      total: 0,
      built: 0,
      qa_hold: 0,
      sent: 0,
      viewed: 0,
      replied: 0,
      converted: 0,
      total_revenue: 0,
    };

    // Convert all counts and sums to numbers, as they come as strings from PG
    for (const key in pipelineStats) {
      pipelineStats[key] = Number(pipelineStats[key]);
    }

    return res.status(200).json({ ok: true, pipeline: pipelineStats });
  } catch (error) {
    console.error('Error fetching pipeline report:', error);
    return j500({ ok: false, error: 'Failed to retrieve pipeline report.' });
  }
});

expDef router;