// scripts/builderos-c2-commit-proof.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUILDEROS_C2_PROOF_VERSION = '1.0.0';
const BUILDEROS_C2_PROOF_SOURCE = 'builderos-command-control';

function validateProofShape(obj) {
  if (!obj.ok || typeof obj.ok !== 'boolean') {
    throw new Error('Invalid proof shape: ok field is missing or not a boolean');
  }
  if (!obj.source || typeof obj.source !== 'string') {
    throw new Error('Invalid proof shape: source field is missing or not a string');
  }
  if (!obj.generated_at || typeof obj.generated_at !== 'string') {
    throw new Error('Invalid proof shape: generated_at field is missing or not a string');
  }
}

function formatProofJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function getBuilderOSC2CommitProof() {
  const proof = {
    ok: true,
    source: BUILDEROS_C2_PROOF_SOURCE,
    generated_at: new Date().toISOString(),
  };
  validateProofShape(proof);
  return proof;
}

export function a() {
  return getBuilderOSC2CommitProof();
}

if (import.meta.url === fileURLToPath(import.meta.url)) {
  const result = a();
  console.log(formatProofJson(result));
  process.exit(0);
}