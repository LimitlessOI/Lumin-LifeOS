import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'; // Ensure env vars are loaded for GOOGLE_PLACES_KEY
import { getRegistryHealth } from '../services/env-registry-map.js';

const router = Router();

// Inlined discovery logic from scripts/site-builder-prospect-discovery.mjs
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

// Completed searchGooglePlaces function based on existing fragment and common patterns
async function searchGooglePlaces(city, type, apiKey, count) {
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10-second timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`Google Places API error: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Places apiKey rejected:', data.error_message);
      return [];
    }
    return data.results ? data.results.slice(0, count).map(place => ({
      name: place.name,
      website: place.website || null,
      address: place.formatted_address || null,
      rating: place.rating || null,
      city,
      type,
      source: 'google_places',
    })) : [];
  } catch (error) {
    clearTimeout(timer);
    console.error('Error searching Google Places:', error);
    return [];
  }
}

// Add the new launch-readiness apiEP
router.get('/launch-readiness', async (req, res) => {
  const checked_at = new Date().toISOString();
  try {
    const healthReport = getRegistryHealth();
    const revenueBlockers = healthReport.revenueBlockers.map(r => r.name);
    const missingNeeded = healthReport.missingNeeded.map(r => r.name);
    const ready = healthReport.summary.healthy;

    res.json({
      ok: true,
      ready,
      missing_needed: missingNeeded,
      revenue_blockers: revenueBlockers,
      checked_at,
    });
  } catch (error) {
    console.error('Error checking launch readiness:', error);
    res.status(500).json({
      ok: false,
      ready: false,
      missing_needed: ['internal_error'],
      revenue_blockers: ['internal_error'],
      checked_at,
      error: error.message,
    });
  }
});

// The CLI prints guidance to stderr, but API should return structured data.
router.post('/discover', async (req, res) => {
  const { city, niche, count } = req.body;
  const defaultCity = 'San Diego, CA';
  const defaultNiche = 'wellness';
  const defaultCount = 10;

  const actualCity = city || defaultCity;
  const actualNiche = niche || defaultNiche;
  const actualCount = Math.min(20, Math.max(1, parseInt(count, 10) || defaultCount)); // Cap count at 20

  if (!SUPPORTED_TYPES.includes(actualNiche)) {
    return res.status(400).json({
      ok: false,
      error: `Unsupported niche: "${actualNiche}". Supported: ${SUPPORTED_TYPES.join(', ')}`,
    });
  }

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  let prospects = [];
  let source = 'manual_guidance';

  if (apiKey) {
    source = 'google_places';
    try {
      prospects = await searchGooglePlaces(actualCity, actualNiche, apiKey, actualCount);
    } catch (error) {
      console.error('Error during API discovery:', error);
      return res.status(500).json({
        ok: false,
        error: 'Failed to perform discovery due to an internal error.',
        receipt: { source, city: actualCity, niche: actualNiche },
      });
    }
  } else {
    console.warn('GOOGLE_PLACES_KEY not set. Returning empty prospects and manual guidance receipt.');
    // In a real scenario, we might return guidance text, but the spec asks for a compact receipt.
  }

  res.json({
    ok: true,
    discovered: prospects.length,
    prospects,
    receipt: {
      source,
      city: actualCity,
      niche: actualNiche,
    },
  });
});

router.get('/dashboard', async (req, res) => {
  try {
    // ASSUMPTION: The PgSQL connection pool is available via req.app.locals.pool
    const pool = req.app.locals.pool;
    if (!pool) {
      console.error('Database pool not available in req.app