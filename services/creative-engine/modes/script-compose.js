// SYNOPSIS: Creative Engine mode — script → Flux stills → FFmpeg compose (Replicate-gated)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

function resolveReplicateToken() {
  return (
    process.env.REPLICATE_API_TOKEN?.trim() ||
    process.env.REPLICATE_API?.trim() ||
    ''
  );
}

export async function runScriptCompose({ job, logger, VideoPipeline, storage }) {
  const apiToken = resolveReplicateToken();
  if (!apiToken) {
    return {
      ok: false,
      gated: true,
      error: 'REPLICATE_API_TOKEN_REQUIRED',
      hint: 'Set REPLICATE_API_TOKEN (or REPLICATE_API) to enable script_compose (Flux + FFmpeg Path B).',
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

  const rawStyle = String(req.style || 'cinematic').toLowerCase();
  const style = ['cinematic', 'animated', 'documentary', 'product'].find((s) => rawStyle.includes(s)) || 'cinematic';

  const pipeline = new Pipeline({ apiToken });
  const result = await pipeline.generate({
    script: String(script),
    style,
    useVideoModel: false,
  });

  if (!result || result.success === false) {
    return {
      ok: false,
      error: result?.error || 'script_compose_pipeline_failed',
      hint: 'Video pipeline Path B failed before producing an MP4.',
      pipelineResult: result && typeof result === 'object'
        ? { jobId: result.jobId || result.id, error: result.error }
        : undefined,
    };
  }

  let absolutePath = result.videoPath || result.outputPath || result.path || null;
  let publicUrl = result.url || result.outputUrl || null;
  let outputKey = null;

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

  logger?.info?.('[script_compose] completed', { outputKey, publicUrl, absolutePath });
  if (!publicUrl && !absolutePath) {
    return {
      ok: false,
      error: 'script_compose_no_output',
      hint: 'Video pipeline claimed success but returned no videoPath. Check ffmpeg + Flux downloads.',
      pipelineResult: result && typeof result === 'object' ? { jobId: result.jobId || result.id } : undefined,
    };
  }
  return {
    ok: true,
    outputKey,
    publicUrl,
    absolutePath,
    pipelineResult: result && typeof result === 'object'
      ? { jobId: result.jobId || result.id, scenes: result.scenes, estimatedCost: result.estimatedCost }
      : undefined,
  };
}

export default runScriptCompose;
