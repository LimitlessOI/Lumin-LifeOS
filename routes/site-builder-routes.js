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
    return data.results ? data.results.slice(0, count) : [];
  } catch (error) {
    clearTimeout(timer);
    console.error('Error searching Google Places:', error);
    return [];
  }
}

// Add the new launch-readiness API endpoint
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

export default router;