/**
 * SYNOPSIS: Zero-cost image generation via image.pollinations.ai -- no API
 * key, no signup, no billing. Confirmed genuinely free by direct live use
 * (2026-08-10/11): generated Taloa's character art this way, dozens of real
 * calls, never hit an auth wall or a billing prompt. Deliberately NOT wiring
 * Pollinations' newer video endpoint here -- a live test against it returned
 * a real 401 requiring an API key/Pollen-credit account, and the founder has
 * zero compute budget right now ("i do not even have the money for
 * computing"), so nothing gets added on an unconfirmed-free guess. Video
 * stays a documented option (Wan/HunyuanVideo via Replicate, already
 * working and already paid-for) rather than a wired one.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const BASE_URL = 'https://image.pollinations.ai/prompt';

/**
 * @param {string} prompt Plain-language image description.
 * @param {{ width?: number, height?: number, seed?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: boolean, buffer?: Buffer, contentType?: string, error?: string }>}
 */
export async function generateFreeImage(prompt, opts = {}) {
  const { width = 768, height = 768, seed, timeoutMs = 40000 } = opts;
  if (!prompt || !String(prompt).trim()) {
    return { ok: false, error: 'prompt_required' };
  }

  const params = new URLSearchParams({ width: String(width), height: String(height), nologo: 'true' });
  if (seed != null) params.set('seed', String(seed));
  const url = `${BASE_URL}/${encodeURIComponent(prompt)}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { ok: false, error: `pollinations_${res.status}` };
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      ok: true,
      buffer: Buffer.from(arrayBuffer),
      contentType: res.headers.get('content-type') || 'image/jpeg',
    };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}
