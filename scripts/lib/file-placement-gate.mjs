/**
 * SYNOPSIS: File-placement authority gate — blocks new protected source files
 * that lack an @ssot tag pointing to a registered product home or approved
 * shared authority.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { extractSsotTag } from './product-home-enforce.mjs';
import {
  LIVE_BUILD_QUEUE_REL,
  COLLECTIBLES_BUILD_QUEUE_REL,
  NEW_QUEUE_FORBIDDEN,
  isCanonicalLiveQueuePath,
  isLiveQueueLocation,
} from '../../config/live-build-queue.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(__dirname, '..', '..');

const PROTECTED_SOURCE_PREFIXES = [
  'routes/',
  'services/',
  'core/',
  'startup/',
  'middleware/',
  'config/',
  'scripts/',
  'factory-staging/factory-core/',
];

const PROTECTED_SOURCE_RE = /\.(js|mjs|cjs|ts)$/i;

const SHARED_AUTHORITY_PATHS = new Set([
  'docs/products/PRODUCT_REGISTRY.json',
  'docs/constitution/NORTH_STAR_SSOT.md',
]);

function normalize(p) {
  return String(p || '').replace(/^\.\//, '').replace(/\\/g, '/').replace(/^\//, '');
}

function isProtectedSource(rel) {
  const p = normalize(rel);
  if (!PROTECTED_SOURCE_RE.test(p)) return false;
  if (p.includes('docs/')) return false;
  return PROTECTED_SOURCE_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function getTrackedFilesSet(repoRoot) {
  try {
    const out = execSync('git ls-tree -r --name-only HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const set = new Set();
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) set.add(trimmed);
    }
    return set;
  } catch {
    return new Set();
  }
}

function loadProductRegistry(repoRoot) {
  const p = path.join(repoRoot, 'docs/products/PRODUCT_REGISTRY.json');
  try {
    const raw = readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    const products = new Map();
    for (const prod of json.products || []) {
      if (prod.product_id && prod.canonical_home) {
        products.set(prod.product_id, {
          product_id: prod.product_id,
          canonical_home: normalize(prod.canonical_home),
          file_manifest: prod.file_manifest ? normalize(prod.file_manifest) : null,
          law_path: prod.law_path ? normalize(prod.law_path) : null,
        });
      }
    }
    return { products, ok: true };
  } catch (err) {
    return { products: new Map(), ok: false, error: err?.message || String(err) };
  }
}

function loadSharedDependencies(repoRoot, productId) {
  const registry = loadProductRegistry(repoRoot);
  const prod = registry.products.get(productId);
  if (!prod?.file_manifest) return new Set();
  try {
    const json = JSON.parse(readFileSync(path.join(repoRoot, prod.file_manifest), 'utf8'));
    return new Set((json.shared_dependencies || []).map((d) => normalize(d.path || d)).filter(Boolean));
  } catch {
    return new Set();
  }
}

function extractProductIdFromHome(ssotNorm) {
  const m = ssotNorm.match(/^docs\/products\/([^/]+)\/PRODUCT_HOME\.md$/);
  return m ? m[1] : null;
}

function isAmendmentPath(p) {
  return /\/(AMENDMENT|AMENDMENT_)[^/]*$/i.test(p) || /\/AMENDMENT[^/]*\.md$/i.test(p);
}

function validateSsot(ssotNorm, repoRoot, registry) {
  if (SHARED_AUTHORITY_PATHS.has(ssotNorm)) {
    const abs = path.join(repoRoot, ssotNorm);
    if (!existsSync(abs)) {
      return {
        ok: false,
        kind: 'ssot_missing_target',
        reason: `@ssot points to shared authority ${ssotNorm}, which does not exist on disk`,
        proposed_solution: `Create ${ssotNorm} or fix the @ssot tag`,
      };
    }
    return { ok: true };
  }

  if (isAmendmentPath(ssotNorm)) {
    return {
      ok: false,
      kind: 'ssot_to_amendment',
      reason: 'Per AUTHORITY_BOUNDARIES.md, @ssot must point to a product PRODUCT_HOME.md or approved shared dependency, not an amendment file',
      proposed_solution: 'Change @ssot to docs/products/<product>/PRODUCT_HOME.md',
    };
  }

  const productId = extractProductIdFromHome(ssotNorm);
  if (!productId) {
    return {
      ok: false,
      kind: 'unexpected_ssot',
      reason: `@ssot ${ssotNorm} is not a recognized product home pattern`,
      proposed_solution: 'Use @ssot docs/products/<product>/PRODUCT_HOME.md where <product> is in PRODUCT_REGISTRY.json',
    };
  }

  const prod = registry.products.get(productId);
  if (!prod) {
    return {
      ok: false,
      kind: 'ssot_unregistered_product',
      reason: `Product "${productId}" from @ssot is not in PRODUCT_REGISTRY.json`,
      proposed_solution: 'Register the product in docs/products/PRODUCT_REGISTRY.json or use an existing product home',
    };
  }

  if (ssotNorm !== prod.canonical_home) {
    const shared = loadSharedDependencies(repoRoot, productId);
    if (shared.has(ssotNorm)) return { ok: true };
    return {
      ok: false,
      kind: 'ssot_not_canonical_home',
      reason: `Product ${productId} canonical home is ${prod.canonical_home}, but @ssot points to ${ssotNorm}`,
      proposed_solution: `Change @ssot to ${prod.canonical_home} or add ${ssotNorm} to the product's FILE_MANIFEST.json shared_dependencies`,
    };
  }

  const abs = path.join(repoRoot, ssotNorm);
  if (!existsSync(abs)) {
    return {
      ok: false,
      kind: 'ssot_missing_target',
      reason: `Product home ${ssotNorm} does not exist`,
      proposed_solution: `Create ${ssotNorm} or fix the @ssot tag`,
    };
  }

  return { ok: true };
}

/**
 * Evaluate a proposed commit batch for file-placement authority.
 *
 * @param {Array<{path?: string, target_file?: string, content?: string}>} fileEntries
 * @param {string} [repoRoot]
 * @param {object} [opts]
 * @param {Set<string>} [opts.trackedSet] — optional pre-computed tracked-file set
 * @param {string} [opts.commitMessage] — used to allow GAP-FILL with PLACEMENT_APPROVED
 * @returns {{ok: boolean, findings: Array<object>}}
 */
