import { console } from 'console';
import fetch from 'node-fetch';

const usage = `
Usage: node scripts/site-builder-prospect-discovery.mjs --city='Portland, OR' --type=yoga --count=10
`;

const supportedTypes = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy'];

async function getGooglePlacesResults(city, type, apiKey) {
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${type}+in+${city}&key=${apiKey}`);
    const data = await response.json();
    if (data.results.length === 0) {
      console.error(`No results found for ${type} in ${city}.`);
      return [];
    }
    return data.results.map(result => ({
      name: result.name,
      website: result.website,
      rating: result.rating,
      formatted_address: result.formatted_address,
    }));
  } catch (error) {
    console.error(`Error fetching Google Places results: ${error}`);
    return [];
  }
}

async function generateResearchPrompt(city, type) {
  console.log(`No GOOGLE_PLACES_KEY set. To find ${type} businesses in ${city}, try: Google Maps search: "${type} near ${city}", Yelp: yelp.com/search?find_desc=${type}&find_loc=${city}, etc.`);
  return [];
}

async function main() {
  const city = process.env.CITY || 'San Diego, CA';
  const type = process.argv[2] || 'wellness';
  const count = parseInt(process.argv[3]) || 10;
  const apiKey = process.env.GOOGLE_PLACES_KEY;

  if (!supportedTypes.includes(type)) {
    console.error(`Unsupported business type: ${type}`);
    process.exit(1);
  }

  if (apiKey) {
    const results = await getGooglePlacesResults(city, type, apiKey);
    console.log(results);
  } else {
    const results = await generateResearchPrompt(city, type);
    console.log(results);
  }

  const summary = `Found ${results.length} ${type} businesses in ${city}`;
  console.error(summary);
}

main();