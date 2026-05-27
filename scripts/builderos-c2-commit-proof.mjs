/**
 * BuilderOS Command & Control commit-path proof module.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

const BUILDEROS_C2_PROOF_VERSION = '1.0.0';
const PROOF_SOURCE = 'builderos-command-control';

function validateProofShape(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.ok !== true) return false;
  if (typeof obj.source !== 'string' || !obj.source) return false;
  if (typeof obj.generated_at !== 'string' || !obj.generated_at) return false;
  const parsed = Date.parse(obj.generated_at);
  return !Number.isNaN(parsed);
}

function formatProofJson(obj) {
  return JSON.stringify(obj, null, 2);
}

export function getBuilderOSC2CommitProof() {
  const proof = {
    ok: true,
    source: PROOF_SOURCE,
    generated_at: new Date().toISOString(),
    version: BUILDEROS_C2_PROOF_VERSION,
  };
  if (!validateProofShape(proof)) {
    throw new Error('invalid proof shape');
  }
  return proof;
}

function isCliEntry() {
  if (!process.argv[1]) return false;
  return import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
}

if (isCliEntry()) {
  const result = getBuilderOSC2CommitProof();
  process.stdout.write(formatProofJson(result) + '\n');
}
