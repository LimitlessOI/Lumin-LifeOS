/**
 * SYNOPSIS: Exports translateText — services/creatorDubbing.js.
 */
import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function translateText(text, targetLanguage) {
  const response = await fetch(`https://api.elevenlabs.io/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ELEVENLABS_API_KEY}`
    },
    body: JSON.stringify({ text, targetLanguage })
  });

  if (!response.ok) {
    throw new Error('Translation API error');
  }

  const data = await response.json();
  return data.translatedText;
}

export async function generateDubbedAudio(text, voiceId, language) {
  const response = await fetch(`https://api.elevenlabs.io/dub`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ELEVENLABS_API_KEY}`
    },
    body: JSON.stringify({ text, voiceId, language })
  });

  if (!response.ok) {
    throw new Error('Dubbing API error');
  }

  const data = await response.json();
  return data.audioUrl;
}

export async function dubToLanguages(originalText, voiceId, targetLanguages) {
  const dubbedAudios = {};

  for (const language of targetLanguages) {
    const translatedText = await translateText(originalText, language);
    const audioUrl = await generateDubbedAudio(translatedText, voiceId, language);
    dubbedAudios[language] = audioUrl;
  }

  return dubbedAudios;
}
