/**
 * SYNOPSIS: Voice Rail — server-side STT (OpenAI Whisper, with a Groq Whisper
 * fallback when OpenAI is unavailable/out of credit) with LifeOS vocabulary bias.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  applyVoiceRailVocabulary,
  buildWhisperPrompt,
  listVoiceRailSttVocabularyPublic,
} from '../config/voice-rail-stt-vocabulary.js';

const WHISPER_MODEL = process.env.VOICE_RAIL_STT_MODEL?.trim() || 'whisper-1';
const GROQ_WHISPER_MODEL = process.env.VOICE_RAIL_STT_GROQ_MODEL?.trim() || 'whisper-large-v3-turbo';
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

function buildMultipartBody(audioBuffer, mimeType, filename, prompt, model = WHISPER_MODEL) {
  const boundary = `----VRStt${Date.now().toString(16)}`;
  const nl = '\r\n';

  const header =
    `--${boundary}${nl}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${nl}` +
    `Content-Type: ${mimeType || 'audio/webm'}${nl}${nl}`;

  let middle =
    `${nl}--${boundary}${nl}` +
    `Content-Disposition: form-data; name="model"${nl}${nl}${model}${nl}` +
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
  const groq = Boolean(process.env.GROQ_API_KEY?.trim());
  const engine = openai ? 'openai-whisper' : groq ? 'groq-whisper' : null;
  return {
    available: openai || groq,
    engine,
    model: openai ? WHISPER_MODEL : groq ? GROQ_WHISPER_MODEL : null,
    fallback_engine: openai && groq ? 'groq-whisper' : null,
    vocabulary: listVoiceRailSttVocabularyPublic(),
  };
}

async function callWhisperEndpoint(endpoint, apiKey, audioBuffer, mimeType, filename, prompt, model) {
  const { body, boundary } = buildMultipartBody(audioBuffer, mimeType, filename, prompt, model);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, status: response.status, detail: errText.slice(0, 300) };
  }
  const data = await response.json();
  return { ok: true, text: String(data?.text || '').trim() };
}

/**
 * Transcribe an audio buffer via OpenAI Whisper, falling back to Groq's hosted
 * Whisper when OpenAI is missing/unavailable/out of credit — GAP-FILL 2026-08-06:
 * previously this hard-failed (whisper_http_429) with no fallback whenever OpenAI
 * credit ran out, even though a funded, working Groq key was already present
 * (confirmed live via /api/v1/lifeos/provider-key-health at the time of the fix:
 * OpenAI status "needs_payment", Groq status "working"). voiceRailSttStatus()
 * also previously reported `available: true` purely from OpenAI key *presence*,
 * which was misleading once the key stopped actually working.
 * @param {Buffer} audioBuffer
 * @param {string} [mimeType]
 * @param {{ context?: string, filename?: string, userId?: number|string, pool?: object }} [opts]
 */
export async function transcribeVoiceRailAudio(audioBuffer, mimeType = 'audio/webm', opts = {}) {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!openaiKey && !groqKey) {
    return { ok: false, error: 'no_stt_provider_key', text: '' };
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

  let engineUsed = null;
  let result = null;
  let openaiFailure = null;

  if (openaiKey) {
    const r = await callWhisperEndpoint(
      'https://api.openai.com/v1/audio/transcriptions',
      openaiKey, audioBuffer, mimeType, filename, prompt, WHISPER_MODEL,
    );
    if (r.ok) {
      engineUsed = 'openai-whisper';
      result = r;
    } else {
      openaiFailure = { error: `whisper_http_${r.status}`, detail: r.detail };
    }
  }

  if (!result && groqKey) {
    // Groq's audio/transcriptions endpoint is OpenAI-compatible.
    const r = await callWhisperEndpoint(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      groqKey, audioBuffer, mimeType, filename, prompt, GROQ_WHISPER_MODEL,
    );
    if (r.ok) {
      engineUsed = 'groq-whisper';
      result = r;
    } else if (!openaiFailure) {
      return { ok: false, error: `whisper_http_${r.status}`, detail: r.detail, text: '' };
    }
  }

  if (!result) {
    // OpenAI failed and there was no Groq key (or Groq also failed above and returned already).
    return { ok: false, ...openaiFailure, text: '' };
  }

  const raw = result.text;
  const text = applyVoiceRailVocabulary(raw, userCorrections);
  return {
    ok: true,
    text,
    raw_text: raw !== text ? raw : undefined,
    corrections_used: userCorrections.length,
    engine: engineUsed,
    fallback_used: engineUsed === 'groq-whisper' && Boolean(openaiFailure),
  };
}