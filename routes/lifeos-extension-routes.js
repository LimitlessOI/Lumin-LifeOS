/**
 * routes/lifeos-extension-routes.js
 *
 * Lumin Universal Overlay — Backend API
 * Mounted at /api/v1/extension
 *
 * Routes:
 *   GET  /status      — auth check + user context for overlay bootstrap
 *   POST /context     — analyze page context, suggest relevant LifeOS data
 *   POST /fill-form   — given form fields + user → return fill map
 *   POST /chat        — Lumin chat with page context injected
 *
 * CORS: these endpoints must allow the extension iframe origin.
 * The iframe is served from this same server, so same-origin requests work.
 * For development, the allowed origin list includes localhost.
 *
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */

import express from 'express';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSExtensionRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router  = express.Router();
  const log     = logger || console;
  const resolveUserId = makeLifeOSUserResolver(pool);

  // ── CORS for extension iframe requests ────────────────────────────────────
  // The iframe is served from this origin, so normal same-origin applies.
  // We add permissive CORS headers so the extension can also call the API
  // directly from content.js if needed in future.
  router.use((req, res, next) => {
    const origin = req.headers.origin || '';
    // Allow extension origins and our own origin
    if (
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://') ||
      origin.includes('localhost') ||
      origin.includes('railway.app') ||
      origin.includes('lumin') // custom domain future-proofing
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-command-key, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ── GET /status — bootstrap auth check ──────────────────────────────────
  router.get('/status', requireKey, async (req, res) => {
    try {
      const userHandle = req.query.user || 'adam';
      const userId = await resolveUserId(userHandle);
      if (!userId) {
        return res.json({ ok: true, authenticated: true, user: null, message: 'Key valid — user not found' });
      }

      const { rows } = await pool.query(
        `SELECT user_handle, display_name, tier, role
           FROM lifeos_users WHERE id = $1`,
        [userId]
      );
      const user = rows[0];
      res.json({
        ok: true,
        authenticated: true,
        user: user ? {
          handle:       user.user_handle,
          display_name: user.display_name,
          tier:         user.tier || 'free',
          role:         user.role || 'member',
        } : null,
        overlay_version: '20260421-0001',
      });
    } catch (err) {
      log.error({ err: err.message }, '[EXT] /status failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /context — analyze page, suggest relevant LifeOS data ──────────
  router.post('/context', requireKey, async (req, res) => {
    try {
      const { user, url, hostname, title, fields = [], body_text = '' } = req.body;
      const userId = await resolveUserId(user || 'adam');

      // Detect what kind of page this is and pull relevant user data
      const suggestions = await buildContextSuggestions({ pool, userId, url, hostname, title, fields, log });

      res.json({ ok: true, suggestions, page_type: suggestions.page_type });
    } catch (err) {
      log.error({ err: err.message }, '[EXT] /context failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /fill-form — map user data to form fields ───────────────────────
  router.post('/fill-form', requireKey, async (req, res) => {
    try {
      const { user, fields = [], url = '' } = req.body;
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const { rows } = await pool.query(
        `SELECT user_handle, display_name, email, phone, date_of_birth,
                address_line1, address_city, address_state, address_zip
           FROM lifeos_users WHERE id = $1`,
        [userId]
      );
      const u = rows[0];
      if (!u) return res.json({ ok: true, fill_map: [] });

      // Split display name
      const nameParts  = (u.display_name || u.user_handle || '').split(' ');
      const firstName  = nameParts[0] || '';
      const lastName   = nameParts.slice(1).join(' ') || '';

      const fillMap = [];

      fields.forEach(f => {
        const key = mapFieldToUserData(f, { firstName, lastName, fullName: u.display_name, email: u.email, phone: u.phone, dob: u.date_of_birth, address1: u.address_line1, city: u.address_city, state: u.address_state, zip: u.address_zip });
        if (key !== undefined && key !== null && key !== '') {
          fillMap.push({ selector: f.selector, label: f.label || f.name, value: String(key) });
        }
      });

      log.info({ userId, filled: fillMap.length, total: fields.length }, '[EXT] fill-form');
      res.json({ ok: true, fill_map: fillMap, filled: fillMap.length, total: fields.length });
    } catch (err) {
      log.error({ err: err.message }, '[EXT] /fill-form failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /chat — Lumin chat with page context ────────────────────────────
  router.post('/chat', requireKey, async (req, res) => {
    try {
      const { user, message, history = [], page_context = {} } = req.body;
      if (!message?.trim()) return res.status(400).json({ ok: false, error: 'message required' });

      const userId = await resolveUserId(user || 'adam');

      // Build page-context block for Lumin
      const pageBlock = buildPageContextBlock(page_context);

      // Build conversation history for Claude
      const systemPrompt = `You are Lumin, the AI inside the LifeOS Universal Overlay. You are embedded as a small overlay on top of whatever website or app the user is currently using.

CURRENT PAGE CONTEXT:
${pageBlock}

Your job:
- Help the user with whatever they're doing on this page (filling forms, understanding content, navigating, etc.)
- Be direct and practical. This is a quick-access overlay, not a long coaching session.
- If the user asks you to fill a form, respond with a fill_map in your JSON response.
- If you detect the user is struggling, offer concrete help, not encouragement.
- Keep responses concise — 2-3 sentences unless depth is needed.
- You have access to their LifeOS profile data to help fill forms.
- NEVER make up information about the user. If you don't know something, say so.
- Constitutional: never manipulate, never dark patterns, never auto-submit forms.`;

      const messages = [
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const reply = await callCouncilMember('anthropic', {
        model:      'claude-haiku-4-5-20251001',
        system:     systemPrompt,
        messages,
        max_tokens: 400,
      });

      const replyText = reply?.content?.[0]?.text || reply?.text || 'I\'m having trouble responding right now.';

      log.info({ userId, messageLen: message.length }, '[EXT] chat');
      res.json({ ok: true, reply: replyText });
    } catch (err) {
      log.error({ err: err.message }, '[EXT] /chat failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a detected form field to a user data value.
 * Matches by label, name, id, placeholder (case-insensitive keyword matching).
 */
function mapFieldToUserData(field, userData) {
  const haystack = [field.label, field.name, field.id, field.placeholder]
    .join(' ').toLowerCase();

  const { firstName, lastName, fullName, email, phone, dob, address1, city, state, zip } = userData;

  // Name variants
  if (/\bfirst\s*name\b/.test(haystack)) return firstName;
  if (/\blast\s*name\b/.test(haystack))  return lastName;
  if (/\bfull\s*name\b|\byour\s*name\b/.test(haystack)) return fullName;

  // Email
  if (/\bemail\b/.test(haystack)) return email;

  // Phone
  if (/\bphone\b|\bmobile\b|\bcell\b|\btelephone\b/.test(haystack)) return phone;

  // Date of birth
  if (/\bdob\b|\bdate.of.birth\b|\bbirthdate\b|\bbirthday\b/.test(haystack)) {
    if (!dob) return null;
    const d = new Date(dob);
    if (field.type === 'date') return d.toISOString().slice(0, 10);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  // Address
  if (/\baddress\b|\bstreet\b/.test(haystack) && !/\bcity\b|\bstate\b|\bzip\b/.test(haystack)) return address1;
  if (/\bcity\b/.test(haystack))  return city;
  if (/\bstate\b/.test(haystack)) return state;
  if (/\bzip\b|\bpostal\b/.test(haystack)) return zip;

  return null;
}

/**
 * Detect the page type and pull relevant LifeOS context to surface in the overlay.
 */
async function buildContextSuggestions({ pool, userId, url, hostname, title, fields, log }) {
  const result = { page_type: 'generic', relevant_data: {} };

  // Detect page type
  if (/insurance|emdeon|availity|pverify|waystar|claimremedi|mdeverify/i.test(hostname + url)) {
    result.page_type = 'insurance';
  } else if (/bank|chase|wellsfargo|bofa|capitalone|credit\s*union|paypal|venmo|zelle/i.test(hostname)) {
    result.page_type = 'banking';
  } else if (/dmv|irs\.gov|ssa\.gov|hhs\.gov|medicare|medicaid|gov$/i.test(hostname)) {
    result.page_type = 'government';
  } else if (fields.length > 2) {
    result.page_type = 'form';
  }

  // Pull basic user data preview (no sensitive values — just labels to show what we have)
  if (userId) {
    try {
      const { rows } = await pool.query(
        `SELECT display_name, email IS NOT NULL as has_email,
                phone IS NOT NULL as has_phone,
                date_of_birth IS NOT NULL as has_dob,
                address_line1 IS NOT NULL as has_address
           FROM lifeos_users WHERE id = $1`,
        [userId]
      );
      if (rows[0]) {
        result.relevant_data = {
          name:    rows[0].display_name || 'on file',
          email:   rows[0].has_email    ? 'on file' : null,
          phone:   rows[0].has_phone    ? 'on file' : null,
          dob:     rows[0].has_dob      ? 'on file' : null,
          address: rows[0].has_address  ? 'on file' : null,
        };
      }
    } catch (e) {
      log.warn({ err: e.message }, '[EXT] context user lookup failed');
    }
  }

  return result;
}

function buildPageContextBlock(ctx) {
  if (!ctx || !ctx.url) return 'No page context available.';
  const lines = [
    `URL: ${ctx.url}`,
    `Site: ${ctx.hostname || '—'}`,
    `Page title: ${ctx.title || '—'}`,
  ];
  if (ctx.fieldCount) {
    lines.push(`Form fields (${ctx.fieldCount}): ${(ctx.fieldNames || []).join(', ')}`);
  }
  if (ctx.bodyText) {
    lines.push(`Page content preview: ${ctx.bodyText.slice(0, 300)}`);
  }
  return lines.join('\n');
}
