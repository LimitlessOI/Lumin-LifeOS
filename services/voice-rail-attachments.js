/**
 * Voice Rail — attachment validation + OpenAI vision describe for screenshots.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
const MAX_ATTACHMENTS = 6;
const MAX_BYTES = 8 * 1024 * 1024;

export function normalizeVoiceRailAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_ATTACHMENTS)
    .map((item) => {
      const name = String(item?.name || 'attachment').slice(0, 180);
      const mime = String(item?.mime || 'application/octet-stream').slice(0, 120);
      const data = String(item?.data || '').replace(/\s/g, '');
      const size = Number(item?.size) || Math.ceil((data.length * 3) / 4);
      if (!data || size > MAX_BYTES) return null;
      return { name, mime, size, data };
    })
    .filter(Boolean);
}

export async function describeVoiceRailImages(attachments, { logger } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const images = (attachments || []).filter((a) => a.mime?.startsWith('image/') && a.data);
  if (!images.length) {
    return { ok: true, descriptions: [], blocks: [] };
  }
  if (!apiKey) {
    return {
      ok: false,
      error: 'vision_unavailable',
      detail: 'Set OPENAI_API_KEY on Railway to analyze screenshots.',
      descriptions: [],
      blocks: images.map((img) => `[Image attached: ${img.name} — vision not configured]`),
    };
  }

  const model = process.env.VOICE_RAIL_VISION_MODEL || 'gpt-4o-mini';
  const descriptions = [];

  for (const img of images) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'Describe this screenshot for a LifeOS operator audit. Include visible UI text, errors, labels, and what the user might be asking about. Be concise and factual.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${img.mime};base64,${img.data}` },
                },
              ],
            },
          ],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = json?.error?.message || `openai_vision_${res.status}`;
        descriptions.push({ name: img.name, ok: false, error: err });
        continue;
      }
      const text = String(json?.choices?.[0]?.message?.content || '').trim();
      descriptions.push({ name: img.name, ok: true, text });
    } catch (err) {
      logger?.warn?.({ err: err.message, name: img.name }, 'voice-rail vision failed');
      descriptions.push({ name: img.name, ok: false, error: err.message });
    }
  }

  const blocks = descriptions.map((d) => {
    if (d.ok && d.text) return `[Screenshot ${d.name}]: ${d.text}`;
    return `[Image ${d.name}: could not analyze — ${d.error || 'unknown error'}]`;
  });

  return { ok: true, descriptions, blocks };
}

export function attachmentsForStorage(attachments, { includePreview = true } = {}) {
  return (attachments || []).map((a) => {
    const row = {
      name: a.name,
      mime: a.mime,
      size: a.size,
    };
    if (includePreview && a.mime?.startsWith('image/') && a.data) {
      row.preview_url = `data:${a.mime};base64,${a.data.slice(0, 120000)}`;
      if (a.data.length > 120000) row.preview_truncated = true;
    }
    return row;
  });
}
