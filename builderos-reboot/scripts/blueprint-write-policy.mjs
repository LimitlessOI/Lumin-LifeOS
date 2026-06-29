/**
 * SYNOPSIS: When a blueprint step is fully frozen (byte contract + sandbox), Builder may write spine paths in monorepo mode.
 * When a blueprint step is fully frozen (byte contract + sandbox), Builder may write spine paths in monorepo mode.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { isLegacyWriteTarget } from './factory-repo-layout.mjs';

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  const boundary = String(sandboxBoundary || '').replace(/\\/g, '/').replace(/\/\*\*$/, '');
  return normalized === boundary || normalized.startsWith(`${boundary}/`);
}

export function isFrozenBlueprintWriteStep(step) {
  if (step?.action_type !== 'write_file_exact') return false;
  if (!step.target_file || !step.sandbox_boundary) return false;

  const hasInline = step.exact_inputs?.exact_content != null;
  const hasSource = Boolean(step.exact_inputs?.content_source_path);
  if (!hasInline && !hasSource) return false;

  const contract = step.exact_output_contract || {};
  if (contract.type !== 'byte_exact_copy' || !contract.sha256) return false;

  return pathMatchesSandbox(step.target_file, step.sandbox_boundary);
}

export function shouldBlockLegacyWrite(step, layout) {
  if (!layout?.legacyHost) return false;
  if (!isLegacyWriteTarget(step.target_file, layout)) return false;
  return !isFrozenBlueprintWriteStep(step);
}

export function legacyWriteGap(step, layout) {
  if (!shouldBlockLegacyWrite(step, layout)) return null;
  return {
    decision_gap: `Target ${step.target_file} blocked by monorepo legacy quarantine — step lacks frozen blueprint contract`,
    decision_type: 'mechanical',
    required_owner: 'ARC',
    severity: 'blocking',
    blocked: true,
  };
}
