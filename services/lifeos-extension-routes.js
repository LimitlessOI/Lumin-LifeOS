/**
 * SYNOPSIS: Exports createLifeosExtensionRoutes — services/lifeos-extension-routes.js.
 */
import { callCouncilMember } from '../services/council.js';

function toJson(res, status, body) {
  return res.status(status).json(body);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function extractOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

function buildContextSummary(rows) {
  return {
    count: rows.length,
    latest: rows[0] || null,
  };
}

export function createLifeosExtensionRoutes(app, ctx) {
  const pool = ctx?.pool;
  const logger = ctx?.logger || console;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  async function getLatestUserContext(ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM overlay_user_context
       WHERE owner_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [ownerId],
    );
    return rows[0] || null;
  }

  async function getRecentInteractions(ownerId, limit = 10) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const { rows } = await pool.query(
      `SELECT * FROM overlay_interactions
       WHERE owner_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function getStatus(ownerId) {
    const [userContextRow, interactions] = await Promise.all([
      getLatestUserContext(ownerId),
      getRecentInteractions(ownerId, 5),
    ]);

    return {
      ok: true,
      userContext: {
        latest: userContextRow?.context || null,
        createdAt: userContextRow?.created_at || null,
        interactionSummary: buildContextSummary(interactions),
      },
    };
  }

  async function getContextSuggestions(ownerId) {
    const [userContextRow, interactions] = await Promise.all([
      getLatestUserContext(ownerId),
      getRecentInteractions(ownerId, 10),
    ]);

    const pageContext = {
      userContext: userContextRow?.context || null,
      recentInteractions: interactions.map((row) => row.interaction_data),
    };

    const response = await callCouncilMember('openai', {
      taskType: 'general',
      pageContext,
      prompt: 'Generate concise overlay suggestions from the provided page context.',
    }, { taskType: 'general' });

    return {
      ok: true,
      suggestions: response?.suggestions || response || [],
    };
  }

  async function fillForm(ownerId) {
    const [userContextRow, interactions] = await Promise.all([
      getLatestUserContext(ownerId),
      getRecentInteractions(ownerId, 10),
    ]);

    const pageContext = {
      userContext: userContextRow?.context || null,
      recentInteractions: interactions.map((row) => row.interaction_data),
    };

    const response = await callCouncilMember('openai', {
      taskType: 'general',
      pageContext,
      prompt: 'Produce a form field map for the overlay based on the provided page context.',
    }, { taskType: 'general' });

    return {
      ok: true,
      formMap: response?.formMap || response || {},
    };
  }

  /**
   * Routes through the SAME real chair/founder-interface pipeline the main
   * LifeOS app uses (public/overlay/lifeos-app.html's luminSend()) -- this
   * used to call callCouncilMember('openai', ...) directly, a separate,
   * shallow, bare single-model path with no chair/council reasoning, no
   * memory, none of "the full communications system." Direct founder
   * correction, 2026-08-10: "this is not connected to our system and the
   * full communications system we have worked on." Also fixes a real,
   * separate field-name bug: this previously returned `{ok:true, response}`
   * while public/extension/frame.js's sendChat() reads `d.reply` -- so even
   * a successful call would have rendered as blank/undefined, never
   * surfaced because the callCouncilMember path was erroring first.
   */
  async function chat(ownerId, body, authHeader) {
    const userMessage = normalizeText(body?.message || body?.text || body?.prompt);
    if (!userMessage) {
      return { ok: false, error: 'message_required' };
    }

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${process.env.PORT || 8080}`;

    const res = await fetch(`${baseUrl}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        text: userMessage,
        action: 'auto',
        stage: 'system',
        source_mode: 'text',
        conversational_mode: true,
        async: false,
        ui_context: {
          surface: 'chrome-extension',
          page: body?.page_context?.url || body?.page_context?.pageUrl || null,
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      return { ok: false, error: 'founder_interface_no_response' };
    }
    const reply = data.human_summary || data.reason || data.error || 'No response from system.';
    return { ok: true, reply, raw: data };
  }

  app.get('/api/v1/extension/status', async (req, res) => {
    try {
      const ownerId = extractOwnerId(req);
      if (!ownerId) return toJson(res, 401, { error: 'jwt_required' });
      return toJson(res, 200, await getStatus(ownerId));
    } catch (error) {
      logger?.error?.({ error }, 'extension_status_failed');
      return toJson(res, error?.status || 500, { error: error?.message || 'internal_error' });
    }
  });

  app.post('/api/v1/extension/context', async (req, res) => {
    try {
      const ownerId = extractOwnerId(req);
      if (!ownerId) return toJson(res, 401, { error: 'jwt_required' });
      return toJson(res, 200, await getContextSuggestions(ownerId));
    } catch (error) {
      logger?.error?.({ error }, 'extension_context_failed');
      return toJson(res, error?.status || 500, { error: error?.message || 'internal_error' });
    }
  });

  app.post('/api/v1/extension/fill-form', async (req, res) => {
    try {
      const ownerId = extractOwnerId(req);
      if (!ownerId) return toJson(res, 401, { error: 'jwt_required' });
      return toJson(res, 200, await fillForm(ownerId));
    } catch (error) {
      logger?.error?.({ error }, 'extension_fill_form_failed');
      return toJson(res, error?.status || 500, { error: error?.message || 'internal_error' });
    }
  });

  app.post('/api/v1/extension/chat', async (req, res) => {
    try {
      const ownerId = extractOwnerId(req);
      if (!ownerId) return toJson(res, 401, { error: 'jwt_required' });
      const authHeader = req.headers.authorization
        || (req.headers['x-lifeos-token'] ? `Bearer ${req.headers['x-lifeos-token']}` : null);
      return toJson(res, 200, await chat(ownerId, req.body || {}, authHeader));
    } catch (error) {
      logger?.error?.({ error }, 'extension_chat_failed');
      return toJson(res, error?.status || 500, { error: error?.message || 'internal_error' });
    }
  });

  return {
    getStatus,
    getContextSuggestions,
    fillForm,
    chat,
  };
}