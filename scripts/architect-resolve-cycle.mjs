#!/usr/bin/env node
/**
 * SYNOPSIS: The Architect resolves a dependency cycle from evidence in the
 * blueprint itself, rather than asking the founder to choose a repair.
 *
 * Chair, 2026-08-11: "Have the Architect determine whether the router's build-time
 * dependency is truly semantically required... the system should prove that rather
 * than ask you to choose from implementation options."
 *
 * The proof is available and deterministic. Every module step in this blueprint
 * declares a `factory_signature`, and those signatures take their collaborators by
 * INJECTION:
 *
 *   createStrategyRouterService({ pool, logger, authorityLedger, taskOrchestrator })
 *   createReceiptLedgerService({ pool, logger })
 *
 * An injected collaborator is handed in at wiring time, so it does not need to
 * exist for the module to be authored. And a step that declares a dependency on a
 * module which appears nowhere in its own signature has no relationship to it at
 * all — the edge is unsupported by the step's own contract.
 *
 * So the rule this applies is narrow and checkable: for a module step whose
 * contract declares a factory signature, an edge to another module step is
 * build-time required only if that step's export appears in the signature. Edges
 * that fail this test are removed; edges that pass are preserved even though
 * injection technically permits removing those too, because preserving them costs
 * one wave and keeps the author's stated collaboration order intact.
 *
 * The Architect proposes; the graph is then re-validated and the plan must be
 * resealed by all three offices. This script never seals anything.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findCycles, scheduleWaves } from './plan-topology.mjs';
import { stepDependencies } from '../config/step-dependencies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/ARCHITECT_CYCLE_RESOLUTION_RECEIPT.json';

const MODULE_TYPES = new Set(['esm', 'cjs', 'esm_script', 'module']);

function stepId(s) {
  return s?.id || s?.step_id || null;
}

/** Identifier a collaborator would appear as in an injection signature. */
function injectionNames(step) {
  const exports = step?.contract?.exports || [];
  const names = new Set();
  for (const e of exports) {
    const base = String(e).replace(/Service$|Store$|Ledger$|Registry$/, '');
    names.add(String(e));
    names.add(String(e)[0].toLowerCase() + String(e).slice(1));
    names.add(base[0]?.toLowerCase() + base.slice(1));
  }
  const file = step?.file || '';
  const stem = path.basename(file).replace(/\.(m?js|ts)$/, '').replace(/-service$/, '');
  if (stem) {
    names.add(stem.replace(/-([a-z])/g, (_, c) => c.toUpperCase()));
  }
  return [...names].filter(Boolean);
}

/**
 * Decide, with evidence, whether an edge is required to BUILD the dependent step.
 */
export function classifyEdge(fromStep, toStep) {
  const signature = fromStep?.contract?.factory_signature || '';
  const dependentIsModule = MODULE_TYPES.has(fromStep?.type);
  const targetIsModule = MODULE_TYPES.has(toStep?.type);

  if (!dependentIsModule || !targetIsModule) {
    return {
      required: true,
      basis: 'non_module_step',
      detail: 'at least one end is not a module, so no injection argument applies and the edge is left alone',
    };
  }
  if (!signature) {
    return {
      required: true,
      basis: 'no_signature_evidence',
      detail: 'the dependent step declares no factory signature, so there is no evidence the collaborator is injected — left alone, fail-closed',
    };
  }

  const candidates = injectionNames(toStep);
  const injected = candidates.find((name) => new RegExp(`\\b${name}\\b`).test(signature));
  if (injected) {
    return {
      required: true,
      basis: 'injected_collaborator',
      detail: `\`${injected}\` is an injected parameter of \`${signature.slice(0, 90)}\`, so the collaboration is real; the edge is preserved to keep the author's stated order`,
      injected_as: injected,
    };
  }
  return {
    required: false,
    basis: 'absent_from_signature',
    detail: `nothing resembling ${candidates.slice(0, 3).map((c) => `\`${c}\``).join(' / ')} appears in \`${signature.slice(0, 90)}\` — the dependent step's own contract describes no relationship with this module, so the edge is not build-time required`,
    signature,
    looked_for: candidates,
  };
}

