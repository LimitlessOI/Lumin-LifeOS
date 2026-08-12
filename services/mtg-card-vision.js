/**
 * SYNOPSIS: Identifies Magic: The Gathering card(s) (name, set, foil, condition
 * guess) from a photo using vision-capable AI. Supports one card per photo OR
 * a grid/layout of multiple cards in a single shot (founder ask 2026-08-12:
 * "can i take photos of say 10 at a time?" / "or more then 10 if i want" --
 * previously the prompt required a single card and returned null on group
 * shots). Hard cap is MAX_CARDS_PER_PHOTO; accuracy drops if faces are tiny.
 * Same OpenAI call shape as services/voice-rail-attachments.js; failover
 * OpenAI → Anthropic → Gemini → Groq per SO-003.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

export const MAX_CARDS_PER_PHOTO = 30;
const MAX_OUTPUT_TOKENS = 4000;

const IDENTIFY_PROMPT = `You are cataloging Magic: The Gathering cards from a photo for a reseller.
The photo may show ONE card or MANY cards laid out so each face is readable (often 8–15; sometimes more).
Respond with ONLY a JSON object, no other text, in this exact shape:
{"cards":[{"name":"<exact card name as printed>","set":"<set name or code if visible/inferable, else null>","foil":<true|false|null>,"condition_guess":"<near mint|lightly played|moderately played|heavily played|damaged|unknown>","confidence":"<high|medium|low>","box":{"x":0.0,"y":0.0,"w":0.0,"h":0.0}}]}
Rules:
- Include every clearly readable Magic card face in the photo, left-to-right, top-to-bottom.
- Do not invent cards you cannot read. Skip cards that are too blurry, cut off, or face-down.
- box is REQUIRED when you can see the card: normalized 0..1 fractions of the FULL image (x,y = top-left of the card, w,h = size). Used to crop listing images. If you cannot estimate a box, set box to null.
- If the image shows no readable Magic card, respond with {"cards":[]}.
- Return at most ${MAX_CARDS_PER_PHOTO} cards. If more are visible, return the clearest ${MAX_CARDS_PER_PHOTO}.`;

const EMPTY_CARD = { name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };

function parseBox(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const w = Number(raw.w ?? raw.width);
  const h = Number(raw.h ?? raw.height);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (w <= 0.01 || h <= 0.01) return null;
  // Accept either 0..1 fractions or accidental pixel coords (normalize later via absolute flag).
  return { x, y, w, h };
}

function cardFromParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const name = parsed.name == null ? null : String(parsed.name).trim() || null;
  return {
    name,
    set: parsed.set == null ? null : (String(parsed.set).trim() || null),
    foil: typeof parsed.foil === 'boolean' ? parsed.foil : null,
    condition_guess: parsed.condition_guess || 'unknown',
    confidence: parsed.confidence || 'low',
    box: parseBox(parsed.box),
  };
}

/**
 * Pulls a cards[] array out of model text. Accepts {"cards":[...]}, a bare
 * [...], or a legacy single-card object (one-card photos / old prompts).
 * Exported for tests -- this is the contract between the model and the DB.
 */
export function parseCardsFromModelText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  const objectMatch = raw.match(/\{[\s\S]*\}/);

  let parsed = null;
  for (const match of [objectMatch, arrayMatch]) {
    if (!match) continue;
    try {
      parsed = JSON.parse(match[0]);
      break;
    } catch {
      // try the other shape
    }
  }
  if (parsed == null) return null;

  let list;
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (Array.isArray(parsed.cards)) {
    list = parsed.cards;
  } else if (parsed.name != null || Object.prototype.hasOwnProperty.call(parsed, 'name')) {
    // Legacy single-card JSON from the pre-multi-card prompt.
    list = [parsed];
  } else {
    return null;
  }

  const cards = [];
  for (const item of list.slice(0, MAX_CARDS_PER_PHOTO)) {
    const card = cardFromParsed(item);
    if (card && card.name) cards.push(card);
  }
  return cards;
}

function failResult(error) {
  return { ok: false, error, cards: [] };
}

function okResult(cards) {
  return { ok: true, cards };
}

