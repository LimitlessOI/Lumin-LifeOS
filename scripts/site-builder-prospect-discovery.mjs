#!/usr/bin/env node
/**
 * SYNOPSIS: CLI script to discover strong, high-spend businesses with weak websites for cold outreach.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * CLI script to discover any local business with strong revenue signals for cold outreach.
 * Usage: node scripts/site-builder-prospect-discovery.mjs --city='Portland, OR' --type=dentist --count=10
 *
 * If GOOGLE_PLACES_KEY is set: queries Google Places Text Search API for real businesses.
 * If not set: prints manual research guidance to stderr + empty JSON array to stdout.
 *
 * Output: JSON array on stdout — pipe to jq or into the site-builder pipeline.
 */

import 'dotenv/config';

const LEAD_VALUE_BY_TYPE = {
  dentist: 2500, orthodontist: 2500, 'dental clinic': 2500,
  'plastic surgeon': 2500, 'med spa': 2500,
  therapist: 1800, psychiatrist: 1800, counselor: 1200, counselling: 1200,
  doctor: 2000, physician: 2000, 'medical clinic': 2000,
  attorney: 2400, lawyer: 2400, 'law firm': 2400,
  cpa: 1800, accountant: 1800, 'financial advisor': 1800, advisor: 1800,
  insurance: 1600, 'mortgage broker': 1800, 'real estate': 1600,
  hvac: 1500, 'air conditioning': 1500, plumbing: 1500, roofer: 1500, roofing: 1500,
  'pool builder': 1800, 'pool service': 1500, landscaping: 1200,
  'home security': 1600, 'auto repair': 1200,
  default: 1200,
};

function leadValueFor(type) {
  const normalized = String(type || '').toLowerCase().trim();
  if (LEAD_VALUE_BY_TYPE[normalized]) return LEAD_VALUE_BY_TYPE[normalized];
  for (const [key, value] of Object.entries(LEAD_VALUE_BY_TYPE)) {
    if (normalized.includes(key)) return value;
  }
  return LEAD_VALUE_BY_TYPE.default;
}

function parseArgs(argv) {
  const args = { city: 'San Diego, CA', type: 'dentist', count: 10 };
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (m) args[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  args.count = Math.min(50, Math.max(1, parseInt(args.count, 10) || 10));
  return args;
}

function scorePlace(place) {
  const rating = Number(place.rating) || 0;
  const reviewCount = Number(place.user_ratings_total) || 0;
  const hasHours = place.opening_hours && place.opening_hours.weekday_text && place.opening_hours.weekday_text.length > 0;
  const score = Math.round((rating * 10) + Math.min(reviewCount / 100, 50) + (hasHours ? 5 : 0));
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
  return { score, grade, reviewCount, rating };
}

async function searchGooglePlaces(city, type, apiKey, count) {
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.status === 'REQUEST_DENIED') {
      console.error('Google Places API key rejected:', json.error_message);
      return [];
    }
    if (!json.results?.length) {
      console.error(`No results found for "${type}" in "${city}".`);
      return [];
    }
    return json.results.slice(0, count).map(place => {
      const { score, grade, reviewCount, rating } = scorePlace(place);
      const leadValue = leadValueFor(type);
      return {
        name: place.name,
        website: place.website || null,
        address: place.formatted_address || null,
        rating: rating || null,
        user_ratings_total: reviewCount || null,
        city,
        type,
        vertical: type,
        source: 'google_places',
        score,
        grade,
        leadValue,
      };
    });
  } catch (err) {
    clearTimeout(timer);
    console.error('Google Places fetch error:', err.message);
    return [];
  }
}

function printResearchGuidance(city, type) {
  const encodedType = encodeURIComponent(type);
  const encodedCity = encodeURIComponent(city);
  console.error(`No GOOGLE_PLACES_KEY set. Research guidance for "${type}" in "${city}":`);
  console.error(`  Google Maps:  https://www.google.com/maps/search/${encodedType}+${encodedCity}`);
  console.error(`  Yelp:         https://www.yelp.com/search?find_desc=${encodedType}&find_loc=${encodedCity}`);
  console.error(`  Google:       "${type} near ${city}" — find sites without online booking`);
  console.error(`  Set GOOGLE_PLACES_KEY in .env to enable automatic discovery.`);
}

async function main() {
  const { city, type, count } = parseArgs(process.argv);

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  let results = [];

  if (apiKey) {
    console.error(`Searching Google Places: ${count} "${type}" businesses in "${city}"...`);
    results = await searchGooglePlaces(city, type, apiKey, count);
    console.error(`Found ${results.length} result(s).`);
  } else {
    printResearchGuidance(city, type);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