export function resolveCycles(blueprint) {
  const steps = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  const byId = new Map(steps.map((s) => [stepId(s), s]));
  const nodes = steps.map((s) => ({ id: stepId(s), depends_on: stepDependencies(s) }));
  const cycles = findCycles(nodes);

  if (cycles.length === 0) {
    return { resolved: true, cycles: [], removed_edges: [], preserved_edges: [], detail: 'graph is already acyclic' };
  }

  const cyclic = new Set(cycles.flat());
  const removed = [];
  const preserved = [];

  // Only edges INSIDE a cycle are candidates. An edge that is not part of any knot
  // is not this pass's business, however removable it might be.
  for (const id of cyclic) {
    for (const dep of stepDependencies(byId.get(id))) {
      if (!cyclic.has(dep)) continue;
      const verdict = classifyEdge(byId.get(id), byId.get(dep));
      const edge = { from: id, to: dep, ...verdict };
      if (verdict.required) preserved.push(edge);
      else removed.push(edge);
    }
  }

  const repairedNodes = nodes.map((n) => ({
    id: n.id,
    depends_on: n.depends_on.filter((d) => !removed.some((r) => r.from === n.id && r.to === d)),
  }));
  const remainingCycles = findCycles(repairedNodes);
  const schedule = scheduleWaves(repairedNodes);

  return {
    resolved: remainingCycles.length === 0,
    cycles: cycles.map((members) => ({ members })),
    removed_edges: removed,
    preserved_edges: preserved,
    remaining_cycles: remainingCycles,
    repaired_graph: repairedNodes,
    waves_after_repair: schedule.waves,
    unschedulable_after_repair: schedule.unschedulable,
    repair_class: removed.length === 0 ? 'NO_LAWFUL_REPAIR_FOUND' : 'LOWEST_COMPLEXITY_EDGE_REMOVAL',
    // Escalation is only correct if the evidence runs out, not if it is merely
    // inconvenient. That is the whole point of the threshold.
    escalation_required: remainingCycles.length > 0,
    escalation_reason:
      remainingCycles.length > 0
        ? 'edges inside the remaining knot are all supported by injected collaborators, so breaking one changes stated intent — that is an architectural decision with materially different outcomes'
        : null,
  };
}

function main() {
  const fixture = path.join(
    ROOT,
    'docs/products/builderos/fixtures/intake-regression-2026-08-11/SESSION_000146ae_ready_invented_architecture.json'
  );
  const session = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const blueprint = (session.session || session).blueprint_json;
  const result = resolveCycles(blueprint);

  fs.writeFileSync(
    path.join(ROOT, RECEIPT_REL),
    `${JSON.stringify(
      {
        schema: 'architect_cycle_resolution_receipt_v1',
        generated_at: new Date().toISOString(),
        produced_by: 'scripts/architect-resolve-cycle.mjs',
        authority: 'architect',
        seals_nothing: 'the repaired graph must be re-validated and resealed by conductor, architect and builder',
        independent_reproduction_command: 'node scripts/architect-resolve-cycle.mjs',
        ...result,
      },
      null,
      2
    )}\n`
  );

  console.log(
    JSON.stringify(
      {
        resolved: result.resolved,
        cycles_found: result.cycles.length,
        edges_removed: result.removed_edges.map((e) => `${e.from} -> ${e.to}`),
        edges_preserved: result.preserved_edges.map((e) => `${e.from} -> ${e.to} (${e.injected_as})`),
        waves_after_repair: result.waves_after_repair?.length ?? 0,
        escalation_required: result.escalation_required,
      },
      null,
      2
    )
  );
  if (!result.resolved) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('architect-resolve-cycle.mjs')) {
  main();
}
