/**
 * Voice Rail — server-side STT (OpenAI Whisper) with LifeOS vocabulary bias.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import {
  applyVoiceRailVocabulary,
  buildWhisperPrompt,
  listVoiceRailSttVocabularyPublic,
} from '../config/voice-rail-stt-vocabulary.js';

const WHISPER_MODEL = process.env.VOICE_RAIL_STT_MODEL?.trim() || 'whisper-1';
const MIN_BYTES = 400;

function extensionForMime(mimeType) {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  return 'webm';
}

function buildMultipartBody(audioBuffer, mimeType, filename, prompt) {
  const boundary = `----VRStt${Date.now().toString(16)}`;
  const nl = '\r\n';

  const header =
    `--${boundary}${nl}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${nl}` +
    `Content-Type: ${mimeType || 'audio/webm'}${nl}${nl}`;

  let middle =
    `${nl}--${boundary}${nl}` +
    `Content-Disposition: form-data; name="model"${nl}${nl}${WHISPER_MODEL}${nl}` +
    `${nl}--${boundary}${nl}` +
    `Content-Disposition: form-data; name="language"${nl}${nl}en${nl}`;

  if (prompt) {
    middle +=
      `${nl}--${boundary}${nl}` +
      `Content-Disposition: form-data; name="prompt"${nl}${nl}${prompt.slice(0, 800)}${nl}`;
  }

  const footer = `--${boundary}--${nl}`;

  return {
    body: Buffer.concat([
      Buffer.from(header),
      audioBuffer,
      Buffer.from(middle + footer),
    ]),
    boundary,
  };
}

export function voiceRailSttStatus() {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    available: openai,
    engine: openai ? 'openai-whisper' : null,
    model: openai ? WHISPER_MODEL : null,
    vocabulary: listVoiceRailSttVocabularyPublic(),
  };
}

/**
 * Transcribe an audio buffer via OpenAI Whisper.
 * @param {Buffer} audioBuffer
 * @param {string} [mimeType]
 * @param {{ context?: string, filename?: string }} [opts]
 */
export async function transcribeVoiceRailAudio(audioBuffer, mimeType = 'audio/webm', opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'openai_key_missing', text: '' };
  }
  if (!audioBuffer || audioBuffer.length < MIN_BYTES) {
    return { ok: true, text: '', skipped: 'too_short' };
  }

  const ext = extensionForMime(mimeType);
  const filename = opts.filename || `voice-rail.${ext}`;
  const prompt = buildWhisperPrompt(opts.context || '');
  const { body, boundary } = buildMultipartBody(audioBuffer, mimeType, filename, prompt);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return {
      ok: false,
      error: `whisper_http_${response.status}`,
      detail: errText.slice(0, 300),
      text: '',
    };
  }

  const data = await response.json();
  const raw = String(data?.text || '').trim();
  const text = applyVoiceRailVocabulary(raw);
  return { ok: true, text, raw_text: raw !== text ? raw : undefined };
}
