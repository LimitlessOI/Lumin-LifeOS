/**
 * SYNOPSIS: Identifies a Magic: The Gathering card (name, set, foil, condition
 * guess) from a photo using OpenAI vision. Same working call shape as
 * services/voice-rail-attachments.js's describeVoiceRailImages -- direct
 * fetch to the chat/completions endpoint with an image_url content block,
 * not the AI Council (config/council-members.js has no vision-capable
 * member -- confirmed by reading it, not assumed).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const IDENTIFY_PROMPT = `You are identifying a single Magic: The Gathering trading card from a photo for a reseller cataloging a large collection.
Respond with ONLY a JSON object, no other text, in this exact shape:
{"name": "<exact card name as printed>", "set": "<set name or code if visible/inferable, else null>", "foil": <true|false|null>, "condition_guess": "<near mint|lightly played|moderately played|heavily played|damaged|unknown>", "confidence": "<high|medium|low>"}
If the image does not clearly show a single Magic card, respond with {"name": null, "set": null, "foil": null, "condition_guess": null, "confidence": "low"}.`;

function parseModelJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * @param {{ name: string, mime: string, data: string }} photo base64 image, no data: prefix
 * @returns {Promise<{ ok: boolean, name: string|null, set: string|null, foil: boolean|null, condition_guess: string|null, confidence: string, error?: string }>}
 */
export async function identifyMtgCardFromPhoto(photo, { logger } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'vision_unavailable', name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };
  }
  const model = process.env.MTG_VISION_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
      const err = json?.error?.message || `openai_vision_${res.status}`;
      return { ok: false, error: err, name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };
    }
    const text = String(json?.choices?.[0]?.message?.content || '').trim();
    const parsed = parseModelJson(text);
    if (!parsed) {
      return { ok: false, error: 'unparseable_model_output', name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };
    }
    return {
      ok: true,
      name: parsed.name || null,
      set: parsed.set || null,
      foil: typeof parsed.foil === 'boolean' ? parsed.foil : null,
      condition_guess: parsed.condition_guess || 'unknown',
      confidence: parsed.confidence || 'low',
    };
  } catch (err) {
    logger?.warn?.({ err: err.message, name: photo.name }, 'mtg card vision identify failed');
    return { ok: false, error: err.message, name: null, set: null, foil: null, condition_guess: null, confidence: 'low' };
  }
}
