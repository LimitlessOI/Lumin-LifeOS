#!/usr/bin/env node
/**
 * SYNOPSIS: Local/tip helper — crawl ClientCare site map (deep button/field inventory).
 * Usage: CLIENTCARE_* env set → node scripts/clientcare-site-map-crawl.mjs
 * Or: CC_SITE_MAP_ARGS='{"scope":"billing","maxPages":35}' node scripts/clientcare-site-map-crawl.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClientCareBrowserService } from '../services/clientcare-browser-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/products/clientcare-billing-recovery/CLIENTCARE_SITE_MAP/evidence');

async function main() {
  let args = {};
  try {
    args = JSON.parse(process.env.CC_SITE_MAP_ARGS || '{}');
  } catch (_) {
    args = {};
  }
  const scope = args.scope || process.env.CC_SITE_MAP_SCOPE || 'billing';
  const maxPages = Number(args.maxPages || args.max_pages || 35);
  const svc = createClientCareBrowserService({ logger: console });
  const result = await svc.crawlSiteMap({
    scope,
    maxPages,
    pageTimeoutMs: Number(args.pageTimeoutMs || 25000),
    seedHrefs: args.seedHrefs || null,
  });
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `crawl-${scope}-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  const slim = {
    ok: result.ok,
    scope: result.scope,
    pageCount: result.pageCount,
    pages: (result.pages || []).map((p) => ({
      ok: p.ok,
      url: p.url || p.href,
      title: p.title,
      error: p.error,
      buttonCount: p.buttonCount,
      inputCount: p.inputCount,
      selectCount: p.selectCount,
      buttons: (p.buttons || []).slice(0, 40).map((b) => b.text || b.id),
      headings: p.headings,
    })),
  };
  console.log(JSON.stringify(slim, null, 2));
  console.error(`wrote ${outPath}`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
