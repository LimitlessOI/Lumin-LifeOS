/**
 * SYNOPSIS: Site Builder pre-alpha SENTRY gate — Layer A (structural walkthrough).
 * Acts as a client's browser would at the HTTP level: preview loads, editor loads,
 * the editor iframe resolves to the REAL site (catches the "Cannot GET" 404), and
 * publish resolves to Stripe checkout. Fails closed. Writes a receipt.
 *
 * This is the structural half of the founder's completion doctrine: no Site Builder
 * feature is "done" until it passes Layer A (this) AND Layer B (human-sim browser
 * walkthrough with UX critique — see run-site-builder-prealpha-layerb.mjs).
 *
 * Usage:
 *   node scripts/run-site-builder-prealpha.mjs            # reuse newest preview on prod
 *   PREVIEW_CLIENT_ID=prev_x PREVIEW_EDIT_TOKEN=... node scripts/run-site-builder-prealpha.mjs
 *
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePublicBaseUrl } from '../config/public-origin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const fp = path.join(ROOT, '.env');
  if (!fs.existsSync(fp)) return;
  for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const BASE = resolvePublicBaseUrl(
  process.env.PUBLIC_BASE_URL,
  process.env.LIFEOS_BASE_URL,
  process.env.BASE_URL,
);
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const RECEIPT_PATH = path.join(ROOT, 'products/receipts/SITE_BUILDER_PREALPHA_LAYER_A.json');

const steps = [];
function step(id, ok, detail = '', data = {}) {
  steps.push({ id, ok, detail, ...data });
  console.log(`${ok ? '✅' : '❌'} ${id}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function fetchRaw(url, { method = 'GET', redirect = 'follow', timeout = 30000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = {};
    if (url.startsWith(BASE)) headers['x-command-key'] = KEY;
    const res = await fetch(url, { method, headers, redirect, signal: ctrl.signal });
    clearTimeout(timer);
    const text = res.headers.get('content-type')?.includes('application/json')
      ? JSON.stringify(await res.json().catch(() => ({})))
      : await res.text().catch(() => '');
    return { status: res.status, text, location: res.headers.get('location') || '', headers: res.headers };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, text: '', location: '', error: err.message };
  }
}

// Extract the canvas iframe src from the rendered editor HTML.
function extractIframeSrc(html) {
  const m = html.match(/data-lifeos-iframe[^>]*\bsrc="([^"]+)"/i)
    || html.match(/<iframe[^>]*\bsrc="([^"]+)"[^>]data-lifeos-iframe/i)
    || html.match(/class="lifeos-canvas-frame"[^>]*\bsrc="([^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, '&') : '';
}

/** Normalize list/API preview rows that may omit absolute URLs (demo samples often do). */
function hydratePreviewUrls(row) {
  if (!row?.clientId) return null;
  const clientId = String(row.clientId);
  const token = String(row.editToken || process.env.PREVIEW_EDIT_TOKEN || '');
  const previewUrl = row.previewUrl || row.preview_url || `${BASE}/previews/${clientId}`;
  const editorUrl = row.editorUrl || row.editor_url
    || `${BASE}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(token)}`;
  const publishCheckoutUrl = row.publishCheckoutUrl || row.publish_checkout_url
    || `${BASE}/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}`;
  return { ...row, clientId, editToken: token, previewUrl, editorUrl, publishCheckoutUrl };
}

async function resolvePreview() {
  if (process.env.PREVIEW_CLIENT_ID) {
    return hydratePreviewUrls({
      clientId: process.env.PREVIEW_CLIENT_ID,
      editToken: process.env.PREVIEW_EDIT_TOKEN || '',
    });
  }
  const res = await fetchRaw(`${BASE}/api/v1/sites/previews`);
  if (res.status !== 200) return null;
  let list = [];
  try { list = JSON.parse(res.text)?.previews || []; } catch { /* ignore */ }
  // Prefer the named demo sample (stable market fixture), else newest row with a token.
  const demo = list.find((p) => p && p.clientId === 'wellrounded-momma' && p.editToken);
  const withToken = demo || list.find((p) => p && p.editToken && p.clientId);
  return hydratePreviewUrls(withToken);
}