function unparseable(text, extra = '') {
  const snippet = text ? text.slice(0, 200) : '(empty response text)';
  return failResult(`unparseable_model_output${extra ? ` ${extra}` : ''} text=${snippet}`);
}

async function identifyViaOpenAI(photo) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return failResult('openai_not_configured');
  const model = process.env.MTG_VISION_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
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
  if (!res.ok) return failResult(json?.error?.message || `openai_vision_${res.status}`);
  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  const cards = parseCardsFromModelText(text);
  if (cards == null) return unparseable(text);
  return okResult(cards);
}

async function identifyViaAnthropic(photo) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return failResult('anthropic_not_configured');
  const model = process.env.MTG_VISION_MODEL_ANTHROPIC || 'claude-3-5-sonnet-latest';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
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
  if (!res.ok) return failResult(json?.error?.message || `anthropic_vision_${res.status}`);
  const text = String(json?.content?.[0]?.text || '').trim();
  const cards = parseCardsFromModelText(text);
  if (cards == null) return unparseable(text);
  return okResult(cards);
}

async function identifyViaGemini(photo) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (!apiKey) return failResult('gemini_not_configured');
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
        // thinkingBudget: 0 -- gemini-2.5-flash otherwise burns the output
        // budget on internal reasoning before writing JSON (live MAX_TOKENS
        // failures 2026-08-10/11). Raised further for multi-card arrays.
        generationConfig: { maxOutputTokens: 8000, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return failResult(json?.error?.message || `gemini_vision_${res.status}`);
  const text = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  const cards = parseCardsFromModelText(text);
  if (cards == null) {
    const finishReason = json?.candidates?.[0]?.finishReason || 'unknown';
    return unparseable(text, `finish=${finishReason}`);
  }
  return okResult(cards);
}

async function identifyViaGroq(photo) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return failResult('groq_not_configured');
  const model = process.env.MTG_VISION_MODEL_GROQ || 'llama-3.2-11b-vision-preview';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
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
  if (!res.ok) return failResult(json?.error?.message || `groq_vision_${res.status}`);
  const text = String(json?.choices?.[0]?.message?.content || '').trim();
  const cards = parseCardsFromModelText(text);
  if (cards == null) return unparseable(text);
  return okResult(cards);
}

/**
 * @param {{ name: string, mime: string, data: string }} photo base64 image, no data: prefix
 * @returns {Promise<{ ok: boolean, cards: Array<{name,set,foil,condition_guess,confidence}>, error?: string }>}
 */
export async function identifyMtgCardsFromPhoto(photo, { logger } = {}) {
  try {
    const primary = await identifyViaOpenAI(photo);
    if (primary.ok) return primary;
    logger?.warn?.({ err: primary.error, name: photo.name }, 'mtg card vision: openai failed, trying anthropic fallback (SO-003)');

    const anthropic = await identifyViaAnthropic(photo);
    if (anthropic.ok) return anthropic;
    logger?.warn?.({ err: anthropic.error, name: photo.name }, 'mtg card vision: anthropic failed, trying gemini fallback (SO-003)');

    const gemini = await identifyViaGemini(photo);
    if (gemini.ok) return gemini;
    logger?.warn?.({ err: gemini.error, name: photo.name }, 'mtg card vision: gemini failed, trying groq fallback (SO-003)');

    const groq = await identifyViaGroq(photo);
    if (groq.ok) return groq;

    return failResult(
      `openai:${primary.error} | anthropic:${anthropic.error} | gemini:${gemini.error} | groq:${groq.error}`,
    );
  } catch (err) {
    logger?.warn?.({ err: err.message, name: photo.name }, 'mtg card vision identify failed');
    return failResult(err.message);
  }
}

/**
 * Backward-compatible single-card wrapper (older callers / single-face photos).
 * Prefer identifyMtgCardsFromPhoto for new code.
 */
export async function identifyMtgCardFromPhoto(photo, { logger } = {}) {
  const result = await identifyMtgCardsFromPhoto(photo, { logger });
  if (!result.ok) return { ok: false, error: result.error, ...EMPTY_CARD };
  if (!result.cards.length) return { ok: true, ...EMPTY_CARD };
  return { ok: true, ...result.cards[0] };
}
