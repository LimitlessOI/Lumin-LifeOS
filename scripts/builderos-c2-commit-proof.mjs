/**
 * SYNOPSIS: Exports getBuilderOSC2CommitProof — scripts/builderos-c2-commit-proof.mjs. @ssot docs/products/builderos/PRODUCT_HOME.md */
const BUILDEROS_C2_PROOF_VERSION = '2.0.0';
const PROOF_SOURCE = 'builderos-command-control';

function validateProofShape(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (typeof obj.ok !== 'boolean') {
    return false;
  }
  if (typeof obj.source !== 'string' || obj.source !== PROOF_SOURCE) {
    return false;
  }
  if (typeof obj.generated_at !== 'string') {
    return false;
  }
  // Basic ISO 8601 check (YYYY-MM-DDTHH:mm:ss.sssZ)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!iso8601Regex.test(obj.generated_at)) {
    return false;
  }
  // Further validate if it's a real date and matches its own ISO string
  try {
    const date = new Date(obj.generated_at);
    if (isNaN(date.getTime()) || date.toISOString() !== obj.generated_at) {
      return false;
    }
  } catch (e) {
    return false;
  }

  if (typeof obj.proof_path !== 'string' || obj.proof_path !== 'c2-committed') {
    return false;
  }

  return true;
}

function formatProofJson(obj) {
  return JSON.stringify(obj, null, 2);
}

export function getBuilderOSC2CommitProof() {
  const proof = {
    ok: true,
    source: PROOF_SOURCE,
    generated_at: new Date().toISOString(),
    proof_path: 'c2-committed',
  };
  return proof;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const proof = getBuilderOSC2CommitProof();
  if (!validateProofShape(proof)) {
    console.error('Warning: Generated proof failed internal validation.');
  }
  console.log(formatProofJson(proof));
}