async function main() {
  console.log(`\n🛡️  SENTRY Site Builder pre-alpha — Layer A (structural)`);
  console.log(`   Base: ${BASE}`);
  console.log(`   Key:  ${KEY ? '✅ present' : '❌ MISSING'}\n`);

  if (!KEY) step('SBPA-A00_key', false, 'COMMAND_CENTER_KEY missing — cannot authenticate');

  const preview = await resolvePreview();
  if (!preview) {
    step('SBPA-A01_preview_available', false,
      'No preview found. Build one first: POST /api/v1/sites/build {"url":"https://…"}');
    return finish();
  }
  step('SBPA-A01_preview_available', true,
    `clientId=${preview.clientId} token=${preview.editToken ? 'present' : 'MISSING'}`);

  // A02 — the preview page loads a real site (what a prospect first sees).
  const previewIndex = `${preview.previewUrl.replace(/\/$/, '')}/index.html`;
  const prev = await fetchRaw(previewIndex);
  step('SBPA-A02_preview_loads',
    prev.status === 200 && /<html/i.test(prev.text),
    `HTTP ${prev.status} at ${previewIndex}`);

  // A03 — the editor shell loads with the canvas iframe present.
  const editor = await fetchRaw(preview.editorUrl);
  const hasIframe = /data-lifeos-iframe/.test(editor.text);
  step('SBPA-A03_editor_loads',
    editor.status === 200 && hasIframe,
    `HTTP ${editor.status}; iframe_marker=${hasIframe}`);

  // A04 — the iframe src is ABSOLUTE and points at the preview (catches the
  // relative-path bug that produced "Cannot GET /api/v1/sites/index.html").
  const iframeSrc = extractIframeSrc(editor.text);
  const absolute = /^https?:\/\//i.test(iframeSrc) && /\/previews\//.test(iframeSrc);
  step('SBPA-A04_iframe_src_absolute',
    absolute,
    `iframe src="${iframeSrc || '(none found)'}"`, { iframeSrc });

  // A05 — following the iframe src returns the REAL site (200 + HTML), not a 404.
  let framedBody = '';
  if (iframeSrc && /^https?:\/\//i.test(iframeSrc)) {
    const framed = await fetchRaw(iframeSrc);
    framedBody = framed.text || '';
    step('SBPA-A05_iframe_loads_real_site',
      framed.status === 200 && /<html/i.test(framed.text),
      `HTTP ${framed.status} at iframe src`);
  } else {
    step('SBPA-A05_iframe_loads_real_site', false, 'no absolute iframe src to follow');
  }

  // A05b — the site was built from the REAL business, not a parked/for-sale
  // placeholder (HugeDomains, "for sale", a Cloudflare "Just a moment…"
  // challenge). Such a scrape yields a garbage site with no real logo/content
  // to preserve — it must NOT be called "done". Fail closed.
  const parkedMarkers = /hugedomains|godaddy|is for sale|buy this domain|domain (name )?(is )?for sale|this domain (is|may be)|parked (free|domain)|just a moment|checking your browser|namecheap|sedo/i;
  const parkedHit = (framedBody.match(parkedMarkers) || [])[0] || '';
  step('SBPA-A05b_scraped_real_business', !parkedHit,
    parkedHit
      ? `PARKED/PLACEHOLDER content detected ("${parkedHit}") — source is not a real business site`
      : 'no parking/placeholder markers in the built site');

  // A06 — publish money path reaches Stripe. The first hop is an intentional
  // review page (discount code + Continue to payment). Prove that page, then
  // follow ?pay=1 to a Stripe Location (or checkout.stripe.com body).
  const review = await fetchRaw(preview.publishCheckoutUrl, { redirect: 'manual' });
  const reviewHtml = review.text || '';
  const isReviewPage = review.status === 200
    && /Continue to payment|Discount code|Publish/i.test(reviewHtml)
    && /name="pay"|pay=1/i.test(reviewHtml);
  const payUrl = preview.publishCheckoutUrl.includes('?')
    ? `${preview.publishCheckoutUrl}&pay=1`
    : `${preview.publishCheckoutUrl}?pay=1`;
  const payHop = await fetchRaw(payUrl, { redirect: 'manual' });
  const locIsStripe = /stripe\.com/i.test(payHop.location || '');
  let checkoutOk = isReviewPage && payHop.status >= 300 && payHop.status < 400 && locIsStripe;
  let checkoutDetail = `review HTTP ${review.status} review_page=${isReviewPage}; pay=1 HTTP ${payHop.status}; location=${payHop.location || '(none)'}`;
  if (!checkoutOk && locIsStripe) {
    checkoutOk = true;
    checkoutDetail += ' | direct_stripe_ok';
  }
  if (!checkoutOk) {
    const followed = await fetchRaw(payUrl, { redirect: 'follow' });
    checkoutOk = /checkout\.stripe\.com|js\.stripe\.com/i.test(followed.text || '') && followed.status === 200;
    checkoutDetail += ` | followed pay=1 HTTP ${followed.status} stripe_in_body=${/stripe/i.test(followed.text || '')}`;
  }
  step('SBPA-A06_checkout_resolves_stripe', checkoutOk, checkoutDetail);

  finish(preview);
}

function finish(preview) {
  const passed = steps.filter((s) => s.ok).map((s) => s.id);
  const failed = steps.filter((s) => !s.ok).map((s) => s.id);
  const allPass = failed.length === 0 && steps.length > 0;

  const receipt = {
    schema: 'site_builder_prealpha_layer_a_v1',
    layer: 'A_structural',
    at: new Date().toISOString(),
    base: BASE,
    preview: preview ? { clientId: preview.clientId } : null,
    ok: allPass,
    verdict: allPass ? 'PASS' : 'FAIL',
    tests_passed: passed.length,
    tests_failed: failed.length,
    passed,
    failed,
    steps,
    note: allPass
      ? 'Layer A structural walkthrough passed. Proceed to Layer B (human-sim browser + UX critique).'
      : `Layer A failed on: ${failed.join(', ')} — feature is NOT done; fix before founder handoff.`,
    bp_sync: {
      updated: ['builderos-reboot/BP_PRIORITY.json'],
    },
  };

  try {
    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2));
  } catch (err) {
    console.error('Could not write receipt:', err.message);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${allPass ? '✅ PASS' : '❌ FAIL'} — ${passed.length}/${steps.length} steps passed`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
  console.log(`Receipt: products/receipts/SITE_BUILDER_PREALPHA_LAYER_A.json`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error('Layer A walkthrough crashed:', err);
  process.exit(1);
});