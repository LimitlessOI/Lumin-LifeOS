#!/usr/bin/env node
/**
 * SYNOPSIS: Architect seal for product print sequences on the ONE manufacturing queue.
 *
 * Founder (2026-08-13): if sealed Collectibles print is required for the system
 * to build, Architect must own it — Cursor hand-sealing in config is SO-001 drift
 * and makes manufacturing Cursor-dependent.
 *
 * Usage:
 *   node scripts/architect-seal-print-sequence.mjs --product collectibles --from-amended-blueprint
 *   node scripts/architect-seal-print-sequence.mjs --product collectibles --from-json path/to/steps.json
 *
 * Writes: docs/products/<product>/PRINT_SEQUENCE.json
 * Does NOT mint a second BUILD_QUEUE.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sealPrintSequence, printSequenceArtifactPath } from '../services/architect-print-seal.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage(code = 1) {
  console.error(`Usage:
  node scripts/architect-seal-print-sequence.mjs --product <id> --from-amended-blueprint
  node scripts/architect-seal-print-sequence.mjs --product <id> --from-json <steps.json>
Amended blueprint path (default): products/artifacts/<PRODUCT>_AMENDED_BLUEPRINT.json`);
  process.exit(code);
}

function parseArgs(argv) {
  const out = { product: '', fromAmended: false, fromJson: '', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--product') out.product = String(argv[++i] || '').trim();
    else if (a === '--from-amended-blueprint') out.fromAmended = true;
    else if (a === '--from-json') out.fromJson = String(argv[++i] || '').trim();
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function collectiblesPrintStep(partial) {
  return {
    status: 'pending',
    founder_gated: false,
    attempts: 0,
    action_type: 'author_then_write',
    product_id: 'collectibles',
    blueprint_id: 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
    mission_id: 'PRODUCT-universal-overlay',
    source: 'docs/products/collectibles/MASTER_BLUEPRINT.md — Architect-sealed print',
    depends_on: [],
    ...partial,
    blueprint_step_id: partial.id,
  };
}

/**
 * Project sealed print steps from an Overlay-shaped amended blueprint JSON.
 * Mechanical: no model call. Architect jurisdiction = order + files from BP.
 */
export function stepsFromAmendedBlueprint(blueprint, { productId }) {
  const raw = Array.isArray(blueprint?.steps) ? blueprint.steps : [];
  if (!raw.length) throw new Error('amended blueprint has no steps[]');
  return raw.map((s, i) => {
    const id = String(s.id || s.step_id || '').trim();
    const target_file = String(s.target_file || s.file || '').trim();
    if (!id || !target_file) throw new Error(`blueprint step[${i}] missing id/target_file`);
    const deps = s.depends_on || s.deps || [];
    const base = {
      id,
      target_file,
      sandbox_boundary: s.sandbox_boundary || `${target_file.split('/')[0]}/**`,
      task: s.task || s.purpose || `Manufacture ${id} from sealed blueprint`,
      spec: s.spec || s.contract?.summary || `Architect-sealed from ${productId} amended blueprint`,
      depends_on: Array.isArray(deps) ? deps.map(String) : [],
      expected_exports: s.expected_exports || s.contract?.exports || undefined,
      file_contains: s.file_contains || s.contract?.file_contains || undefined,
      behavior_assertions: s.behavior_assertions || undefined,
    };
    if (productId === 'collectibles') return collectiblesPrintStep(base);
    return {
      status: 'pending',
      founder_gated: false,
      attempts: 0,
      action_type: 'author_then_write',
      product_id: productId,
      blueprint_id: 'PRODUCT-UNIVERSAL-OVERLAY-BUILD-QUEUE-TWIN-V1',
      mission_id: `PRODUCT-${productId}`,
      source: `docs/products/${productId}/MASTER_BLUEPRINT.md — Architect-sealed print`,
      depends_on: [],
      ...base,
      blueprint_step_id: id,
    };
  });
}

function loadSteps(args) {
  if (args.fromJson) {
    const abs = path.resolve(ROOT, args.fromJson);
    const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const steps = Array.isArray(parsed) ? parsed : parsed.steps;
    if (!Array.isArray(steps) || !steps.length) throw new Error(`no steps in ${abs}`);
    return {
      steps,
      source_docs: parsed.source_docs || [`from-json:${args.fromJson}`],
      honesty: {
        rule: 'Architect seal from provided JSON. Chat must not edit PRINT_SEQUENCE.json directly.',
        input: args.fromJson,
      },
    };
  }
  if (args.fromAmended) {
    const productKey = String(args.product).toUpperCase().replace(/-/g, '_');
    const candidates = [
      path.join(ROOT, 'products/artifacts', `${productKey}_AMENDED_BLUEPRINT.json`),
      path.join(ROOT, 'products/artifacts', `${args.product}_AMENDED_BLUEPRINT.json`),
      path.join(ROOT, 'docs/products', args.product, 'AMENDED_BLUEPRINT.json'),
    ];
    const hit = candidates.find((p) => fs.existsSync(p));
    if (!hit) {
      throw new Error(
        `ARCHITECT_PRINT_SEAL_REQUIRED: no amended blueprint for ${args.product}. `
        + `Expected one of: ${candidates.map((p) => path.relative(ROOT, p)).join(', ')}. `
        + `Architect must produce machine-readable BP before sealing print — do not Cursor-edit config.`,
      );
    }
    const blueprint = JSON.parse(fs.readFileSync(hit, 'utf8'));
    return {
      steps: stepsFromAmendedBlueprint(blueprint, { productId: args.product }),
      source_docs: [path.relative(ROOT, hit), `docs/products/${args.product}/MASTER_BLUEPRINT.md`],
      honesty: {
        rule: 'Architect seal projected mechanically from amended blueprint. No chat authorship.',
        amended_blueprint: path.relative(ROOT, hit),
      },
    };
  }
  usage(1);
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);
  if (!args.product) usage(1);
  const { steps, source_docs, honesty } = loadSteps(args);
  const result = sealPrintSequence({
    productId: args.product,
    steps,
    source_docs,
    honesty,
  });
  console.log(JSON.stringify({
    ok: true,
    ...result,
    artifact: printSequenceArtifactPath(args.product),
    law: 'Cursor must not edit PRINT_SEQUENCE.json; only this Architect seal path may write it.',
  }, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }
}
