/**
 * SYNOPSIS: BuilderOS coder tier lock — intended tier must equal determinism test tier.
 * @ssot docs/projects/BUILDEROS_BP_V1.md
 */

export function resolveBuilderTierLock() {
  const intended = String(
    process.env.BUILDEROS_INTENDED_CODER_TIER
    || process.env.BUILDEROS_CODER_TIER
    || 'mechanical',
  ).trim();
  const test = String(
    process.env.BUILDEROS_DETERMINISM_TEST_TIER
    || process.env.BUILDEROS_CODER_TIER
    || intended,
  ).trim();
  const stronger = String(process.env.BUILDEROS_STRONGER_MODEL_TIER || '').trim();
  return { intended, test, stronger };
}
