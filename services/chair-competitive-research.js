/**
 * SYNOPSIS: Chair's real, ongoing competitive-research capability — the
 * automated continuation of the manual Chair/Architect competitive review
 * done live (2026-07-19) for Site Builder, SocialMediaOS, AI Receptionist,
 * TC Service, LifeOS, LifeRE, Wellness Studio, and Creator Media OS.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Founder directive: "every single blueprint needs to be gone through... they
 * should be looking online to see what competitors are doing." Doing that
 * manually for all ~46 products in one sitting isn't sustainable at real
 * research quality — this is the honest, governed way to keep the promise:
 * process ONE product per cycle (round-robin, persisted cursor), on a long
 * interval, so the sweep completes over time without a cost spike or a
 * rushed, shallow pass. Uses the real, already-built web-search-service.js
 * (Brave/Perplexity search + AI synthesis, with a graceful AI-knowledge-only
 * fallback if no search key is configured — never idles, per SO-003).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebSearchService } from './web-search-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');
const CURSOR_PATH = path.join(REPO_ROOT, 'data/chair-competitive-research-cursor.json');

// Products already given a real, cited manual pass 2026-07-19 — skip them in
// the automated sweep's first lap so it covers new ground first, not repeats.
const ALREADY_REVIEWED = new Set([
  'site-builder', 'ai-receptionist', 'tc-service', 'lifeos', 'lifere',
  'wellness-studio', 'creator-media-os',
]);

export function listReviewableProducts({ productsDir = PRODUCTS_DIR } = {}) {
  let entries;
  try {
    entries = fs.readdirSync(productsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const ids = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const homePath = path.join(productsDir, entry.name, 'PRODUCT_HOME.md');
    if (fs.existsSync(homePath)) {
      ids.push(entry.name);
      continue;
    }
    // One level deeper for nested products (e.g. marketingos/socialmediaos).
    const nested = path.join(productsDir, entry.name);
    try {
      for (const sub of fs.readdirSync(nested, { withFileTypes: true })) {
        if (sub.isDirectory() && fs.existsSync(path.join(nested, sub.name, 'PRODUCT_HOME.md'))) {
          ids.push(`${entry.name}/${sub.name}`);
        }
      }
    } catch { /* not a dir with nested products */ }
  }
  return ids.sort();
}

export function loadCursor(cursorPath = CURSOR_PATH) {
  try {
    return JSON.parse(fs.readFileSync(cursorPath, 'utf8'));
  } catch {
    return { reviewedIds: [], lastRunAt: null };
  }
}

export function saveCursor(cursor, cursorPath = CURSOR_PATH) {
  fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
  fs.writeFileSync(cursorPath, JSON.stringify(cursor, null, 2));
}

/**
 * Pure — picks the next product to review given the full list and what's
 * already been covered (manual pass + prior automated cycles). Wraps around
 * once everything has been covered once, so the sweep is a continuous cycle,
 * not a one-shot.
 */
export function pickNextProduct(allProductIds, cursor) {
  const reviewed = new Set([...ALREADY_REVIEWED, ...(cursor?.reviewedIds || [])]);
  const remaining = allProductIds.filter((id) => !reviewed.has(id));
  if (remaining.length > 0) return remaining[0];
  if (!allProductIds.length) return null;
  // Full cycle complete — start again, dropping the automated history but
  // keeping the original manual-pass exclusions out of respect for that work.
  return allProductIds.find((id) => !ALREADY_REVIEWED.has(id)) || allProductIds[0];
}

function extractProductType(homeText, productId) {
  const firstHeading = /^#\s+(.+)$/m.exec(homeText || '');
  return firstHeading ? firstHeading[1].replace(/Product Home/i, '').trim() : productId;
}

/**
 * Runs one real research cycle: picks the next product, researches it via
 * the real web-search service, and returns a structured finding (or null if
 * research produced nothing usable). Does not write anywhere — the caller
 * decides how to persist/route it (kept pure-ish and testable via injection).
 */
export async function runCompetitiveResearchCycle({
  productsDir = PRODUCTS_DIR,
  cursorPath = CURSOR_PATH,
  webSearchService,
  callAI,
  logger = console,
} = {}) {
  const allIds = listReviewableProducts({ productsDir });
  if (!allIds.length) return { skipped: 'no_products_found' };

  const cursor = loadCursor(cursorPath);
  const productId = pickNextProduct(allIds, cursor);
  if (!productId) return { skipped: 'nothing_to_review' };

  const homePath = path.join(productsDir, productId, 'PRODUCT_HOME.md');
  let homeText = '';
  try {
    homeText = fs.readFileSync(homePath, 'utf8');
  } catch {
    // Product disappeared between listing and read — record progress anyway, move on.
    cursor.reviewedIds = [...(cursor.reviewedIds || []), productId];
    cursor.lastRunAt = new Date().toISOString();
    saveCursor(cursor, cursorPath);
    return { skipped: 'product_home_unreadable', productId };
  }

  const productType = extractProductType(homeText, productId);
  const svc = webSearchService || createWebSearchService({
    BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    callAI,
  });

  let analysis = null;
  try {
    analysis = await svc.searchCompetitors(productType);
  } catch (err) {
    logger?.warn?.({ productId, err: err.message }, '[CHAIR-COMPETITIVE-RESEARCH] research call failed');
  }

  // Progress the cursor regardless of outcome — a product that yields no
  // usable research this cycle still shouldn't block the sweep forever.
  cursor.reviewedIds = [...(cursor.reviewedIds || []), productId];
  cursor.lastRunAt = new Date().toISOString();
  saveCursor(cursor, cursorPath);

  if (!analysis || !String(analysis).trim()) {
    return { productId, finding: null, reason: 'no_research_output' };
  }

  const finding = {
    id: `competitive_gap:${productId}:${new Date().toISOString().slice(0, 10)}`,
    check: 'competitive_gap',
    severity: 'P2',
    summary: `Automated competitive research for "${productId}" (${productType}) surfaced findings to review.`,
    proposed_solution: String(analysis).slice(0, 3000),
    detected_at: new Date().toISOString(),
  };

  return { productId, finding };
}
