#!/usr/bin/env node
/**
 * SYNOPSIS: The Schema Decision Artifact — founder answers to missing store
 * contracts, frozen with provenance and a content hash, consumed identically by
 * every factory.
 *
 * Chair, 2026-08-11: "once those answers arrive, freeze them into a Schema
 * Decision Artifact with provenance and hash, then make both factories consume
 * that same frozen artifact. Otherwise Factory 1 and Factory 2 can accidentally
 * start from slightly different interpretations and we'll confuse specification
 * divergence with builder divergence."
 *
 * That confusion is the expensive kind. Two lanes building different things from
 * the same sentence looks exactly like two lanes disagreeing about how to build
 * one thing, and the second is a builder problem while the first is a
 * specification problem. They have opposite fixes.
 *
 * The artifact is hashed over its answers and provenance so a silently edited
 * answer invalidates every seal downstream of it, and it is fail-closed: an
 * unanswered store blocks the slices that touch it rather than resolving to a
 * plausible default.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { policyBearing, IMPLEMENTATION_DELEGATION } from '../config/founder-escalation-threshold.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ARTIFACT_PATH = path.join(ROOT, 'docs/products/builderos/SCHEMA_DECISION_ARTIFACT.json');

export const ARTIFACT_STATUS = Object.freeze({
  AWAITING_FOUNDER: 'AWAITING_FOUNDER',
  PARTIAL: 'PARTIAL',
  SEALED: 'SEALED',
});

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
    .join(',')}}`;
}

export function artifactHash(artifact) {
  const material = { answers: artifact.answers ?? {}, provenance: artifact.provenance ?? {} };
  return crypto.createHash('sha256').update(canonical(material)).digest('hex');
}

/**
 * Build the artifact. `answers` maps a store name to its contract; anything the
 * founder has not answered stays absent rather than being filled in.
 */
export function createSchemaDecisionArtifact({ requiredStores = [], answers = {}, provenance = {} } = {}) {
  const answered = requiredStores.filter((s) => answers[s]);
  const artifact = {
    schema: 'schema_decision_artifact_v1',
    required_stores: [...requiredStores].sort(),
    answers,
    provenance: {
      decided_by: provenance.decided_by ?? null,
      decided_at: provenance.decided_at ?? null,
      source: provenance.source ?? null,
      question_set: provenance.question_set ?? 'docs/products/builderos/FOUNDER_DECISION_SET_OVERLAY.md',
      ...provenance,
    },
    status:
      answered.length === 0
        ? ARTIFACT_STATUS.AWAITING_FOUNDER
        : answered.length < requiredStores.length
          ? ARTIFACT_STATUS.PARTIAL
          : ARTIFACT_STATUS.SEALED,
    unanswered_stores: requiredStores.filter((s) => !answers[s]).sort(),
  };
  artifact.artifact_hash = artifactHash(artifact);
  return artifact;
}

/**
 * Load and verify. A hash that does not match its contents means someone edited
 * an answer after the fact, which is exactly the case where trusting the file
 * would let unapproved specification reach a builder.
 */
