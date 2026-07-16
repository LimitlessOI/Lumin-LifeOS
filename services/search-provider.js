/**
 * SYNOPSIS: Configuration for the search API provider
 * @ssot docs/products/knowledge-base/PRODUCT_HOME.md
 */
import axios from 'axios';

// Configuration for the search API provider
let SEARCH_API_URL;
let API_KEY;

export function configureSearchProvider(config) {
  SEARCH_API_URL = config.url;
  API_KEY = config.apiKey;
}

// Function to initialize the search provider
export function initializeSearchProvider(config) {
  const { url, apiKey } = config;
  console.log('Search provider initialized with API URL:', url);
  return { url, apiKey };
}

// Function to perform a search query
export async function searchQuery(query) {
  try {
    const response = await axios.get(SEARCH_API_URL, {
      params: { q: query },
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error during search query:', error);
    throw error;
  }
}

// Function to get the default search provider configuration
export function getDefaultSearchProvider() {
  return {
    url: SEARCH_API_URL,
    apiKey: API_KEY
  };
}

// Exported function to get search results
export async function getSearchResults(query) {
  try {
    // Confirming search provider is configured
    if (!SEARCH_API_URL || !API_KEY) {
      throw new Error('Search provider not configured.');
    }
    const results = await searchQuery(query);
    return results;
  } catch (error) {
    console.error('Error in getSearchResults:', error);
    throw error;
  }
}
