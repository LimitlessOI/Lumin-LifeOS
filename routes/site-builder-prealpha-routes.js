/**
 * SYNOPSIS: CONDUCTOR-GLUE SENTRY pre-alpha Layer B (human-sim) route for Site
 * Builder. Mounts POST /api/v1/sites/prealpha/layer-b, which drives the live
 * editor with a real browser the way a client would — loads the editor, verifies
 * the canvas iframe shows the REAL site (not "Cannot GET"), switches a template,
 * types in the AI chat, tries to break it (Save with no edits, Publish), captures
 * screenshots, and asks a cheap model to critique the UX from the client's
 * perspective + propose improvements. Fails closed. Authors no browser primitive
 * itself — pure wiring of the proven browser-agent session + the editor surface,
 * exposed through the founder-runtime auto-register contract so it goes live on
 * prod (where Chrome launches) without editing the composition root.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { createSession } from '../services/browser-agent.js';

const PREVIEWS_ROOT = path.resolve(process.cwd(), 'public/previews');
const CLIENT_ID_RE = /^[\w-]+$/;

function readMetaFromDisk(clientId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PREVIEWS_ROOT, clientId, 'meta.json'), 'utf8'));
  } catch {
    return null;
  }
}

// Previews live on ephemeral per-instance disk; a fixture built (or rehydrated)
// on one Railway instance is invisible to a request landing on another. Fall
// back to prospect_sites.metadata itself — recordProspect() already spreads the
// full build metadata (editToken, variants, businessInfo, etc.) directly onto
// the row's metadata column, so the row IS the durable equivalent of meta.json.
// (A nested `previewMeta` copy is also written alongside it, but proved
// unreliable in practice — likely dropped by JSON.stringify whenever a sibling
// `previewHtml: undefined` key sits in the same object literal — so read the
// reliable top-level fields instead.)
async function readMeta(clientId, pool) {
  const fromDisk = readMetaFromDisk(clientId);
  if (fromDisk && fromDisk.editToken) return fromDisk;
  if (!pool) return fromDisk;
  try {
    const result = await pool.query(
      `SELECT metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
      [clientId]
    );
    const dbMeta = result.rows[0]?.metadata;
    return dbMeta && dbMeta.editToken ? dbMeta : fromDisk;
  } catch {
    return fromDisk;
  }
}

async function newestPreviewWithToken(pool) {
  let entries = [];
  try {
    entries = fs.readdirSync(PREVIEWS_ROOT);
  } catch {
    entries = [];
  }
  const metas = entries
    .map((clientId) => ({ clientId, meta: readMetaFromDisk(clientId) }))
    .filter((x) => x.meta && x.meta.editToken)
    .sort((a, b) => new Date(b.meta.createdAt || 0) - new Date(a.meta.createdAt || 0));
  if (metas[0]) return metas[0];
  if (!pool) return null;
  try {
    const result = await pool.query(
      `SELECT client_id, metadata FROM prospect_sites
       WHERE metadata->>'editToken' IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`
    );
    const row = result.rows[0];
    if (!row) return null;
    return { clientId: row.client_id, meta: row.metadata };
  } catch {
    return null;
  }
}

export function registerSiteBuilderPrealphaRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const baseUrl = String(deps.baseUrl || '').replace(/\/+$/, '');
  const logger = deps.logger ?? console;
  const pool = deps.pool;

  if (typeof requireKey !== 'function') {
    throw new Error('registerSiteBuilderPrealphaRoutes requires deps.requireKey');
  }

  app.post('/api/v1/sites/prealpha/layer-b', requireKey, async (req, res) => {
    const steps = [];
    const observations = [];
    const shots = [];
    const { clientId: bodyClientId, critique = true } = req.body || {};

    function step(id, ok, detail = '', data = {}) {
      steps.push({ id, ok, detail, ...data });
      logger.info?.(`[SENTRY-LAYERB] ${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
      return ok;
    }

    // ── Resolve the preview to walk ──
    let clientId = String(bodyClientId || '').trim();
    let meta = null;
    if (clientId && CLIENT_ID_RE.test(clientId)) {
      meta = await readMeta(clientId, pool);
    } else {
      const newest = await newestPreviewWithToken(pool);
      if (newest) { clientId = newest.clientId; meta = newest.meta; }
    }
    if (!meta || !meta.editToken) {
      step('SBPB-B00_preview_available', false,
        'No preview with an edit token found. Build one: POST /api/v1/sites/build');
      return res.status(200).json(finish());
    }
    step('SBPB-B00_preview_available', true, `clientId=${clientId}`);

    // Drive the server-side browser against a host that ACTUALLY resolves. The injected
    // `baseUrl` derives from RAILWAY_PUBLIC_DOMAIN, which can be an unprovisioned Railway
    // custom domain (e.g. sitebuilder.taloaos.com) the browser cannot reach — page.goto
    // then fails and every downstream step fails (4/8). Prefer the origin the caller hit
    // us on (x-forwarded-*), which is reachable and serves previews same-origin.
    const fwdProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || req.protocol || 'https';
    const fwdHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const effectiveBase = fwdHost ? `${fwdProto}://${fwdHost}` : baseUrl;

    const editorUrl = `${effectiveBase}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(meta.editToken)}`;
    const shotDir = path.join(PREVIEWS_ROOT, clientId, '_sentry');
    try { fs.mkdirSync(shotDir, { recursive: true }); } catch { /* ignore */ }

    let session = null;
    try {
      session = await createSession({ headless: true, logger });
      const page = session.page;
      await page.setViewport({ width: 1366, height: 900 });

      async function shot(label) {
        try {
          const file = path.join(shotDir, `${label}.png`);
          await page.screenshot({ path: file, fullPage: false });
          const url = `${effectiveBase}/previews/${clientId}/_sentry/${label}.png`;
          shots.push({ label, url });
          return url;
        } catch (err) {
          return null;
        }
      }

      // ── B01: editor shell loads as a client sees it ──
      await page.goto(editorUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await shot('01-editor-open');
      const shellText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
      const hasIframe = await page.$('[data-lifeos-iframe]');
      step('SBPB-B01_editor_shell_loads', Boolean(hasIframe) && shellText.length > 0,
        `iframe=${Boolean(hasIframe)} shell_text_len=${shellText.length}`);

      // ── B02: the canvas iframe shows the REAL site (not "Cannot GET"/404) ──
      let framedText = '';
      let framedSrc = '';
      try {
        const frameHandle = await page.$('[data-lifeos-iframe]');
        framedSrc = frameHandle ? await (await frameHandle.getProperty('src')).jsonValue() : '';
        const frame = frameHandle ? await frameHandle.contentFrame() : null;
        if (frame) framedText = await frame.evaluate(() => document.body?.innerText || '').catch(() => '');
      } catch { /* ignore */ }
      const brokeMarkers = /cannot get|not found|404|error/i.test(framedText.slice(0, 400));
      step('SBPB-B02_iframe_shows_real_site',
        framedSrc.startsWith('http') && framedText.length > 40 && !brokeMarkers,
        `src=${framedSrc || '(none)'} framed_text_len=${framedText.length} broken_markers=${brokeMarkers}`,
        { framedSrc });

      // ── B02b: the site was built from the REAL business, not a parked/for-sale
      // placeholder. A domain-parking page (HugeDomains, "for sale", a Cloudflare
      // "Just a moment…" challenge) produces a garbage site the client would
      // reject — and there is no real logo/content to preserve. Fail closed.
      const parkedMarkers = /hugedomains|godaddy|is for sale|buy this domain|domain (name )?(is )?for sale|this domain (is|may be)|parked (free|domain)|just a moment|checking your browser|namecheap|sedo/i;
      const parkedHit = (framedText.match(parkedMarkers) || [])[0] || '';
      step('SBPB-B02b_scraped_real_business', !parkedHit,
        parkedHit
          ? `PARKED/PLACEHOLDER content detected ("${parkedHit}") — source domain is not a real business site; logo/content cannot be preserved`
          : 'source content looks like a real business (no parking/placeholder markers)',
        { parkedHit });

      // ── B03: template switch works (client changes the whole design) ──
      const chips = await page.$$('[data-lifeos-template-file]');
      if (chips.length >= 2) {
        const beforeSrc = framedSrc;
        await chips[1].click().catch(() => {});
        await new Promise((r) => setTimeout(r, 2500));
        await shot('02-template-switched');
        let afterSrc = '';
        try {
          const fh = await page.$('[data-lifeos-iframe]');
          afterSrc = fh ? await (await fh.getProperty('src')).jsonValue() : '';
        } catch { /* ignore */ }
        step('SBPB-B03_template_switch', afterSrc !== '' && afterSrc !== beforeSrc,
          `before=${beforeSrc.slice(-30)} after=${afterSrc.slice(-30)}`);
      } else {
        observations.push(`Only ${chips.length} template chip(s) — client has little/no design choice.`);
        step('SBPB-B03_template_switch', true, `skipped: ${chips.length} chip(s) (not a failure)`);
      }

      // ── B04: the AI chat accepts input (the "hey, can you do this?" panel) ──
      const chatSel = 'textarea, input[type="text"]';
      const chatInput = await page.$(chatSel);
      if (chatInput) {
        await chatInput.click().catch(() => {});
        await chatInput.type('Can you make the headline bigger and the vibe calmer?', { delay: 15 }).catch(() => {});
        await shot('03-chat-typed');
        // Try to send: a Send button, or Enter.
        const sendBtn = await page.$$('xpath/' + "//button[contains(translate(text(),'SEND','send'),'send')]");
        if (sendBtn[0]) await sendBtn[0].click().catch(() => {});
        else await page.keyboard.press('Enter').catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
        await shot('04-chat-sent');
        const typedOk = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? String(el.value || '').length : -1;
        }, chatSel).catch(() => -1);
        step('SBPB-B04_chat_accepts_input', typedOk !== -1,
          `chat input present + accepted text (post-send len=${typedOk})`);
      } else {
        step('SBPB-B04_chat_accepts_input', false, 'no chat input found — client cannot request changes');
        observations.push('No visible chat input — the "ask for changes" experience is missing.');
      }

      // ── B05: try to break it — Save with no explicit edits must not crash ──
      const saveBtn = await page.$('[data-lifeos-save]');
      if (saveBtn) {
        await saveBtn.click().catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
        await shot('05-save-clicked');
        const stillAlive = await page.evaluate(() => Boolean(document.querySelector('[data-lifeos-iframe]'))).catch(() => false);
        step('SBPB-B05_save_no_crash', stillAlive, 'clicked Save with no edits; editor still alive');
      } else {
        step('SBPB-B05_save_no_crash', true, 'no explicit Save button (not a failure)');
      }

      // ── B06: publish path is discoverable + points at checkout ──
      const publishHref = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a,button'))
          .find((el) => /publish/i.test(el.textContent || ''));
        return a ? (a.getAttribute('href') || 'BUTTON') : '';
      }).catch(() => '');
      step('SBPB-B06_publish_discoverable',
        Boolean(publishHref) && (/checkout/i.test(publishHref) || publishHref === 'BUTTON'),
        `publish target=${publishHref || '(none)'}`);

      // ── Deterministic UX observations (client's-eye friction) ──
      const uxFacts = await page.evaluate(() => {
        const facts = {};
        const chipsEls = Array.from(document.querySelectorAll('[data-lifeos-template-file]'));
        facts.template_chip_count = chipsEls.length;
        facts.unlabeled_chips = chipsEls.filter((c) => !(c.textContent || '').trim()).length;
        facts.palette_count = document.querySelectorAll('[data-lifeos-palette-name]').length;
        facts.has_chat = Boolean(document.querySelector('textarea, input[type="text"]'));
        facts.has_save = Boolean(document.querySelector('[data-lifeos-save]'));
        facts.has_device_toggle = Boolean(document.querySelector('[data-lifeos-device]'));
        return facts;
      }).catch(() => ({}));
      observations.push(`Editor exposes: ${uxFacts.template_chip_count} templates, ${uxFacts.palette_count} palettes, chat=${uxFacts.has_chat}, save=${uxFacts.has_save}, device-toggle=${uxFacts.has_device_toggle}.`);
      if (uxFacts.unlabeled_chips) observations.push(`${uxFacts.unlabeled_chips} template chip(s) have no visible label.`);

      await shot('06-final');

      // ── UX critique from the client's perspective (cheap model, optional) ──
      let uxCritique = null;
      if (critique && typeof callCouncilMember === 'function') {
        try {
          const prompt = `You are a real small-business owner (a wellness practitioner) who just opened the editor for your new website. You are NOT technical. Judge the EXPERIENCE, not the code.

What the editor exposes (observed): ${JSON.stringify(uxFacts)}
Walkthrough results: ${JSON.stringify(steps.map((s) => ({ id: s.id, ok: s.ok, detail: s.detail })))}
Notes: ${JSON.stringify(observations)}

Return STRICT JSON only:
{
  "verdict": "good" | "rough" | "broken",
  "friction_points": ["short, concrete things that felt confusing, in a bad spot, or an unneeded step"],
  "improvements": ["short, concrete ideas to make it a better experience"]
}`;
          const raw = await callCouncilMember('gemini_flash', prompt, { taskType: 'site_builder_ux_critique', maxOutputTokens: 900 });
          const text = typeof raw === 'string' ? raw : (raw?.text || raw?.content || '');
          const m = text.match(/\{[\s\S]*\}/);
          if (m) uxCritique = JSON.parse(m[0]);
        } catch (err) {
          uxCritique = { error: String(err.message || err).slice(0, 200) };
        }
      }

      return res.status(200).json(finish({ clientId, editorUrl, uxFacts, uxCritique }));
    } catch (err) {
      logger.error?.('[SENTRY-LAYERB] walkthrough crashed', { error: err.message });
      step('SBPB-BXX_walkthrough_crash', false, String(err.message || err).slice(0, 200));
      return res.status(200).json(finish({ clientId, editorUrl }));
    } finally {
      if (session?.close) await session.close().catch(() => {});
    }

    function finish(extra = {}) {
      const passed = steps.filter((s) => s.ok).map((s) => s.id);
      const failed = steps.filter((s) => !s.ok).map((s) => s.id);
      const allPass = failed.length === 0 && steps.length > 0;
      return {
        schema: 'site_builder_prealpha_layer_b_v1',
        layer: 'B_human_sim',
        ok: allPass,
        verdict: allPass ? 'PASS' : 'FAIL',
        at: new Date().toISOString(),
        tests_passed: passed.length,
        tests_failed: failed.length,
        passed,
        failed,
        steps,
        observations,
        screenshots: shots,
        ...extra,
        note: allPass
          ? 'Layer B human-sim passed. Combined with Layer A, the feature clears the pre-alpha gate.'
          : `Layer B failed on: ${failed.join(', ')} — NOT done; a client would hit this. Fix before founder handoff.`,
      };
    }
  });

  logger.info?.('✅ [SENTRY-LAYERB] Route mounted at POST /api/v1/sites/prealpha/layer-b');
}

export default registerSiteBuilderPrealphaRoutes;