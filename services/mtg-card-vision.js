/**
 * SYNOPSIS: Identifies a Magic: The Gathering card (name, set, foil, condition
 * guess) from a photo using vision-capable AI. Same working OpenAI call shape
 * as services/voice-rail-attachments.js's describeVoiceRailImages; not the AI
 * Council (config/council-members.js has no vision-capable member -- confirmed
 * by reading it, not assumed). Real live batch test 2026-08-10 found
 * production's OpenAI account had zero credits ("You have no credits
 * remaining") -- a real billing block, not a code bug, but SO-003
 * (CLAUDE.md: "never idle on tokens... auto-failover, never idle") says a
 * single exhausted provider must not stall the whole pipeline. Added an
 * Anthropic fallback first; that was ALSO out of credits on the same live
 * test. Founder pushed back directly ("we have free tokens... our system is
 * not without AI") -- checked the real, already-built
 * /api/v1/lifeos/provider-key-health endpoint (not assumed) and found Gemini,
 * Groq, Mistral, DeepSeek, and Replicate all genuinely `working` on
 * production right now. Gemini is natively multimodal (same real request
 * shape already proven live in services/provider-key-health.js's own probe)
 * and is the real third fallback added here.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const IDENTIFY_PROMPT = `You are identifying a single Magic: The Gathering trading card from a photo for a reseller cataloging a large collection.
Respond with ONLY a JSON object, no other text, in this exact shape:
{"name": "<exact card name as printed>", "set": "<set name or code if visible/inferable, else null>", "foil": <true|false|null>, "condition_guess": "<near mint|lightly played|moderately played|heavily played|damaged|unknown>", "confidence": "<high|medium|low>"}
If the image does not clearly show a single Magic card, respond with {"name": null, "set": null, "foil": null, "condition_guess": null, "confidence": "low"}.`;

const EMPTY_RESULT = { name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };

function parseModelJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function toResult(parsed) {
  return {
    ok: true,
    name: parsed.name || null,
    set: parsed.set || null,
    foil: typeof parsed.foil === 'boolean' ? parsed.foil : null,
    condition_guess: parsed.condition_guess || 'unknown',
    confidence: parsed.confidence || 'low',
  };
}

async function identifyViaOpenAI(photo) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'openai_not_configured', ...EMPTY_RESULT };
  const model = process.env.MTG_VISION_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IDENTIFY_PROMPT },
            { type: 'image_url', image_url: { url: `data:${photo.mime};base64,${photo.data}` } },
          ],
        },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `openai_vision_${res.status}`, ...EMPTY_RESULT };
  }
  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  const parsed = parseModelJson(text);
  if (!parsed) return { ok: false, error: 'unparseable_model_output', ...EMPTY_RESULT };
  return toResult(parsed);
}

async function identifyViaAnthropic(photo) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'anthropic_not_configured', ...EMPTY_RESULT };
  const model = process.env.MTG_VISION_MODEL_ANTHROPIC || 'claude-3-5-sonnet-latest';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: photo.mime, data: photo.data } },
            { type: 'text', text: IDENTIFY_PROMPT },
          ],
        },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `anthropic_vision_${res.status}`, ...EMPTY_RESULT };
  }
  const text = String(json?.content?.[0]?.text || '').trim();
  const parsed = parseModelJson(text);
  if (!parsed) return { ok: false, error: 'unparseable_model_output', ...EMPTY_RESULT };
  return toResult(parsed);
}

async function identifyViaGemini(photo) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (!apiKey) return { ok: false, error: 'gemini_not_configured', ...EMPTY_RESULT };
  const model = process.env.MTG_VISION_MODEL_GEMINI || 'gemini-2.5-flash';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: IDENTIFY_PROMPT },
              { inline_data: { mime_type: photo.mime, data: photo.data } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 300 },
      }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `gemini_vision_${res.status}`, ...EMPTY_RESULT };
  }
  const text = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  const parsed = parseModelJson(text);
  if (!parsed) {
    // Real debugging need, not decoration: an empty/unparseable response
    // could be a genuinely different reason each time (safety block, hit
    // maxOutputTokens before finishing the JSON, markdown-fenced text a
    // stricter regex would miss) -- surfacing WHICH one actually happened
    // beats a bare "unparseable_model_output" that hides the real cause.
    const finishReason = json?.candidates?.[0]?.finishReason || 'unknown';
    const snippet = text ? text.slice(0, 200) : '(empty response text)';
    return { ok: false, error: `unparseable_model_output finish=${finishReason} text=${snippet}`, ...EMPTY_RESULT };
  }
  return toResult(parsed);
}

/**
 * @param {{ name: string, mime: string, data: string }} photo base64 image, no data: prefix
 * @returns {Promise<{ ok: boolean, name: string|null, set: string|null, foil: boolean|null, condition_guess: string|null, confidence: string, error?: string }>}
 */
export async function identifyMtgCardFromPhoto(photo, { logger } = {}) {
  try {
    const primary = await identifyViaOpenAI(photo);
    if (primary.ok) return primary;
    logger?.warn?.({ err: primary.error, name: photo.name }, 'mtg card vision: openai failed, trying anthropic fallback (SO-003)');

    const anthropic = await identifyViaAnthropic(photo);
    if (anthropic.ok) return anthropic;
    logger?.warn?.({ err: anthropic.error, name: photo.name }, 'mtg card vision: anthropic failed, trying gemini fallback (SO-003)');

    const gemini = await identifyViaGemini(photo);
    if (gemini.ok) return gemini;

    return {
      ok: false,
      error: `openai:${primary.error} | anthropic:${anthropic.error} | gemini:${gemini.error}`,
      ...EMPTY_RESULT,
    };
  } catch (err) {
    logger?.warn?.({ err: err.message, name: photo.name }, 'mtg card vision identify failed');
    return { ok: false, error: err.message, ...EMPTY_RESULT };
  }
}
