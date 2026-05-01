#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * CLI script to discover wellness businesses for cold outreach.
 * Usage: node scripts/site-builder-prospect-discovery.mjs --city='Portland, OR' --type=yoga --count=10
 *
 * If GOOGLE_PLACES_KEY is set: queries Google Places Text Search API for real businesses.
 * If not set: prints manual research guidance to stderr + empty JSON array to stdout.
 *
 * Output: JSON array on stdout — pipe to jq or into the site-builder pipeline.
 */

import 'dotenv/config';

const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

function parseArgs(argv) {
  const args = { city: 'San Diego, CA', type: 'wellness', count: 10 };
  for (const arg of argv.slice(2)) {
    const m = arg.match(/^--(\w[\w-]*)=(.+)$/);
    if (m) args[m[1]] = m[2];
  }
  args.count = Math.min(20, Math.max(1, parseInt(args.count, 10) || 10));
  return args;
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

  if (!SUPPORTED_TYPES.includes(type)) {
    console.error(`Unsupported type: "${type}". Supported: ${SUPPORTED_TYPES.join(', ')}`);
    process.exit(1);
  }

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
