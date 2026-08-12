#!/usr/bin/env node
/**
 * SYNOPSIS: Turns the founder decision set from homework into a set of choices —
 * candidate store contracts grounded in tables that actually exist, and candidate
 * dependency-cycle repairs with the reasoning behind each.
 *
 * Why this exists: the decision set asked the founder "what are the columns and
 * types of TaskStore?" seven times. That is a schema design session, and it is why
 * sixteen slices sat blocked. The lawful acceleration is not to answer for him —
 * the no-invention law forbids that and the Schema Decision Artifact refuses any
 * answer not ratified by him — but to attach real options, real evidence, and the
 * trade-off to each question so the decision takes minutes.
 *
 * Everything this emits is a PROPOSAL. Nothing here is an answer, nothing is
 * written into the artifact, and the artifact stays AWAITING_FOUNDER until he
 * ratifies. Drafting options is lawful; letting a proposal pass as a decision is
 * the invention laundering the law exists to stop.
 *
 * The reuse candidates matter more than expected: this repo already contains
 * tables that plausibly satisfy several of these stores, and the Architect's
 * existing CITE_EXISTING move missed them because it compares names literally
 * ("CapsuleStore" never matches "memory_capsules"). A near-miss on asset reuse is
 * how a system ends up with two tables doing one job.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectInventions } from '../services/blueprint-invention-detector.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json';
const OUT_MD = 'docs/products/builderos/FOUNDER_SCHEMA_OPTIONS_OVERLAY.md';
const OUT_RECEIPT = 'products/receipts/FOUNDER_DECISION_PROPOSALS_RECEIPT.json';

/**
 * Concept tokens per store, used to find existing tables that might already do
 * the job. Deliberately explicit rather than clever: a reviewer must be able to
 * see why a candidate was surfaced and reject it.
 */
const STORE_CONCEPTS = Object.freeze({
  TaskStore: ['task', 'tasks', 'intent', 'goal'],
  AuthorityLedger: ['authority', 'permission', 'delegation', 'grant'],
  ReceiptLedger: ['receipt', 'receipts', 'spine'],
  CapsuleStore: ['capsule', 'capsules', 'memory'],
  TemplateStore: ['template', 'templates'],
  DeviceRegistry: ['device', 'devices'],
  PreferenceStore: ['preference', 'preferences', 'pref', 'prefs'],
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
      const columns = m[2]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^(constraint|primary key|unique|foreign key|check|--)/i.test(l))
        .map((l) => l.replace(/,$/, ''))
        .slice(0, 40);
      tables.set(name, { table: name, migration: file, columns });
    }
  }
  return tables;
}

/**
 * Rank by how much of the table's NAME is the concept, not by how big the table
 * is, and require whole-token matches — substring matching produced the noise.
 *
 * The first version ranked on column count and recommended a social-posting table
 * for TemplateStore and an unrelated cost-tracking table for DeviceRegistry, the
 * latter purely because both names contained the same incidental word. A
 * founder-facing document full of confident junk is worse than one that says "no
 * candidate", because it costs trust in every other row.
 */
function scoreCandidates(store, tables) {
  const concepts = STORE_CONCEPTS[store] || [store.toLowerCase()];
  const scored = [];
  for (const [name, info] of tables) {
    const parts = name.split('_');
    const hits = parts.filter((part) => concepts.includes(part)).length;
    if (hits === 0) continue;
    const unrelatedTokens = parts.length - hits;
    scored.push({
      ...info,
      score: hits * 2 - unrelatedTokens,
      column_count: info.columns.length,
      name_specificity: `${hits} concept token(s), ${unrelatedTokens} unrelated`,
    });
  }
  return scored.sort((a, b) => b.score - a.score || a.columns.length - b.columns.length).slice(0, 4);
}

/**
 * Candidate repairs for the cycle. Each names the edge it removes and why that
 * edge is suspect. The Architect decides; this only makes the decision concrete.
 */
