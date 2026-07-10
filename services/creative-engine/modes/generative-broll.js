// SYNOPSIS: Creative Engine mode — generative b-roll scaffold (Wan/Kling gated until tip-proven)
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

export function estimateGenerativeBrollCost(sceneCount = 1) {
  const n = Math.max(1, Math.min(Number(sceneCount) || 1, 3));
  const usdPerClip = 0.06;
  return {
    sceneCount: n,
    usd: Number((n * usdPerClip).toFixed(2)),
    cents: Math.round(n * usdPerClip * 100),
    provider: 'replicate_wan_kling',
  };
}

export async function runGenerativeBroll({ job, logger }) {
  const req = job.request_json || job.request || {};
  const estimate = estimateGenerativeBrollCost(req.sceneCount || req.scene_count || 1);
  logger?.info?.('[generative_broll] gated scaffold hit', { estimate });
  return {
    ok: false,
    gated: true,
    error: 'GENERATIVE_BROLL_NOT_ENABLED_V1',
    hint: 'Enable after footage_edit is tip-proven. Uses Wan/Kling via Replicate adapters.',
    estimate,
  };
}

export default runGenerativeBroll;
