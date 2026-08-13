/**
 * SYNOPSIS: Architect custody of sealed manufacturing print sequences.
 * Chat conductors must not author print slices in config — that is SO-001 drift
 * (Cursor hand-sealed Collectibles V1→V10 and made tip depend on Cursor).
 * This module loads/writes docs/products/<id>/PRINT_SEQUENCE.json only.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ARCHITECT_PRINT_SEAL_REQUIRED = 'ARCHITECT_PRINT_SEAL_REQUIRED';

export function printSequenceArtifactPath(productId, repoRoot = ROOT) {
  return path.join(repoRoot, 'docs/products', productId, 'PRINT_SEQUENCE.json');
}

/**
 * Load Architect-sealed print steps for a product. Fail-closed if missing/invalid.
 * @returns {{ steps: object[], meta: object }}
 */
export function loadSealedPrintSequence(productId, { repoRoot = ROOT } = {}) {
  const abs = printSequenceArtifactPath(productId, repoRoot);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `${ARCHITECT_PRINT_SEAL_REQUIRED}: missing ${path.relative(repoRoot, abs)}. `
      + `Architect must seal print via npm run builderos:architect:seal-print -- --product ${productId}. `
      + `Cursor must not invent slices in config/overlay-print-sequence.js.`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error(`${ARCHITECT_PRINT_SEAL_REQUIRED}: unreadable ${abs}: ${err.message}`);
  }
  if (parsed?.schema !== 'architect_sealed_print_sequence_v1') {
    throw new Error(`${ARCHITECT_PRINT_SEAL_REQUIRED}: bad schema in ${abs}`);
  }
  if (String(parsed.product_id) !== String(productId)) {
    throw new Error(`${ARCHITECT_PRINT_SEAL_REQUIRED}: product_id mismatch in ${abs}`);
  }
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error(`${ARCHITECT_PRINT_SEAL_REQUIRED}: empty steps in ${abs}`);
  }
  for (const step of parsed.steps) {
    if (!step?.id || !step?.target_file) {
      throw new Error(`${ARCHITECT_PRINT_SEAL_REQUIRED}: step missing id/target_file in ${abs}`);
    }
  }
  return {
    steps: Object.freeze(parsed.steps.map((s) => Object.freeze({ ...s }))),
    meta: {
      sealed_by: parsed.sealed_by,
      sealed_at: parsed.sealed_at,
      source_docs: parsed.source_docs,
      custody: parsed.custody,
      honesty: parsed.honesty,
      path: path.relative(repoRoot, abs),
    },
  };
}

/**
 * Architect-only writer. Overwrites PRINT_SEQUENCE.json with a sealed artifact.
 */
export function sealPrintSequence({
  productId,
  steps,
  source_docs = [],
  honesty = null,
  sealed_by = 'architect_print_seal',
  blueprint_id = 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
  repoRoot = ROOT,
} = {}) {
  if (!productId) throw new Error('sealPrintSequence requires productId');
  if (!Array.isArray(steps) || !steps.length) throw new Error('sealPrintSequence requires steps[]');
  const abs = printSequenceArtifactPath(productId, repoRoot);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const artifact = {
    schema: 'architect_sealed_print_sequence_v1',
    product_id: productId,
    source_docs,
    blueprint_id,
    live_queue_product: 'universal-overlay',
    sealed_by,
    sealed_at: new Date().toISOString(),
    custody:
      'Architect office owns this file. Cursor/chat conductors must not edit slice bodies. '
      + 'Regenerate only via scripts/architect-seal-print-sequence.mjs / sealPrintSequence().',
    honesty: honesty || {
      rule: 'Print authorship is Architect jurisdiction. Hand-editing this file from chat is SO-001 drift.',
    },
    steps,
  };
  fs.writeFileSync(abs, `${JSON.stringify(artifact, null, 2)}\n`);
  return { ok: true, path: path.relative(repoRoot, abs), step_count: steps.length, sealed_at: artifact.sealed_at };
}

/** True when Architect seal exists and parses. */
export function hasSealedPrintSequence(productId, { repoRoot = ROOT } = {}) {
  try {
    loadSealedPrintSequence(productId, { repoRoot });
    return true;
  } catch {
    return false;
  }
}
