/**
 * SYNOPSIS: Exports estimateGraphicDesignCost — services/creative-engine/modes/graphic-design.js.
 */
const GRAPHIC_MODELS = Object.freeze({
  thumbnail: 'ideogram-ai/ideogram-v3-turbo',
  vector: 'recraft-ai/recraft-v3-svg',
  photo: 'black-forest-labs/flux-1.1-pro',
});

export function getReplicateApiToken() {
  return String(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API || '').trim() || null;
}

function normalizeAssetType(assetType) {
  return assetType === 'vector' || assetType === 'photo' ? assetType : 'thumbnail';
}

export function estimateGraphicDesignCost(request = {}) {
  const assetType = normalizeAssetType(request.assetType);
  const countValue = Number(request.count);
  const count = Number.isFinite(countValue) && countValue > 0 ? countValue : 1;

  const perImageCents =
    assetType === 'vector' ? 8 : assetType === 'photo' ? 6 : 3;

  return {
    cents: perImageCents * count,
    model: GRAPHIC_MODELS[assetType],
    gated: !getReplicateApiToken(),
  };
}

function resolveReplicateOutputUrl(output) {
  const first = Array.isArray(output) ? output[0] : output;

  if (!first) {
    return String(first);
  }

  if (typeof first === 'object' && typeof first.url === 'function') {
    return String(first.url());
  }

  return String(first);
}

export default async function runGraphicDesign({ job, logger, storage }) {
  const apiToken = getReplicateApiToken();
  if (!apiToken) {
    return {
      ok: false,
      gated: true,
      error: 'REPLICATE_API_TOKEN_REQUIRED',
      hint: 'Set REPLICATE_API_TOKEN (or REPLICATE_API) to enable graphic_design (Ideogram/Recraft/Flux via Replicate).',
    };
  }

  const req = job?.request_json || job?.request || {};
  const prompt = typeof req.prompt === 'string' ? req.prompt.trim() : '';

  if (!prompt) {
    return { ok: false, error: 'prompt_required' };
  }

  const assetType = normalizeAssetType(req.assetType);
  const modelId = GRAPHIC_MODELS[assetType] || GRAPHIC_MODELS.thumbnail;
  const aspectRatio =
    typeof req.aspectRatio === 'string' && req.aspectRatio.trim()
      ? req.aspectRatio.trim()
      : assetType === 'vector'
        ? '1:1'
        : '16:9';

  let finalPrompt = prompt;
  if (assetType === 'vector' && Array.isArray(req.brandColors) && req.brandColors.length > 0) {
    finalPrompt += ` Use brand colors: ${req.brandColors.join(', ')}.`;
  }

  logger?.info?.('[graphic_design] generating', { assetType, model: modelId });

  let output;
  try {
    const { default: Replicate } = await import('replicate');
    const replicate = new Replicate({ auth: apiToken });
    output = await replicate.run(modelId, {
      input: {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
      },
    });
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }

  const resolvedUrl = resolveReplicateOutputUrl(output);

  let outputKey = null;
  let publicUrl = resolvedUrl;

  if (storage && typeof storage.saveUpload === 'function') {
    try {
      const [{ writeFile }, { tmpdir }, { join }] = await Promise.all([
        import('node:fs/promises'),
        import('node:os'),
        import('node:path'),
      ]);

      const res = await fetch(resolvedUrl);
      if (!res.ok) {
        throw new Error(`failed_to_fetch_generated_image_${res.status}`);
      }

      const bytes = Buffer.from(await res.arrayBuffer());
      const tempPath = join(tmpdir(), `graphic_${Date.now()}.png`);
      await writeFile(tempPath, bytes);

      const saved = await storage.saveUpload(tempPath, {
        ownerId: job?.owner_id || 'anon',
        filename: 'graphic_design_output',
        kind: 'photo',
      });

      outputKey = saved?.key ?? null;
      publicUrl = saved?.publicUrl ?? resolvedUrl;
    } catch (err) {
      logger?.warn?.('[graphic_design] storage_fallback', {
        error: String(err?.message || err),
      });
      outputKey = null;
      publicUrl = resolvedUrl;
    }
  }

  logger?.info?.('[graphic_design] completed', { outputKey, publicUrl });

  return {
    ok: true,
    outputKey,
    publicUrl,
    model: modelId,
    assetType,
  };
}
