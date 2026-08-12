#!/usr/bin/env node
/**
 * SYNOPSIS: The Architect resolves unspecified store contracts — reuse an existing
 * canonical asset where one exists, specify the contract where delegation permits,
 * and escalate only the questions that encode founder policy.
 *
 * Chair, 2026-08-11: "Reuse existing canonical store contracts wherever
 * semantically valid, propose only the genuinely novel schemas, and escalate only
 * fields that encode Founder policy. You should not be designing database columns."
 *
 * Three things had to change for this to be lawful and useful:
 *
 * 1. Name matching had to stop being literal. The earlier CITE_EXISTING move
 *    compared "CapsuleStore" to table names character by character and therefore
 *    never saw `memory_capsules`, a 21-column table that already implements most
 *    of what the blueprint asks CapsuleStore to be. A near-miss on asset reuse is
 *    how a repo ends up with two tables doing one job.
 *
 * 2. Reuse inherits ratified policy. This is what makes reuse a compression rather
 *    than a shortcut: `memory_capsules` already carries trust levels, sensitivity,
 *    purpose-bound retrieval permission and a review-by expiry, all ratified when
 *    that table was adopted. Choosing it raises no NEW founder policy question,
 *    because the policy question was already answered.
 *
 * 3. A store with no existing home and no policy implications is implementation
 *    detail, which IMPLEMENTATION_DELEGATION now assigns to the Architect under
 *    Builder/Sentry/Conductor consensus. Only a genuinely novel store that encodes
 *    ownership, retention, consent, privacy, economics or an irreversible
 *    commitment reaches the founder — and then as a policy question in plain
 *    language, never as a column list.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectInventions } from '../services/blueprint-invention-detector.js';
import { policyBearing, ESCALATION_CRITERION, IMPLEMENTATION_DELEGATION } from '../config/founder-escalation-threshold.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/ARCHITECT_STORE_RESOLUTION_RECEIPT.json';

/**
 * Concept tokens per store. Explicit rather than inferred so a reviewer can see
 * why a candidate surfaced and reject it.
 */
const STORE_CONCEPTS = Object.freeze({
  TaskStore: ['task', 'tasks'],
  AuthorityLedger: ['authority', 'permission', 'permissions', 'delegation', 'grant', 'grants'],
  ReceiptLedger: ['receipt', 'receipts'],
  CapsuleStore: ['capsule', 'capsules', 'memory'],
  TemplateStore: ['template', 'templates'],
  DeviceRegistry: ['device', 'devices'],
  PreferenceStore: ['preference', 'preferences'],
});

/**
 * Column-level evidence that a table serves the same PURPOSE, not merely a similar
 * name. A memory store needs provenance and trust; a ledger needs an actor and a
 * timestamp. Without this, name matching alone would justify any reuse.
 */
const PURPOSE_EVIDENCE = Object.freeze({
  CapsuleStore: ['source', 'trust', 'evidence', 'sensitivity', 'review', 'fact'],
  AuthorityLedger: ['expires', 'authority', 'scope', 'agent', 'grant'],
  ReceiptLedger: ['receipt', 'created_at', 'data'],
  TemplateStore: ['template', 'variant', 'content'],
  PreferenceStore: ['user_id', 'key', 'value'],
  TaskStore: ['status', 'user_id', 'title', 'created_at'],
  DeviceRegistry: ['device', 'platform', 'last_seen'],
});

function readMigrationTables() {
  const dir = path.join(ROOT, 'db/migrations');
  const tables = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const name = m[1].replace(/["']/g, '').split('.').pop();
      if (tables.has(name)) continue;
      const body = m[2];
      const columns = body
        .split('\n')
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && !/^(constraint|primary key|unique|foreign key|check|--)/i.test(l));
      tables.set(name, { table: name, migration: file, columns, column_names: columns.map((c) => c.split(/\s+/)[0].toLowerCase()) });
    }
  }
  return tables;
}

export function findReuseCandidates(store, tables) {
  const concepts = STORE_CONCEPTS[store] || [store.toLowerCase()];
  const evidence = PURPOSE_EVIDENCE[store] || [];
  const out = [];

  for (const [name, info] of tables) {
    const parts = name.split('_');
    const conceptHits = parts.filter((p) => concepts.includes(p)).length;
    if (conceptHits === 0) continue;
    const unrelated = parts.length - conceptHits;
    const evidenceHits = evidence.filter((e) => info.column_names.some((c) => c.includes(e))).length;
    out.push({
      table: name,
      migration: info.migration,
      column_count: info.columns.length,
      concept_tokens: conceptHits,
      unrelated_tokens: unrelated,
      purpose_evidence_hits: evidenceHits,
      purpose_evidence_total: evidence.length,
      // Name proximity gets us to a shortlist; column evidence decides. A table can
      // be called `..._templates` and hold nothing a template store needs.
      score: conceptHits * 2 - unrelated + evidenceHits * 2,
    });
  }
  return out.sort((a, b) => b.score - a.score || b.purpose_evidence_hits - a.purpose_evidence_hits).slice(0, 5);
}

