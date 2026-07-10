// SYNOPSIS: Creative Engine mode — script → Flux stills → FFmpeg compose (Replicate-gated)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

export async function runScriptCompose({ job, logger, VideoPipeline, storage }) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      ok: false,
      gated: true,
      error: 'REPLICATE_API_TOKEN_REQUIRED',
      hint: 'Set REPLICATE_API_TOKEN to enable script_compose (Flux + FFmpeg Path B).',
    };
  }

  const req = job.request_json || job.request || {};
  const script = req.script || req.text;
  if (!script || !String(script).trim()) {
    return { ok: false, error: 'script_required' };
  }

  let Pipeline = VideoPipeline;
  if (!Pipeline) {
    const mod = await import('../../video-pipeline.js');
    Pipeline = mod.default;
  }

  const pipeline = new Pipeline({ apiToken: process.env.REPLICATE_API_TOKEN });
  const result = await pipeline.generate({
    script: String(script),
    style: req.style || 'cinematic',
    useVideoModel: false,
  });

  let outputKey = null;
  let publicUrl = result?.url || result?.outputUrl || null;
  let absolutePath = result?.outputPath || result?.path || null;

  if (storage && absolutePath) {
    try {
      const saved = await storage.saveUpload(absolutePath, {
        ownerId: job.owner_id || 'anon',
        filename: 'script_compose.mp4',
        kind: 'output',
      });
      outputKey = saved.key;
      publicUrl = saved.publicUrl;
      absolutePath = saved.absolutePath;
    } catch (err) {
      logger?.warn?.('[script_compose] copy to creative storage failed', { error: err.message });
    }
  }

  logger?.info?.('[script_compose] completed', { outputKey, publicUrl });
  return {
    ok: true,
    outputKey,
    publicUrl,
    absolutePath,
    pipelineResult: result && typeof result === 'object' ? { jobId: result.jobId || result.id } : undefined,
  };
}

export default runScriptCompose;
