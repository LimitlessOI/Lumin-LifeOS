/**
 * SYNOPSIS: Site Builder live preview editor API (edit / save / revert / shell).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import logger from '../services/logger.js';
import { renderEditorShell } from '../services/site-builder-editor.js';
import { recommendServices } from '../services/site-builder-service-catalog.js';
import { resolvePreviewsDir } from '../config/site-builder-paths.js';

const PREVIEWS_ROOT = resolvePreviewsDir();
const CLIENT_ID_RE = /^[\w-]+$/;

function resolvePreviewFile(clientId, relativeFile) {
  if (!CLIENT_ID_RE.test(String(clientId))) return null;
  const rel = String(relativeFile || 'index.html').replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return null;
  const clientRoot = path.resolve(PREVIEWS_ROOT, clientId);
  const resolved = path.resolve(clientRoot, rel);
  const relative = path.relative(clientRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

async function readMeta(clientId) {
  const metaPath = path.join(PREVIEWS_ROOT, clientId, 'meta.json');
  try {
    return JSON.parse(await fsp.readFile(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

async function assertEditToken(clientId, token) {
  const meta = await readMeta(clientId);
  if (!meta?.editToken) return { ok: false, status: 403, error: 'Editor token unavailable' };
  if (String(token || '') !== String(meta.editToken)) {
    return { ok: false, status: 403, error: 'Invalid editor token' };
  }
  return { ok: true, meta };
}

function buildStrategyFromMeta(meta) {
  const competitors = [];
  const benchmark = meta?.benchmark;
  if (benchmark?.competitors && Array.isArray(benchmark.competitors)) {
    for (const c of benchmark.competitors) {
      competitors.push({
        name: c.name || c.url || 'Competitor',
        category: c.category || 'market',
        score: c.score,
        strengths: c.doesWell || c.strengths || [],
        weaknesses: c.doesPoorly || c.weaknesses || [],
      });
    }
  }
  const synopsis =
    meta?.presence?.gap?.summary ||
    benchmark?.designBrief?.summary ||
    benchmark?.designBrief ||
    '';
  return { synopsis: typeof synopsis === 'string' ? synopsis : '', competitors };
}

function buildEditorContext(meta, clientId, baseUrl) {
  const businessName = meta?.businessInfo?.businessName || meta?.businessName || 'Your site';
  const variants = Array.isArray(meta?.variants)
    ? meta.variants
    : [{ id: 'default', name: 'Default', file: 'index.html' }];
  const primary = meta?.primaryColor || meta?.businessInfo?.primaryColor || '#7C3AED';
  const accent = meta?.accentColor || meta?.businessInfo?.accentColor || '#EC4899';
  const palettes = [
    { name: 'Brand', primary, accent },
    { name: 'Warm', primary: '#B45309', accent: '#F59E0B' },
    { name: 'Clinical', primary: '#0F766E', accent: '#14B8A6' },
  ];
  const strategy = buildStrategyFromMeta(meta);
  const services = recommendServices(strategy);
  return {
    businessName,
    clientId,
    siteFile: 'index.html',
    variants,
    palettes,
    editToken: meta.editToken,
    baseUrl,
    strategy,
    services,
  };
}

async function backupFile(absPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${absPath}.${stamp}.bak`;
  const current = await fsp.readFile(absPath, 'utf8');
  await fsp.writeFile(backupPath, current, 'utf8');
  return backupPath;
}

async function findLatestBackup(absPath) {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  const entries = await fsp.readdir(dir);
  const backups = entries
    .filter((name) => name.startsWith(`${base}.`) && name.endsWith('.bak'))
    .sort()
    .reverse();
  return backups[0] ? path.join(dir, backups[0]) : null;
}

function extractHtmlFromModelResponse(text) {
  const raw = String(text || '');
  const fenced = raw.match(/```html?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw.trim();
  const htmlMatch = candidate.match(/<html[\s\S]*<\/html>/i);
  return htmlMatch ? htmlMatch[0] : (candidate.includes('<html') ? candidate : null);
}

export function createSiteBuilderEditorRoutes(app, { callCouncilMember, baseUrl, pool } = {}) {
  const router = Router();

  router.get('/editor', async (req, res) => {
    try {
      const clientId = String(req.query.clientId || req.query.id || '').trim();
      const token = String(req.query.token || '').trim();
      if (!CLIENT_ID_RE.test(clientId)) {
        return res.status(400).send('Invalid preview id.');
      }

      const auth = await assertEditToken(clientId, token);
      if (!auth.ok) return res.status(auth.status).send(auth.error);

      const ctx = buildEditorContext(auth.meta, clientId, baseUrl);
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(renderEditorShell(ctx));
    } catch (err) {
      logger.error('[SITE-EDITOR] shell error', { error: err.message });
      res.status(500).send('Editor unavailable.');
    }
  });

  router.post('/edit', async (req, res) => {
    try {
      const { clientId, file, instruction, token } = req.body || {};
      if (!CLIENT_ID_RE.test(String(clientId || ''))) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }
      const auth = await assertEditToken(clientId, token);
      if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

      const targetFile = file || 'index.html';
      const absPath = resolvePreviewFile(clientId, targetFile);
      if (!absPath) return res.status(403).json({ ok: false, error: 'Invalid file path' });

      const currentHtml = await fsp.readFile(absPath, 'utf8');
      if (!callCouncilMember) {
        return res.status(503).json({ ok: false, error: 'AI editor unavailable' });
      }

      const prompt = `You are editing a live business website HTML document.

TRUTH RULES (mandatory):
- Do NOT invent prices, star ratings, review counts, years in business, or named testimonials.
- Only modify what the user's instruction asks for.
- Return the ENTIRE modified HTML document starting with <html.

CURRENT HTML:
${currentHtml.slice(0, 120000)}

USER INSTRUCTION:
${String(instruction || '').slice(0, 4000)}

Return ONLY the full modified HTML document.`;

      const modelResponse = await callCouncilMember('gemini_flash', prompt, {
        maxOutputTokens: 14000,
        taskType: 'site_builder_edit',
      });
      const responseText = typeof modelResponse === 'string'
        ? modelResponse
        : modelResponse?.text || modelResponse?.content || '';
      const nextHtml = extractHtmlFromModelResponse(responseText);
      if (!nextHtml || !/<html/i.test(nextHtml)) {
        return res.status(422).json({ ok: false, error: 'Model did not return valid HTML' });
      }

      await backupFile(absPath);
      await fsp.writeFile(absPath, nextHtml, 'utf8');
      res.json({ ok: true, file: targetFile });
    } catch (err) {
      logger.error('[SITE-EDITOR] edit error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/save-edits', async (req, res) => {
    try {
      const { clientId, file, html, token } = req.body || {};
      if (!CLIENT_ID_RE.test(String(clientId || ''))) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }
      const auth = await assertEditToken(clientId, token);
      if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

      const targetFile = file || 'index.html';
      const absPath = resolvePreviewFile(clientId, targetFile);
      if (!absPath) return res.status(403).json({ ok: false, error: 'Invalid file path' });
      if (!html || !/<html/i.test(String(html))) {
        return res.status(400).json({ ok: false, error: 'Valid html document required' });
      }

      await backupFile(absPath);
      await fsp.writeFile(absPath, String(html), 'utf8');
      res.json({ ok: true, file: targetFile });
    } catch (err) {
      logger.error('[SITE-EDITOR] save error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/revert', async (req, res) => {
    try {
      const { clientId, file, token } = req.body || {};
      if (!CLIENT_ID_RE.test(String(clientId || ''))) {
        return res.status(400).json({ ok: false, error: 'clientId required' });
      }
      const auth = await assertEditToken(clientId, token);
      if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });

      const targetFile = file || 'index.html';
      const absPath = resolvePreviewFile(clientId, targetFile);
      if (!absPath) return res.status(403).json({ ok: false, error: 'Invalid file path' });

      const latestBackup = await findLatestBackup(absPath);
      if (!latestBackup) return res.status(404).json({ ok: false, error: 'No backup found' });

      const restored = await fsp.readFile(latestBackup, 'utf8');
      await fsp.writeFile(absPath, restored, 'utf8');
      res.json({ ok: true, file: targetFile, restoredFrom: path.basename(latestBackup) });
    } catch (err) {
      logger.error('[SITE-EDITOR] revert error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/select-service', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(204).end();

    const clientId = String(req.query.id || req.query.clientId || '').trim();
    const serviceId = String(req.query.service || '').trim();
    if (!CLIENT_ID_RE.test(clientId) || !serviceId) return;

    logger.info('[SITE-EDITOR] Service selected', { clientId, serviceId });
    if (!pool) return;
    try {
      await pool.query(
        `UPDATE prospect_sites
            SET metadata = jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{selected_services}',
                  COALESCE(metadata->'selected_services', '[]'::jsonb) || jsonb_build_array($2::text)
                ),
                updated_at = NOW()
          WHERE client_id = $1`,
        [clientId, serviceId]
      );
    } catch (err) {
      logger.warn('[SITE-EDITOR] select-service DB update failed', { error: err.message });
    }
  });

  app.use('/api/v1/sites', router);
  logger.info('[SITE-EDITOR] Editor routes mounted at /api/v1/sites/editor, /edit, /save-edits, /revert, /select-service');
}

export default createSiteBuilderEditorRoutes;
