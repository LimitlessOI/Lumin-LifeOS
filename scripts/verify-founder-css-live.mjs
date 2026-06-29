#!/usr/bin/env node
/**
 * SYNOPSIS: Live founder CSS pipeline smoke — verifies overlay HTML does NOT contain test yellow unless requested.
 * Live founder CSS pipeline smoke — verifies overlay HTML does NOT contain test yellow unless requested.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import 'dotenv/config';

const base = (
  process.env.PUBLIC_BASE_URL
  || process.env.BUILDER_BASE_URL
  || ''
).replace(/\/$/, '');

const YELLOW = '#ffeb3b';

async function fetchOverlay(path) {
  const url = `${base}${path}?probe=${Date.now()}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, url };
}

async function main() {
  if (!base) {
    console.error('Set PUBLIC_BASE_URL');
    process.exit(2);
  }
  const checks = [
    '/overlay/lifeos-dashboard.html',
    '/overlay/lifeos-app.html',
    '/overlay/lifeos-theme-overrides.css',
    '/overlay/sw.js',
  ];
  let fail = 0;
  for (const path of checks) {
    const hit = await fetchOverlay(path);
    if (!hit.ok) {
      console.error(`FAIL fetch ${path}: HTTP ${hit.status}`);
      fail += 1;
      continue;
    }
    const hasYellow = hit.text.toLowerCase().includes(YELLOW);
    console.log(`${hasYellow ? 'WARN' : 'OK'} ${path} yellow_token=${hasYellow}`);
    if (path.includes('dashboard') || path.includes('app')) {
      if (hasYellow) {
        console.error(`  Baseline should be dark bubbles before founder test — found ${YELLOW} in ${path}`);
        fail += 1;
      }
    }
  }
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
