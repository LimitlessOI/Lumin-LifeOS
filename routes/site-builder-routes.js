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
- @param {string|undefined} type - The type of business (niche).
- @param {string|undefined} apiKey - Google Places apiKey.
- @param {number} count - Maximum number of results to return.
- @returns {Promise<{results: object[], source: string, error: string|null}>}
*/
async function searchGooglePlacesForApi(city, type, apiKey, count) {
  if (!apiKey) {
    return { results: [], source: 'manual_guidance', error: 'GOOGLE_PLACES_KEY not set. Manual research guidance needed.' };
  }
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `