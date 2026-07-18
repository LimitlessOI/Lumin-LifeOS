/**
 * SYNOPSIS: Service module — CreatorVoiceClone.
 */
import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function trainVoiceProfile(consentedSamples, likenessConsent) {
  if (!likenessConsent) {
    throw new Error('Likeness consent is required to train the voice profile.');
  }

  const response = await fetch('https://api.elevenlabs.ai/v1/voice-profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ELEVENLABS_API_KEY}`
    },
    body: JSON.stringify({ samples: consentedSamples })
  });

  if (!response.ok) {
    throw new Error('Failed to train voice profile');
  }

  const data = await response.json();
  return data;
}

export { trainVoiceProfile };
