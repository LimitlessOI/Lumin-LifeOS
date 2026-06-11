/**
 * Voice Rail — server-side TTS (ElevenLabs primary, OpenAI tts-1-hd fallback).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const MAX_CHARS = 2000;

function cleanForSpeech(text) {
  return String(text || '')
    .replace(/\bintent:\s*\S+/gi, '')
    .replace(/\bvia lifeos\/\S+.*$/gim, '')
    .replace(/\bcouncil:\s*\S+/gi, '')
    .replace(/\bmodel:\s*\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS);
}

export function voiceRailTtsStatus() {
  const eleven = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    available: eleven || openai,
    primary: eleven ? 'elevenlabs' : openai ? 'openai' : null,
    engines: {
      elevenlabs: eleven,
      openai: openai,
    },
    voice_id: process.env.ELEVENLABS_VOICE_ID || null,
    openai_voice: process.env.VOICE_RAIL_OPENAI_TTS_VOICE || 'nova',
    openai_model: process.env.VOICE_RAIL_OPENAI_TTS_MODEL || 'tts-1-hd',
  };
}

async function synthesizeElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM';
  const modelId = process.env.VOICE_RAIL_ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.78,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`elevenlabs_http_${res.status}: ${errText.slice(0, 200)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: 'audio/mpeg', engine: 'elevenlabs', voice_id: voiceId };
}

async function synthesizeOpenAi(text) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const voice = process.env.VOICE_RAIL_OPENAI_TTS_VOICE || 'nova';
  const model = process.env.VOICE_RAIL_OPENAI_TTS_MODEL || 'tts-1-hd';
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`openai_tts_http_${res.status}: ${errText.slice(0, 200)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: 'audio/mpeg', engine: 'openai', voice };
}

export async function synthesizeVoiceRailSpeech(text, { logger } = {}) {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) {
    return { ok: false, error: 'empty_text' };
  }

  const status = voiceRailTtsStatus();
  if (!status.available) {
    return { ok: false, error: 'no_tts_provider', detail: 'Set ELEVENLABS_API_KEY or OPENAI_API_KEY on Railway.' };
  }

  const order =
    status.primary === 'elevenlabs'
      ? [synthesizeElevenLabs, synthesizeOpenAi]
      : [synthesizeOpenAi, synthesizeElevenLabs];

  let lastErr = null;
  for (const fn of order) {
    try {
      const out = await fn(cleaned);
      if (out?.buffer?.length) {
        return { ok: true, ...out, char_count: cleaned.length };
      }
    } catch (err) {
      lastErr = err;
      logger?.warn?.({ err: err.message, fn: fn.name }, 'voice-rail tts engine failed');
    }
  }

  return {
    ok: false,
    error: 'tts_failed',
    detail: lastErr?.message || 'all engines failed',
  };
}
