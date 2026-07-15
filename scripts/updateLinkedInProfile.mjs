/**
 * SYNOPSIS: Exports updateLinkedInProfile — scripts/updateLinkedInProfile.mjs.
 */
import fetch from 'node-fetch';

export async function updateLinkedInProfile(accessToken, profileData) {
  const apiUrl = 'https://api.linkedin.com/v2/me';
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'x-li-format': 'json'
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating LinkedIn profile:', error);
    throw error;
  }
}

export function createSprintOfferProfileData(sprintOffers) {
  // Assuming sprintOffers is an array of offers to be included in the profile
  const headline = `Currently involved in ${sprintOffers.length} sprint projects`;
  const summary = sprintOffers.map(offer => `Sprint: ${offer.name}, Role: ${offer.role}`).join('\n');

  return {
    headline,
    summary
  };
}