export function loadSchemaDecisionArtifact(artifactPath = ARTIFACT_PATH) {
  if (!fs.existsSync(artifactPath)) {
    return { ok: false, reason: 'NO_ARTIFACT', detail: 'no schema decision artifact exists — the questions have not been answered', artifact: null };
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const expected = artifactHash(artifact);
  if (artifact.artifact_hash !== expected) {
    return {
      ok: false,
      reason: 'ARTIFACT_HASH_MISMATCH',
      detail: `artifact contents do not match their hash — an answer was changed after freezing (declared ${artifact.artifact_hash?.slice(0, 12)}, actual ${expected.slice(0, 12)})`,
      artifact,
    };
  }
  return { ok: true, artifact };
}

/**
 * The gate every factory passes through before building anything that touches a
 * store. Both lanes must cite the same artifact hash: one frozen specification,
 * not two readings of a document.
 */
export function verifySchemaAuthority({ requiredStores = [], artifactPath = ARTIFACT_PATH, citedHashes = {} } = {}) {
  const loaded = loadSchemaDecisionArtifact(artifactPath);
  const defects = [];

  if (!loaded.ok) {
    defects.push({
      id: loaded.reason,
      authority: loaded.reason === 'NO_ARTIFACT' ? 'founder' : 'conductor',
      origin: 'founder_decision',
      detail: loaded.detail,
    });
    return { ok: false, defects, artifact: loaded.artifact };
  }

  // An answer must carry authority from someone entitled to give it. Two routes
  // are lawful, and the difference between them is the whole point of the
  // escalation threshold:
  //
  //   founder ratification — required for anything policy-bearing;
  //   architect resolution with Builder/Sentry/Conductor consensus — sufficient
  //   for implementation detail, per IMPLEMENTATION_DELEGATION.
  //
  // Without the second route the founder is the system's reasoning layer, which is
  // the failure the Chair named. Without the first, the system quietly decides
  // policy on his behalf. Both routes demand named authority; neither accepts a
  // bare proposal.
  const unratified = Object.entries(loaded.artifact.answers || {})
    .filter(([store, answer]) => {
      if (!answer) return false;
      if (answer.ratified_by === 'founder') return false;
      // Classify the decision, not the prose about it. Passing the whole answer
      // here made Sentry's own note that "reuse inherits the handling already
      // ratified for it" read as proof the answer was policy-bearing, which
      // demanded founder ratification for a question he had already settled.
      const policy = policyBearing({ store, table: answer.table, columns: answer.columns });
      if (policy.policy_bearing) return true;
      const consensus = Array.isArray(answer.consensus) ? answer.consensus : [];
      const complete = IMPLEMENTATION_DELEGATION.requires_consensus_from.every((office) => consensus.includes(office));
      return !(answer.resolved_by === 'architect' && complete);
    })
    .map(([store]) => store);
  if (unratified.length > 0) {
    defects.push({
      id: 'UNRATIFIED_SCHEMA_ANSWER',
      authority: 'founder',
      origin: 'founder_decision',
      detail: `${unratified.length} store contract(s) carry an answer with no lawful authority behind it: ${unratified.join(', ')}. Implementation detail needs an Architect resolution with ${IMPLEMENTATION_DELEGATION.requires_consensus_from.join('/')} consensus; anything policy-bearing needs the founder.`,
      stores: unratified,
    });
  }

  const missing = requiredStores.filter((s) => !loaded.artifact.answers?.[s]);
  if (missing.length > 0) {
    defects.push({
      id: 'UNANSWERED_STORE_CONTRACT',
      authority: 'founder',
      origin: 'founder_decision',
      detail: `${missing.length} store contract(s) still unanswered: ${missing.join(', ')}. Inferring them would let two factories invent two different schemas from one silence.`,
      stores: missing,
    });
  }

  for (const [factoryId, hash] of Object.entries(citedHashes)) {
    if (hash !== loaded.artifact.artifact_hash) {
      defects.push({
        id: 'FACTORY_CITES_STALE_SCHEMA_ARTIFACT',
        authority: 'conductor',
        origin: 'manufacturing_plan',
        detail: `factory \`${factoryId}\` is building against artifact ${String(hash).slice(0, 12)} while the sealed artifact is ${loaded.artifact.artifact_hash.slice(0, 12)} — divergence here would be misread as builder disagreement`,
        factory_id: factoryId,
      });
    }
  }

  return { ok: defects.length === 0, defects, artifact: loaded.artifact };
}

function main() {
  const stores = process.argv.includes('--stores')
    ? process.argv[process.argv.indexOf('--stores') + 1].split(',')
    : ['TaskStore', 'AuthorityLedger', 'ReceiptLedger', 'CapsuleStore', 'TemplateStore', 'DeviceRegistry', 'PreferenceStore'];

  if (process.argv.includes('--init')) {
    const artifact = createSchemaDecisionArtifact({
      requiredStores: stores,
      answers: {},
      provenance: {
        decided_by: null,
        decided_at: null,
        source: 'awaiting founder answers to the Overlay decision set',
      },
    });
    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`wrote ${ARTIFACT_PATH} (${artifact.status}, ${artifact.unanswered_stores.length} unanswered)`);
    return;
  }

  const result = verifySchemaAuthority({ requiredStores: stores });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('schema-decision-artifact.mjs')) {
  main();
}
