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