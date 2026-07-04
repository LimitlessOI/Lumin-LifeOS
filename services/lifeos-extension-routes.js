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

  async function chat(ownerId, body) {
    const userMessage = normalizeText(body?.message || body?.text || body?.prompt);
    const [userContextRow, interactions] = await Promise.all([
      getLatestUserContext(ownerId),
      getRecentInteractions(ownerId, 10),
    ]);

    const pageContext = {
      userContext: userContextRow?.context || null,
      recentInteractions: interactions.map((row) => row.interaction_data),
      userMessage: userMessage || null,
    };

    const response = await callCouncilMember('openai', {
      taskType: 'general',
      pageContext,
      prompt: userMessage || 'Respond using the provided overlay context.',
    }, { taskType: 'general' });

    return {
      ok: true,
      response: response?.response || response || null,
    };
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
      return toJson(res, 200, await chat(ownerId, req.body || {}));
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