export const CYCLE_REPAIR_CANDIDATES = Object.freeze([
  {
    id: 'CR-1',
    title: 'Drop the router\'s build-time dependencies on verification and receipt-ledger',
    removes: ['TALOA-P1-012 -> TALOA-P1-014', 'TALOA-P1-012 -> TALOA-P1-015'],
    reasoning:
      'The strategy router CALLS verification and the receipt ledger at runtime, but it does not need either module to exist in order to be authored against their interfaces. The blueprint appears to have recorded a runtime relationship as a build order, which is the most common way an acyclic system acquires a cyclic plan.',
    result: 'Graph becomes acyclic. Build order: 012 -> 013 -> 014 -> 015, then 016 verifies everything.',
    cost: 'Cheapest. No decomposition, no new steps.',
    risk: 'If the router genuinely imports concrete implementations rather than interfaces, the first build fails fast on an unresolved import — a loud, cheap failure.',
  },
  {
    id: 'CR-2',
    title: 'Decompose the router into interface and implementation',
    removes: ['TALOA-P1-012 (single step)'],
    reasoning:
      'Splits into 012a (router interface and gate algorithm, no dependencies) and 012b (wiring to verification and receipts, depending on both). Preserves every stated runtime relationship instead of asserting that it was a mistake.',
    result: 'Acyclic, and the declared dependencies survive intact. Adds one step and one wave.',
    cost: 'Moderate: one extra slice, one extra integration point.',
    risk: 'A larger change to a blueprint that is already the frozen regression fixture for a different purpose.',
  },
  {
    id: 'CR-3',
    title: 'Re-examine whether verification should depend on the capsule runtime at all',
    removes: ['TALOA-P1-014 -> TALOA-P1-013'],
    reasoning:
      'Verification is described as validating operations and states. If it validates state rather than executing capsules, its dependency on the capsule runtime may be the incorrect edge, in which case the other three edges are all sound.',
    result: 'Acyclic if that edge was wrong. Requires reading the intent of verification, not just the graph.',
    cost: 'Low to implement, higher to decide: this is a question about what verification IS.',
    risk: 'If verification really does need to execute capsules to verify them, this repair is wrong and would surface as a redesign later.',
  },
  {
    id: 'CR-4',
    title: 'Declare the cycle lawful with an explicit iterative execution contract',
    removes: [],
    reasoning:
      'The new topology gate permits a declared cycle that states how many passes it takes and what makes it terminate — for example pass 1 authors stubs, pass 2 wires them. This is the only option that keeps every edge.',
    result: 'Lawful under the gate, but the most expensive to execute and to verify.',
    cost: 'Highest. Two-pass manufacturing for four modules.',
    risk: 'Chair guidance is that a cycle should be broken where it is conceptually wrong, not accommodated. Recommended only if all four edges are genuinely correct.',
  },
]);

export function buildProposals() {
  const session = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE), 'utf8'));
  const report = detectInventions(session);
  const stores = report.defects.filter((d) => d.id === 'INVENTED_SQL_SCHEMA').map((d) => d.table);
  const tables = readMigrationTables();

  const proposals = stores.map((store) => ({
    store,
    reuse_candidates: scoreCandidates(store, tables),
  }));

  return {
    stores,
    proposals,
    cycle_repairs: CYCLE_REPAIR_CANDIDATES,
    tables_scanned: tables.size,
    stores_with_candidates: proposals.filter((p) => p.reuse_candidates.length > 0).length,
  };
}

