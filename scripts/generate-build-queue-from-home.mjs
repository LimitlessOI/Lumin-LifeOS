/**
 * SYNOPSIS: Spec/intention → queue generator — PRODUCT_HOME backlog → validated
 * product_build_queue_v1. Wave 0 item 15. Mechanical + fail-closed; imports
 * extractBacklog / validatePlannedQueue / planBuildQueue from build-queue-planner
 * (does not reinvent the planner). --deterministic needs no API keys.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractBacklog,
  backlogSignature,
  normalizePlannedStep,
  validatePlannedQueue,
  planBuildQueue,
  shouldFlagDesignReview,
} from '../services/build-queue-planner.js';
import { STEP_STATUS } from '../services/product-build-orchestrator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_STEPS = 12;

/** Repo-relative path mentioned in a backlog bullet (never invents a path). */
const PATH_IN_BULLET =
  /(?:^|[\s`"'(])((?:services|routes|scripts|db\/migrations|public\/overlay|config|startup|middleware|factory-staging|docs\/products)\/[\w./-]+\.(?:js|mjs|cjs|ts|tsx|sql|html|json|md))/i;

const UI_BULLET_PATH = /\b(customi[sz]ation panel|client-facing customi[sz]|customi[sz]e\.html)\b/i;

/**
 * @param {string} bullet
 * @returns {string|null}
 */
export function guessTargetFileFromBullet(bullet) {
  const m = String(bullet || '').match(PATH_IN_BULLET);
  if (m) return m[1];
  if (UI_BULLET_PATH.test(String(bullet || ''))) {
    return 'public/overlay/customize.html';
  }
  return null;
}

/**
 * Placeholder target when the bullet has no concrete path — founder must gate
 * before the orchestrator can treat it as buildable code.
 * @param {string} productId
 * @returns {string}
 */
export function founderGatedPlaceholderPath(productId) {
  return `docs/products/${productId}/FOUNDER_GATED_INTENTION.md`;
}

function slugify(value, fallback) {
  const s = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || fallback;
}

/**
 * Turn documented backlog bullets into pending steps without a model.
 * Pathless bullets become human_hold (FOUNDER_GATED); UI paths get design_review_flagged pending.
 *
 * @param {{ productId: string, backlog: string[], existingSteps?: object[], maxSteps?: number, verifyScript?: string|null }} opts
 * @returns {{ queue: object, added: object[] }|null}
 */
export function deterministicQueueFromBacklog({
  productId,
  backlog,
  existingSteps = [],
  maxSteps = MAX_STEPS,
  verifyScript = null,
} = {}) {
  if (!productId) return null;
  const items = (Array.isArray(backlog) ? backlog : [])
    .map((s) => String(s || '').trim())
    .filter((s) => s.length >= 6);
  if (!items.length) return null;

  const existing = Array.isArray(existingSteps) ? existingSteps : [];
  const existingIds = new Set(existing.map((s) => s.id));
  const existingFingerprints = new Set(
    existing.map((s) => `${s.target_file}::${s.task}`.toLowerCase()),
  );
  const doneFileSet = new Set(
    existing
      .filter((s) => s.status === STEP_STATUS.DONE && s.target_file)
      .map((s) => String(s.target_file).toLowerCase()),
  );

  const added = [];
  for (let i = 0; i < items.length && added.length < maxSteps; i++) {
    const item = items[i];
    const guessed = guessTargetFileFromBullet(item);
    const target_file = guessed || founderGatedPlaceholderPath(productId);
    const raw = {
      id: slugify(item, `${productId}-step-${existing.length + i + 1}`),
      target_file,
      task: item.slice(0, 240),
      spec: item,
      depends_on: [],
      human_hold: !guessed,
    };
    const step = normalizePlannedStep(raw, productId, existing.length + i);
    if (!step) continue;
    if (!guessed) {
      step.human_hold = true;
      step.founder_gated = true;
      step.status = STEP_STATUS.FOUNDER_GATED;
      step.design_review_flagged = false;
    } else if (shouldFlagDesignReview(step)) {
      step.design_review_flagged = true;
      step.status = STEP_STATUS.PENDING;
      step.founder_gated = false;
      step.human_hold = false;
    }
    const fp = `${step.target_file}::${step.task}`.toLowerCase();
    if (existingIds.has(step.id) || existingFingerprints.has(fp)) continue;
    if (guessed && doneFileSet.has(String(step.target_file).toLowerCase())) continue;
    let uid = step.id;
    let n = 2;
    while (existingIds.has(uid)) uid = `${step.id}-${n++}`;
    step.id = uid;
    existingIds.add(uid);
    existingFingerprints.add(fp);
    added.push(step);
  }

  if (!added.length && !existing.length) return null;

  const queue = {
    schema: 'product_build_queue_v1',
    product_id: productId,
    ...(verifyScript
      ? { verify_script: verifyScript }
      : {}),
    planned_at: new Date().toISOString(),
    backlog_signature: backlogSignature(items),
    planner_mode: 'deterministic',
    steps: [...existing, ...added],
  };

  const check = validatePlannedQueue(queue);
  if (!check.ok) return null;
  return { queue, added, source: 'deterministic' };
}

/**
 * Fail-closed: a write must not drop or demote any existing `done` step.
 * @param {object|null} existing
 * @param {object} next
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assertSafeQueueWrite(existing, next) {
  const errors = [];
  if (!next || next.schema !== 'product_build_queue_v1') {
    errors.push('next queue missing product_build_queue_v1 schema');
    return { ok: false, errors };
  }
  const prev = Array.isArray(existing?.steps) ? existing.steps : [];
  const nextById = new Map((next.steps || []).map((s) => [s.id, s]));
  for (const s of prev) {
    if (s.status !== STEP_STATUS.DONE) continue;
    const n = nextById.get(s.id);
    if (!n) {
      errors.push(`would drop done step ${s.id}`);
      continue;
    }
    if (n.status !== STEP_STATUS.DONE) {
      errors.push(`would demote done step ${s.id} to ${n.status}`);
    }
    if (s.target_file && n.target_file && s.target_file !== n.target_file) {
      errors.push(`would change target_file of done step ${s.id}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Resolve product paths under docs/products/<id>/.
 * @param {string} productId
 * @param {string} [root]
 */
export function productPaths(productId, root = ROOT) {
  const dir = path.join(root, 'docs/products', productId);
  return {
    dir,
    homePath: path.join(dir, 'PRODUCT_HOME.md'),
    queuePath: path.join(dir, 'BUILD_QUEUE.json'),
  };
}

/**
 * Generate a validated queue from PRODUCT_HOME intention.
 *
 * @param {{
 *   productId: string,
 *   root?: string,
 *   deterministic?: boolean,
 *   callModel?: Function,
 *   homeText?: string,
 *   existingQueue?: object|null,
 *   verifyScript?: string|null,
 *   dryRun?: boolean,
 *   write?: boolean,
 * }} opts
 * @returns {Promise<{ ok: boolean, detail: string, queue?: object, added?: object[], errors?: string[], source?: string, wrote?: boolean }>}
 */
export async function generateBuildQueueFromHome(opts = {}) {
  const productId = String(opts.productId || '').trim();
  if (!productId) {
    return { ok: false, detail: 'product_required', errors: ['--product=<id> is required'] };
  }
  const root = opts.root || ROOT;
  const { homePath, queuePath } = productPaths(productId, root);

  let homeText = opts.homeText;
  if (homeText == null) {
    if (!fs.existsSync(homePath)) {
      return { ok: false, detail: 'home_missing', errors: [`PRODUCT_HOME.md not found: ${homePath}`] };
    }
    homeText = fs.readFileSync(homePath, 'utf8');
  }

  let existingQueue = opts.existingQueue;
  if (existingQueue === undefined) {
    existingQueue = null;
    if (fs.existsSync(queuePath)) {
      try {
        existingQueue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      } catch (e) {
        return { ok: false, detail: 'existing_queue_invalid', errors: [e.message] };
      }
    }
  }

  const backlog = extractBacklog(homeText);
  if (!backlog.length) {
    return {
      ok: false,
      detail: 'no_backlog',
      errors: ['no documented backlog/phase specs under PRODUCT_HOME — refuse to fabricate'],
    };
  }

  const verifyScript =
    opts.verifyScript ??
    existingQueue?.verify_script ??
    null;
  const existingSteps = Array.isArray(existingQueue?.steps) ? existingQueue.steps : [];
  // Prefer deterministic when requested or when no callModel is injected.
  // Model path only when callModel is present AND deterministic is explicitly false.
  const useDeterministic =
    opts.deterministic === true ||
    (opts.deterministic !== false && typeof opts.callModel !== 'function');

  let planned = null;
  if (useDeterministic) {
    planned = deterministicQueueFromBacklog({
      productId,
      backlog,
      existingSteps,
      verifyScript,
    });
    if (!planned) {
      return {
        ok: false,
        detail: 'deterministic_produced_no_queue',
        errors: ['deterministic planner produced no valid steps (all filtered or invalid)'],
      };
    }
  } else {
    if (typeof opts.callModel !== 'function') {
      return {
        ok: false,
        detail: 'no_call_model',
        errors: ['model mode requires an injected callModel (fail closed)'],
      };
    }
    planned = await planBuildQueue({
      productId,
      homeText,
      existingQueue,
      verifyScript,
      callModel: opts.callModel,
    });
    if (!planned?.queue) {
      return {
        ok: false,
        detail: 'plan_produced_no_queue',
        errors: ['model planner returned null — fail closed'],
      };
    }
  }

  const check = validatePlannedQueue(planned.queue);
  if (!check.ok) {
    return { ok: false, detail: 'invalid_queue', errors: check.errors };
  }

  const safe = assertSafeQueueWrite(existingQueue, planned.queue);
  if (!safe.ok) {
    return { ok: false, detail: 'would_clobber_done', errors: safe.errors };
  }

  const dryRun = Boolean(opts.dryRun) || opts.write === false;
  if (!dryRun && opts.write !== false) {
    fs.mkdirSync(path.dirname(queuePath), { recursive: true });
    fs.writeFileSync(queuePath, `${JSON.stringify(planned.queue, null, 2)}\n`);
  }

  return {
    ok: true,
    detail: dryRun ? 'validated_dry_run' : 'queue_written',
    queue: planned.queue,
    added: planned.added,
    source: planned.source || (useDeterministic ? 'deterministic' : 'planner'),
    wrote: !dryRun,
    queuePath,
    backlog_count: backlog.length,
  };
}

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const out = {
    product: null,
    deterministic: true,
    withModel: false,
    dryRun: false,
    help: false,
  };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--deterministic') out.deterministic = true;
    else if (a === '--with-model') {
      out.withModel = true;
      out.deterministic = false;
    } else if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--product=')) out.product = a.slice('--product='.length).trim();
    else if (a === '--product') out._needProduct = true;
    else if (out._needProduct) {
      out.product = a.trim();
      out._needProduct = false;
    }
  }
  delete out._needProduct;
  return out;
}

