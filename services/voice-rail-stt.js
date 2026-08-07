/**
 * SYNOPSIS: Voice Rail — server-side STT (OpenAI Whisper, with a Groq Whisper
 * fallback when OpenAI is unavailable/out of credit) with LifeOS vocabulary bias,
 * plus a confidence/quality feedback loop (verbose_json signals -> low-confidence
 * flag -> optional founder correction -> word-bias learning).
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

// Standard Whisper low-confidence/hallucination heuristics (OpenAI's own
// documented guidance for using verbose_json segments to detect bad output):
// a segment is suspect if it's mostly silence (no_speech_prob), the model
// wasn't confident in its own tokens (avg_logprob), or the text is
// repetitive/garbled (compression_ratio). Any one tripping is enough to flag.
const NO_SPEECH_PROB_THRESHOLD = 0.6;
const AVG_LOGPROB_THRESHOLD = -1.0;
const COMPRESSION_RATIO_THRESHOLD = 2.4;

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

/**
 * Insert an audit receipt for one transcription (raw text + confidence
 * signals). Never throws -- a receipt-logging failure must not break the
 * transcription response it's attached to.
 */
export async function recordVoiceRailSttQualityReceipt(pool, userId, { engine, rawTranscript, quality }) {
  if (!pool || !userId || !rawTranscript) return null;
  try {
    const q = quality || {};
    const { rows } = await pool.query(
      `INSERT INTO voice_rail_stt_quality_receipts
        (user_id, engine, raw_transcript, quality_checked, low_confidence,
         avg_logprob, no_speech_prob, compression_ratio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        engine || null,
        rawTranscript,
        Boolean(q.checked),
        Boolean(q.low_confidence),
        typeof q.avg_logprob === 'number' ? q.avg_logprob : null,
        typeof q.no_speech_prob === 'number' ? q.no_speech_prob : null,
        typeof q.compression_ratio === 'number' ? q.compression_ratio : null,
      ],
    );
    return rows?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Confirm (or record as correct-as-is) a previously flagged transcription.
 * Scoped to the owning user so one account can't overwrite another's receipt.
 */
export async function confirmVoiceRailSttQualityCorrection(pool, userId, receiptId, correctedText) {
  if (!pool || !userId || !receiptId) return { ok: false, error: 'missing_pool_user_or_receipt' };
  const corrected = String(correctedText || '').trim();
  if (!corrected) return { ok: false, error: 'corrected_text_required' };
  try {
    const { rows } = await pool.query(
      `UPDATE voice_rail_stt_quality_receipts
         SET corrected_transcript = $1, correction_confirmed = TRUE, corrected_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, raw_transcript, corrected_transcript, low_confidence, created_at, corrected_at`,
      [corrected, receiptId, userId],
    );
    if (!rows?.length) return { ok: false, error: 'receipt_not_found' };
    return { ok: true, receipt: rows[0] };
  } catch (err) {
    return { ok: false, error: err?.message || 'db_error' };
  }
}

/**
 * Simple positional word diff between a raw and corrected transcript, used to
 * feed the existing voice_rail_stt_corrections learning loop. Deliberately
 * narrow: only fires when both strings have the same word count (single/few-
 * word substitutions), so it can't misfire on rephrasing or added/removed
 * words. The transcript-level correction receipt still stores the full raw
 * and corrected text regardless -- this only controls what feeds the
 * word-bias dictionary.
 */
export function diffVoiceRailWords(rawText, correctedText) {
  const rawWords = String(rawText || '').trim().split(/\s+/).filter(Boolean);
  const correctedWords = String(correctedText || '').trim().split(/\s+/).filter(Boolean);
  if (!rawWords.length || !correctedWords.length || rawWords.length !== correctedWords.length) {
    return [];
  }
  const pairs = [];
  for (let i = 0; i < rawWords.length; i++) {
    const a = rawWords[i].replace(/[.,!?;:]+$/, '');
    const b = correctedWords[i].replace(/[.,!?;:]+$/, '');
    if (a.length > 1 && b.length > 1 && a.toLowerCase() !== b.toLowerCase()) {
      pairs.push({ misheard: a, canonical: b });
    }
  }
  return pairs;
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

function buildMultipartBody(audioBuffer, mimeType, filename, prompt, model = WHISPER_MODEL, requestVerboseJson = true, includeLanguage = true) {
  const boundary = `----VRStt${Date.now().toString(16)}`;
  const nl = '\r\n';

  const header =
    `--${boundary}${nl}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${nl}` +
    `Content-Type: ${mimeType || 'audio/webm'}${nl}${nl}`;

  let middle =
    `${nl}--${boundary}${nl}` +
    `Content-Disposition: form-data; name="model"${nl}${nl}${model}${nl}`;

  if (includeLanguage) {
    middle +=
      `${nl}--${boundary}${nl}` +
      `Content-Disposition: form-data; name="language"${nl}${nl}en${nl}`;
  }

  if (requestVerboseJson) {
    middle +=
      `${nl}--${boundary}${nl}` +
      `Content-Disposition: form-data; name="response_format"${nl}${nl}verbose_json${nl}`;
  }

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

/**
 * Assess transcription quality from a verbose_json Whisper response using
 * segment-level no_speech_prob / avg_logprob / compression_ratio. Fails safe:
 * any missing/unexpected shape (older model, provider quirk, request without
 * verbose_json honored) returns { checked: false } rather than throwing --
 * quality detection must never be able to break transcription itself.
 */
function assessTranscriptionQuality(data) {
  try {
    const segments = Array.isArray(data?.segments) ? data.segments : [];
    if (!segments.length) return { checked: false };
    let maxNoSpeech = 0;
    let minLogprob = 0;
    let maxCompression = 0;
    for (const seg of segments) {
      if (typeof seg?.no_speech_prob === 'number') maxNoSpeech = Math.max(maxNoSpeech, seg.no_speech_prob);
      if (typeof seg?.avg_logprob === 'number') minLogprob = Math.min(minLogprob, seg.avg_logprob);
      if (typeof seg?.compression_ratio === 'number') maxCompression = Math.max(maxCompression, seg.compression_ratio);
    }
    const lowConfidence =
      maxNoSpeech > NO_SPEECH_PROB_THRESHOLD ||
      minLogprob < AVG_LOGPROB_THRESHOLD ||
      maxCompression > COMPRESSION_RATIO_THRESHOLD;
    return {
      checked: true,
      low_confidence: lowConfidence,
      no_speech_prob: maxNoSpeech,
      avg_logprob: minLogprob,
      compression_ratio: maxCompression,
    };
  } catch {
    return { checked: false };
  }
}

async function postWhisperRequest(endpoint, apiKey, audioBuffer, mimeType, filename, prompt, model, requestVerboseJson, includeLanguage) {
  const { body, boundary } = buildMultipartBody(audioBuffer, mimeType, filename, prompt, model, requestVerboseJson, includeLanguage);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
}

/**
 * GAP-FILL 2026-08-06: confirmed live against Groq's whisper-large-v3-turbo
 * that a provider can reject individual request fields outright even though
 * OpenAI accepts the identical shape -- first response_format=verbose_json
 * (400 "response_format must be one of [json text verbose_json]"), then,
 * once that was dropped, the previously-untested hardcoded language=en field
 * too (400 "unsupported language: en"). Both broke real voice transcription
 * in production once OpenAI ran out of credit and Groq became the only
 * working provider -- this field had shipped untested against the real
 * Groq API (the original fallback fix's own receipt said so explicitly).
 * Progressively drops whichever field the provider just rejected and
 * retries the same request, up to 3 attempts, so a single provider quirk on
 * a non-essential field can never take transcription down -- only quality
 * detection (verbose_json) is lost if that's what gets dropped; language
 * hinting is lost if that's what gets dropped; the audio itself and its
 * transcribed text are never at risk.
 */
async function callWhisperEndpoint(endpoint, apiKey, audioBuffer, mimeType, filename, prompt, model) {
  let requestVerboseJson = true;
  let includeLanguage = true;
  let lastErrText = '';
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await postWhisperRequest(
      endpoint, apiKey, audioBuffer, mimeType, filename, prompt, model, requestVerboseJson, includeLanguage,
    );

    if (response.ok) {
      const data = await response.json();
      return {
        ok: true,
        text: String(data?.text || '').trim(),
        quality: requestVerboseJson ? assessTranscriptionQuality(data) : { checked: false },
      };
    }

    lastStatus = response.status;
    lastErrText = await response.text().catch(() => '');

    if (response.status !== 400) break;

    let willRetry = false;
    if (requestVerboseJson && /response_format/i.test(lastErrText)) {
      requestVerboseJson = false;
      willRetry = true;
    }
    if (includeLanguage && /language/i.test(lastErrText)) {
      includeLanguage = false;
      willRetry = true;
    }
    if (!willRetry) break;
  }

  return { ok: false, status: lastStatus, detail: lastErrText.slice(0, 300) };
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
 *
 * GAP-FILL 2026-08-06 (2): now also requests verbose_json and returns a
 * `quality` block (checked/low_confidence/segment metrics) so callers can
 * detect likely-garbled output and ask the founder to confirm/correct it --
 * previously the system had no way to know a transcription was bad.
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

  let groqFailure = null;
  if (!result && groqKey) {
    // Groq's audio/transcriptions endpoint is OpenAI-compatible.
    const r = await callWhisperEndpoint(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      groqKey, audioBuffer, mimeType, filename, prompt, GROQ_WHISPER_MODEL,
    );
    if (r.ok) {
      engineUsed = 'groq-whisper';
      result = r;
    } else {
      groqFailure = { error: `whisper_http_${r.status}`, detail: r.detail };
    }
  }

  if (!result) {
    // GAP-FILL 2026-08-06: previously, when BOTH providers failed, this
    // returned only openaiFailure -- Groq's real failure reason was silently
    // discarded (confirmed live: masked a real Groq-side error behind a
    // stale OpenAI message during production verification of the STT
    // quality-loop feature). Report whichever attempt actually ran last
    // (Groq, if a key was present) so the true blocker is visible, and keep
    // both failures on the response for full diagnosis.
    const primary = groqFailure || openaiFailure || { error: 'no_stt_provider_key' };
    return {
      ok: false,
      ...primary,
      provider_failures: { openai: openaiFailure || undefined, groq: groqFailure || undefined },
      text: '',
    };
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
    quality: result.quality || { checked: false },
  };
}
