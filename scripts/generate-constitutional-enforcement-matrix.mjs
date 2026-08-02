/**
 * SYNOPSIS: Generates a proposed Constitutional Enforcement Matrix from the canonical registry.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * Generates a proposed Constitutional Enforcement Matrix from the canonical registry.
 *
 * This script reads data/constitutional-framework/REGISTRY.json and produces
 * data/constitutional-framework/proposals/ENFORCEMENT_MATRIX_PROPOSED.json,
 * mapping each constitutional item to a verifier script and verification kind.
 *
 * It is a Phase 0 implementation artifact. The output is PROPOSED, not ratified.
 */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const REGISTRY_PATH = path.join(REPO_ROOT, 'data/constitutional-framework/REGISTRY.json');
const OUT_DIR = path.join(REPO_ROOT, 'data/constitutional-framework/proposals');
const OUT_PATH = path.join(OUT_DIR, 'ENFORCEMENT_MATRIX_PROPOSED.json');

function verifierFor(method) {
  const map = {
    preflight: 'npm run builder:preflight',
    'ssot-check': 'node scripts/ssot-check.js --all',
    'product-home-verify': 'npm run lifeos:product-home:verify',
    'truth-lockdown': 'node scripts/verify-truth-lockdown.mjs',
    'point-b-dna': 'node scripts/verify-point-b-dna.mjs',
    'receipt-truth': 'node scripts/verify-receipt-truth.mjs',
    'constitutional-framework': 'node scripts/constitutional-framework.mjs verify',
    'council-builder': 'node scripts/council-builder-preflight.mjs',
    'bp-priority': 'npm run lifeos:bp-priority:verify',
    'lifeos-service-doctrine': 'node scripts/verify-lifeos-service-doctrine.mjs',
    'chair-fp-v2': 'node scripts/verify-chair-fp-v2-enforcement.mjs',
    'voice-rail': 'node scripts/verify-voice-rail-history-only.mjs',
    'lumin-communication': 'node scripts/verify-lumin-communication-law.mjs',
    'lumin-conversation-routing': 'node scripts/verify-lumin-conversation-routing.mjs',
    'migration-preflight': 'npm run migration:preflight',
    'migration-idempotency': 'npm run migration:idempotency',
  };
  return map[method] || 'manual-review';
}

function verificationKind(verifier) {
  if (verifier.startsWith('npm run') || verifier.startsWith('node scripts/')) return 'deterministic';
  if (verifier === 'manual-review') return 'human-review';
  return 'mixed';
}

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`Registry not found: ${REGISTRY_PATH}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const items = Array.isArray(registry.items) ? registry.items : [];

  const entries = items.map((item) => {
    const method = item.enforcement_method || 'unknown';
    const verifier = verifierFor(method);
    return {
      law_id: item.id,
      title: item.title || item.id,
      level: item.level || null,
      source_file: item.source_file || null,
      source_anchor: item.source_anchor || null,
      authority_level: item.level ? registry.levels?.[item.level]?.order ?? null : null,
      enforcement_status: item.enforcement_status || 'unknown',
      evidence_level: item.evidence_level || null,
      epistemic_confidence_score: item.epistemic_confidence_score ?? null,
      constitutional_commitment_score: item.constitutional_commitment_score ?? null,
      evidence_score: item.evidence_score ?? null,
      verifier_script: verifier,
      verification_kind: verificationKind(verifier),
      notes: 'Generated from canonical registry; verifier mapping is proposed and must be reviewed before ratification.',
    };
  });

  const matrix = {
    schema: 'enforcement_matrix_v0',
    version: '2026-08-02-proposed',
    status: 'PROPOSED',
    generated_at: new Date().toISOString(),
    source_registry: 'data/constitutional-framework/REGISTRY.json',
    generated_by: 'scripts/generate-constitutional-enforcement-matrix.mjs',
    entries,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(matrix, null, 2));
  console.log(`Wrote ${entries.length} enforcement entries to ${OUT_PATH}`);
}

main();