export function evaluateFilePlacement(fileEntries, repoRoot = ROOT, { trackedSet, commitMessage = '' } = {}) {
  const entries = Array.isArray(fileEntries) ? fileEntries : [];
  const registry = loadProductRegistry(repoRoot);
  const tracked = trackedSet || getTrackedFilesSet(repoRoot);
  const findings = [];

  const isGapFillApproved =
    String(commitMessage).startsWith('GAP-FILL:') &&
    /PLACEMENT_APPROVED:/i.test(commitMessage);

  for (const entry of entries) {
    const rel = normalize(entry?.path || entry?.target_file || '');
    if (!rel.endsWith('BUILD_QUEUE.json')) continue;
    if (entry?.delete === true || entry?.op === 'delete' || entry?.sha === null) continue;
    if (!isLiveQueueLocation(rel)) continue;
    const isNew = !tracked.has(rel);
    const collectiblesMint = isNew && (rel === COLLECTIBLES_BUILD_QUEUE_REL || rel.endsWith(`/${COLLECTIBLES_BUILD_QUEUE_REL}`));
    if (!isCanonicalLiveQueuePath(rel) || (isNew && !collectiblesMint)) {
      findings.push({
        path: rel,
        severity: 'error',
        kind: NEW_QUEUE_FORBIDDEN,
        reason: `Unauthorized BUILD_QUEUE.json. Legal live queues: ${LIVE_BUILD_QUEUE_REL} + ${COLLECTIBLES_BUILD_QUEUE_REL}. Refused '${rel}'. This is supposed to break.`,
        proposed_solution: `Only overlay updates or first mint of collectibles (factory-3) are legal. Archived queues stay in docs/history/product-build-queues/.`,
      });
    }
  }

  for (const entry of entries) {
    const rel = normalize(entry?.path || entry?.target_file || '');
    if (!rel || !isProtectedSource(rel)) continue;

    const isNew = !tracked.has(rel);
    if (!isNew) continue; // existing files are governed by incremental SSOT co-commit

    const content = entry?.content ?? entry?.output ?? '';
    if (content === '') continue; // deletions not gated here

    const ssot = extractSsotTag(String(content));
    if (!ssot) {
      findings.push({
        path: rel,
        severity: 'error',
        kind: 'missing_ssot',
        reason: 'New protected source file has no @ssot JSDoc tag pointing to its product home',
        proposed_solution: 'Add @ssot docs/products/<product>/PRODUCT_HOME.md and co-commit that product home',
      });
      continue;
    }

    const ssotNorm = normalize(ssot);
    const verdict = validateSsot(ssotNorm, repoRoot, registry);
    if (!verdict.ok) {
      if (isGapFillApproved && verdict.kind !== 'ssot_to_amendment') {
        // GAP-FILL with explicit PLACEMENT_APPROVED may override placement
        // registration gaps, but never the amendment-file prohibition.
        findings.push({
          path: rel,
          severity: 'warning',
          ...verdict,
          note: 'GAP-FILL + PLACEMENT_APPROVED override applied — commit still allowed but recorded as governance debt',
        });
      } else {
        findings.push({
          path: rel,
          severity: 'error',
          ...verdict,
        });
      }
    }
  }

  return {
    ok: findings.every((f) => f.severity !== 'error'),
    findings,
  };
}

export function formatFilePlacementFindings(findings = []) {
  return findings
    .map((f) => `- [${f.severity.toUpperCase()}][${f.kind}] ${f.path}: ${f.reason}${f.ssot ? ` (@ssot: ${f.ssot})` : ''}`)
    .join('\n');
}
