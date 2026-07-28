/**
 * SYNOPSIS: Voice Rail — server-side STT (OpenAI Whisper) with LifeOS vocabulary bias.
 * Voice Rail — server-side STT (OpenAI Whisper) with LifeOS vocabulary bias.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  applyVoiceRailVocabulary,
  buildWhisperPrompt,
  listVoiceRailSttVocabularyPublic,
} from '../config/voice-rail-stt-vocabulary.js';

const WHISPER_MODEL = process.env.VOICE_RAIL_STT_MODEL?.trim() || 'whisper-1';
const MIN_BYTES = 400;

async function loadUserCorrections(pool, userId) {
  if (!pool || !userId) return [];
  try {
    const { rows } = await pool.query(
      `SELECT misheard, canonical FROM voice_rail_stt_corrections
        WHERE user_id = $1
        ORDER BY updated_at DESC`,
      [userId],
    );
    return rows || [];
  } catch {
    return [];
  }
}

export async function listVoiceRailSttCorrections(pool, userId) {
  if (!pool || !userId) return [];
  return loadUserCorrections(pool, userId);
}

export async function addVoiceRailSttCorrection(pool, userId, misheard, canonical, source = null) {
  if (!pool || !userId) return { ok: false, error: 'missing_pool_or_user' };
  const m = String(misheard || '').trim();
  const c = String(canonical || '').trim();
  if (!m || !c) return { ok: false, error: 'misheard_and_canonical_required' };
  if (m.toLowerCase() === c.toLowerCase()) return { ok: false, error: 'same_word' };
  try {
    const { rows } = await pool.query(
      `SELECT id FROM voice_rail_stt_corrections
        WHERE user_id = $1 AND LOWER(misheard) = LOWER($2)`,
      [userId, m],
    );
    if (rows?.length) {
      await pool.query(
        `UPDATE voice_rail_stt_corrections
          SET canonical = $1, source = $2, updated_at = NOW()
          WHERE id = $3`,
        [c, source || null, rows[0].id],
      );
    } else {
      await pool.query(
        `INSERT INTO voice_rail_stt_corrections (user_id, misheard, canonical, source)
          VALUES ($1, $2, $3, $4)`,
        [userId, m, c, source || null],
      );
    }
    return { ok: true, misheard: m, canonical: c };
  } catch (err) {
    return { ok: false, error: err?.message || 'db_error' };
  }
}

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
 * @param {{ context?: string, filename?: string, userId?: number|string, pool?: object }} [opts]
 */
export async function transcribeVoiceRailAudio(audioBuffer, mimeType = 'audio/webm', opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'openai_key_missing', text: '' };
  }
  if (!audioBuffer || audioBuffer.length < MIN_BYTES) {
    return { ok: true, text: '', skipped: 'too_short' };
  }

  const userCorrections = await loadUserCorrections(opts.pool, opts.userId);
  const extraTerms = userCorrections.map((r) => r.canonical).filter(Boolean);
  const correctionHints = userCorrections.map((r) => `${r.misheard} → ${r.canonical}`).filter(Boolean);
  const ext = extensionForMime(mimeType);
  const filename = opts.filename || `voice-rail.${ext}`;
  const prompt = buildWhisperPrompt(opts.context || '', { extraTerms, correctionHints });
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
  const text = applyVoiceRailVocabulary(raw, userCorrections);
  return { ok: true, text, raw_text: raw !== text ? raw : undefined, corrections_used: userCorrections.length };
}