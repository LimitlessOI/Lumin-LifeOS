/**
 * SYNOPSIS: Exports renderAvatarVideo — services/creatorAvatarClone.js.
 */
import fetch from 'node-fetch';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const DID_API_KEY = process.env.DID_API_KEY || '';

export async function renderAvatarVideo(script, creatorId, consent) {
  if (!consent) {
    throw new Error('Likeness consent is required to generate video.');
  }

  if (!HEYGEN_API_KEY && !DID_API_KEY) {
    throw new Error('API key for HEYGEN or DID is required.');
  }

  const apiKey = HEYGEN_API_KEY || DID_API_KEY;
  const apiUrl = HEYGEN_API_KEY ? 'https://api.heygen.com/v1/render' : 'https://api.did.com/v1/render';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      script,
      creatorId
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to render video: ${response.statusText}`);
  }

  const result = await response.json();
  return result.videoUrl;
}