export function resolveStore(store, tables) {
  const candidates = findReuseCandidates(store, tables);
  const best = candidates[0];
  const runnerUp = candidates[1];

  // Reuse needs a candidate that is both named for the concept AND carries most of
  // the columns the purpose requires, and it must be clearly ahead of the next one.
  const evidenceRatio = best ? best.purpose_evidence_hits / Math.max(1, best.purpose_evidence_total) : 0;
  const clearlyAhead = best && (!runnerUp || best.score > runnerUp.score);
  const strongReuse = Boolean(best && evidenceRatio >= 0.5 && clearlyAhead);

  if (strongReuse) {
    return {
      store,
      disposition: 'REUSE_EXISTING',
      resolved_by: 'architect',
      escalates: false,
      table: best.table,
      migration: best.migration,
      // Reuse is still an implementation decision under delegation, not a fact.
      // Builder must confirm the existing table can actually carry the work and
      // Sentry must check the data implications of putting it there.
      requires_consensus_from: IMPLEMENTATION_DELEGATION.requires_consensus_from,
      evidence: `\`${best.table}\` matches on ${best.concept_tokens} concept token(s) and carries ${best.purpose_evidence_hits}/${best.purpose_evidence_total} of the columns this store's purpose requires`,
      policy_note:
        'Reuse inherits the policy already ratified for that table, so this raises no new founder decision.',
      candidates,
    };
  }

  const policy = policyBearing({ store, purpose: STORE_CONCEPTS[store], candidates: candidates.map((c) => c.table) });
  if (policy.policy_bearing) {
    return {
      store,
      disposition: 'ESCALATE_POLICY_ONLY',
      resolved_by: 'founder',
      escalates: true,
      escalation_criterion: ESCALATION_CRITERION.CHANGES_USER_RIGHTS,
      criterion_evidence: `no existing canonical table serves this store, and its subject matter touches ${policy.concepts.join(', ')} — the choice commits the product to a position on ${policy.concepts[0]}`,
      question: `For ${store}: does the person own this data and can they export or delete it, or does the system retain it?`,
      not_asked: 'the column list, which the Architect specifies once the policy is set',
      candidates,
    };
  }

  return {
    store,
    disposition: 'ARCHITECT_SPECIFIES',
    resolved_by: 'architect',
    escalates: false,
    requires_consensus_from: IMPLEMENTATION_DELEGATION.requires_consensus_from,
    evidence: candidates.length
      ? `existing tables (${candidates.slice(0, 3).map((c) => c.table).join(', ')}) are named similarly but carry ${best.purpose_evidence_hits}/${best.purpose_evidence_total} of the required columns, which is not enough to call it the same asset`
      : 'no existing table resembles this store',
    policy_note: 'Nothing in this store encodes ownership, retention, consent, privacy or cost, so it is implementation detail.',
    candidates,
  };
}

export function resolveAllStores() {
  const fixture = path.join(
    ROOT,
    'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json'
  );
  const session = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const report = detectInventions(session);
  const stores = report.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA').map((d) => d.table);
  const tables = readMigrationTables();
  const resolutions = stores.map((s) => resolveStore(s, tables));

  return {
    stores_total: stores.length,
    tables_scanned: tables.size,
    reuse_existing: resolutions.filter((r) => r.disposition === 'REUSE_EXISTING').length,
    architect_specifies: resolutions.filter((r) => r.disposition === 'ARCHITECT_SPECIFIES').length,
    escalated_to_founder: resolutions.filter((r) => r.escalates).length,
    resolutions,
  };
}

function main() {
  const result = resolveAllStores();
  fs.writeFileSync(
    path.join(ROOT, RECEIPT_REL),
    `${JSON.stringify(
      {
        schema: 'architect_store_resolution_receipt_v1',
        generated_at: new Date().toISOString(),
        produced_by: 'scripts/architect-resolve-stores.mjs',
        authority: 'architect',
        delegation: IMPLEMENTATION_DELEGATION,
        independent_reproduction_command: 'node scripts/architect-resolve-stores.mjs',
        ...result,
      },
      null,
      2
    )}\n`
  );
  console.log(
    JSON.stringify(
      {
        stores_total: result.stores_total,
        reuse_existing: result.reuse_existing,
        architect_specifies: result.architect_specifies,
        escalated_to_founder: result.escalated_to_founder,
        detail: result.resolutions.map((r) => `${r.store}: ${r.disposition}${r.table ? ` -> ${r.table}` : ''}`),
      },
      null,
      2
    )
  );
}

if (process.argv[1] && process.argv[1].endsWith('architect-resolve-stores.mjs')) {
  main();
}