function renderMarkdown(p) {
  const lines = [
    '<!-- SYNOPSIS: Generated by scripts/propose-founder-decisions.mjs. PROPOSALS ONLY — nothing here is a decision. -->',
    '',
    '# Founder decision options — Overlay',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)}. Companion to \`FOUNDER_DECISION_SET_OVERLAY.md\`, which asks the questions. This attaches options, real evidence, and the trade-off to each one.`,
    '',
    '**Everything below is a PROPOSAL.** Nothing here has been written into the Schema Decision Artifact, and the artifact refuses any answer not ratified by you — so a proposal cannot quietly become a decision. Pick, edit, or reject.',
    '',
    `Scanned ${p.tables_scanned} existing tables in \`db/migrations\`. ${p.stores_with_candidates} of ${p.stores.length} stores have at least one plausible existing home, which the Architect's own citation step missed because it compares names literally.`,
    '',
    '---',
    '',
    '## Part 1 — The seven store contracts',
    '',
    'For each store the options are the same four, so you can answer in one pass:',
    '',
    '**(A) Reuse** an existing table as-is · **(B) Extend** an existing table · **(C) Specify a new one** · **(D) Defer** it as a non-goal for this phase.',
    '',
  ];

  for (const item of p.proposals) {
    lines.push(`### ${item.store}`, '');
    if (item.reuse_candidates.length === 0) {
      lines.push('No existing table resembles this. Realistically **(C) specify** or **(D) defer**.', '');
      continue;
    }
    // No "strongest candidate" claim: these are name matches, and a name match is
    // not a judgment about fit. Ranking them would manufacture confidence the
    // method does not have.
    lines.push(
      `Existing tables that mention this concept — verify fit before choosing, none of these is a recommendation:`,
      '',
      ...item.reuse_candidates.map((c) => `- \`${c.table}\` — ${c.column_count} columns, ${c.name_specificity}, \`${c.migration}\``),
      ''
    );
    // Expand the richest of them, which shows how much already exists. Expanding
    // an arbitrary one taught nothing.
    const richest = [...item.reuse_candidates].sort((a, b) => b.column_count - a.column_count)[0];
    lines.push(
      '<details><summary>What `' + richest.table + '` already holds (the richest of these)</summary>',
      '',
      '```sql',
      ...richest.columns.slice(0, 16),
      ...(richest.columns.length > 16 ? ['-- ...'] : []),
      '```',
      '',
      '</details>',
      ''
    );
  }

  lines.push(
    '---',
    '',
    '## Part 2 — Breaking the dependency cycle',
    '',
    'Five steps cannot start because `012 → 014 → 013 → 012` (with `015` knotted in) has no valid order. Per the Chair, this is an architectural decision and no builder may resolve it by finding an order that happens to run — but builders may propose candidates, which these are.',
    '',
    'The knot in plain terms: the **strategy router** declares that it must be built after **verification** and the **receipt ledger**. It calls both at runtime. Those are different claims, and conflating them is what produced the cycle.',
    ''
  );
  for (const r of p.cycle_repairs) {
    lines.push(
      `### ${r.id} — ${r.title}`,
      '',
      `**Removes:** ${r.removes.length ? r.removes.map((e) => `\`${e}\``).join(', ') : 'nothing — keeps every edge'}`,
      '',
      r.reasoning,
      '',
      `**Result:** ${r.result}`,
      '',
      `**Cost:** ${r.cost} · **Risk:** ${r.risk}`,
      ''
    );
  }

  lines.push(
    '---',
    '',
    '## What happens the moment you answer',
    '',
    'Your ratified answers are frozen into the Schema Decision Artifact with provenance and a hash, both lanes build against that one artifact, the topology gate re-validates the repaired graph, the three offices reseal, and wave 1 dispatches seven slices across two lanes.',
    ''
  );
  return lines.join('\n');
}

function main() {
  const p = buildProposals();
  fs.writeFileSync(path.join(ROOT, OUT_MD), `${renderMarkdown(p)}\n`);
  fs.writeFileSync(
    path.join(ROOT, OUT_RECEIPT),
    `${JSON.stringify(
      {
        schema: 'founder_decision_proposals_receipt_v1',
        generated_at: new Date().toISOString(),
        produced_by: 'scripts/propose-founder-decisions.mjs',
        status: 'PROPOSALS_ONLY_NOT_RATIFIED',
        independent_reproduction_command: 'node scripts/propose-founder-decisions.mjs',
        document: OUT_MD,
        ...p,
      },
      null,
      2
    )}\n`
  );
  console.log(
    JSON.stringify(
      {
        tables_scanned: p.tables_scanned,
        stores: p.stores.length,
        stores_with_existing_candidates: p.stores_with_candidates,
        candidates: p.proposals.map((x) => ({ store: x.store, best: x.reuse_candidates[0]?.table ?? null })),
        cycle_repair_options: p.cycle_repairs.length,
        document: OUT_MD,
      },
      null,
      2
    )
  );
}

if (process.argv[1] && process.argv[1].endsWith('propose-founder-decisions.mjs')) {
  main();
}
