/**
 * SYNOPSIS: Import necessary modules or dependencies
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
// Import necessary modules or dependencies
import fetch from 'node-fetch'; // Example for making HTTP requests

// Function to fetch quotes from partners
export async function fetchPartnerQuote(partner, parameters) {
  let apiUrl;
  switch (partner) {
    case 'StickerMule':
      apiUrl = `https://api.stickermule.com/quotes?${new URLSearchParams(parameters)}`;
      break;
    case 'VistaPrint':
      apiUrl = `https://api.vistaprint.com/quotes?${new URLSearchParams(parameters)}`;
      break;
    default:
      throw new Error('Unsupported partner');
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error fetching quote: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Ensure no duplicate exports
