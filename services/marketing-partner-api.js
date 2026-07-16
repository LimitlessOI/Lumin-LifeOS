/**
 * SYNOPSIS: services/marketing-partner-api.js
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
// services/marketing-partner-api.js

// Function to get quote from partners
export async function getPartnerQuote(partner, details) {
  let response;

  if (partner === 'Sticker Mule') {
    response = await getStickerMuleQuote(details);
  } else if (partner === 'VistaPrint') {
    response = await getVistaPrintQuote(details);
  } else {
    throw new Error('Unsupported partner');
  }

  return response;
}

// Function to call Sticker Mule API
async function getStickerMuleQuote(details) {
  // Placeholder logic for Sticker Mule API call
  // Example: use fetch or axios to make the API call
  // const response = await fetch('https://api.stickermule.com/quote', { method: 'POST', body: JSON.stringify(details) });
  // return await response.json();
  return { quote: "Sticker Mule quote details" };
}

// Function to call VistaPrint API
async function getVistaPrintQuote(details) {
  // Placeholder logic for VistaPrint API call
  // Example: use fetch or axios to make the API call
  // const response = await fetch('https://api.vistaprint.com/quote', { method: 'POST', body: JSON.stringify(details) });
  // return await response.json();
  return { quote: "VistaPrint quote details" };
}

// New function to export
export async function getQuote(partner, details) {
  return await getPartnerQuote(partner, details);
}
