/**
 * SYNOPSIS: Service module — CreatorOverdubEditor.
 */
import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

function applyTranscriptEdits(transcript, edits, consent) {
  if (!consent) {
    throw new Error('Consent is required for replacement.');
  }

  const editedTranscript = transcript.split(' ').map((word, index) => {
    const edit = edits.find(e => e.index === index);
    if (edit) {
      if (edit.action === 'delete') {
        return '';
      } else if (edit.action === 'replace') {
        return regenerateSpan(edit.replacement);
      }
    }
    return word;
  }).join(' ');

  return editedTranscript;
}

async function regenerateSpan(text) {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ELEVENLABS_API_KEY}`
    },
    body: JSON.stringify({
      text: text
    })
  });

  if (!response.ok) {
    throw new Error('Failed to regenerate span.');
  }

  const data = await response.json();
  return data.audio_url;
}

export { applyTranscriptEdits };