function printHelp() {
  console.log(`Usage: npm run build-queue:from-home -- --product=<id> [--deterministic|--with-model] [--dry-run]

Wave 0 item 15 — Spec/intention → queue generator.

  --product=<id>     Product dir under docs/products/ (required)
  --deterministic    Default. Backlog bullets → steps; pathless → human_hold; UI → design_review_flagged pending
  --with-model       Use planBuildQueue (requires programmatic callModel; CLI fails closed without it)
  --dry-run          Validate only; do not write BUILD_QUEUE.json

Exit 1 on: missing product/home, no backlog, invalid queue, or write that would clobber done steps.
`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (!args.product) {
    console.error('FAIL: --product=<id> is required');
    printHelp();
    return 1;
  }
  if (args.withModel) {
    console.error('FAIL: --with-model on CLI has no injected callModel — use --deterministic or call generateBuildQueueFromHome({ callModel }) programmatically');
    return 1;
  }

  const result = await generateBuildQueueFromHome({
    productId: args.product,
    deterministic: true,
    dryRun: args.dryRun,
    write: !args.dryRun,
  });

  if (!result.ok) {
    console.error(`FAIL: ${result.detail}`);
    for (const e of result.errors || []) console.error(`  - ${e}`);
    return 1;
  }

  console.log(
    `PASS: ${result.detail} product=${args.product} source=${result.source} backlog=${result.backlog_count} steps=${result.queue.steps.length} added=${result.added.length}${result.wrote ? ` wrote=${result.queuePath}` : ''}`,
  );
  return 0;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().then((code) => process.exit(code));
}