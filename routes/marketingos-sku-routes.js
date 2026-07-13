/**
 * SYNOPSIS: Exports registerMarketingosSkuRoutes — routes/marketingos-sku-routes.js.
 */
import { randomUUID } from 'node:crypto';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseInteger(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function buildPageParams(query = {}) {
  const page = Math.max(1, parseInteger(query.page, 1));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInteger(query.limit, DEFAULT_PAGE_SIZE)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function ok(res, payload, status = 200) {
  return res.status(status).json(payload);
}

function errorResponse(res, status, code, message, details) {
  const body = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}

async function fetchSkuById(pool, skuId) {
  const { rows } = await pool.query(
    `select id, content_id, content_type, content_data, created_at
     from marketing_content
     where content_id = $1
     limit 1`,
    [skuId]
  );
  return rows[0] ?? null;
}

async function listSkus(pool, query) {
  const { page, limit, offset } = buildPageParams(query);
  const status = query.status ? String(query.status) : null;
  const contentType = query.content_type ? String(query.content_type) : null;

  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`coalesce((content_data->>'status'), '') = $${params.length}`);
  }
  if (contentType) {
    params.push(contentType);
    where.push(`content_type = $${params.length}`);
  }

  params.push(limit, offset);
  const sql = `
    select id, content_id, content_type, content_data, created_at
    from marketing_content
    ${where.length ? `where ${where.join(' and ')}` : ''}
    order by created_at desc
    limit $${params.length - 1}
    offset $${params.length}
  `;
  const { rows } = await pool.query(sql, params);
  return { page, limit, items: rows.map(row => ({ ...row, content_data: safeJsonParse(row.content_data, row.content_data) })) };
}

function skuPayloadFromBody(body, existing = null) {
  const content_id = body.content_id ?? existing?.content_id ?? randomUUID();
  const content_type = body.content_type ?? existing?.content_type ?? 'physical-sku';
  const content_data = body.content_data ?? existing?.content_data ?? {};
  return {
    content_id: String(content_id),
    content_type: String(content_type),
    content_data: serializeJson(content_data),
  };
}

export async function registerMarketingosSkuRoutes(app, deps) {
  const { pool, logger, requireKey, commitToGitHub } = deps ?? {};
  if (!pool || typeof pool.query !== 'function') throw new Error('registerMarketingosSkuRoutes requires deps.pool');
  if (typeof logger?.info !== 'function') throw new Error('registerMarketingosSkuRoutes requires deps.logger');
  if (typeof requireKey !== 'function') throw new Error('registerMarketingosSkuRoutes requires deps.requireKey');

  app.get('/api/marketingos/skus', async (req, res) => {
    try {
      const result = await listSkus(pool, req.query ?? {});
      return ok(res, result);
    } catch (err) {
      logger.error({ err }, 'marketingos sku list failed');
      return errorResponse(res, 500, 'sku_list_failed', 'Failed to list marketing SKUs');
    }
  });

  app.get('/api/marketingos/skus/:skuId', async (req, res) => {
    try {
      const row = await fetchSkuById(pool, req.params.skuId);
      if (!row) return errorResponse(res, 404, 'sku_not_found', 'Marketing SKU not found');
      return ok(res, { item: { ...row, content_data: safeJsonParse(row.content_data, row.content_data) } });
    } catch (err) {
      logger.error({ err, skuId: req.params.skuId }, 'marketingos sku fetch failed');
      return errorResponse(res, 500, 'sku_fetch_failed', 'Failed to fetch marketing SKU');
    }
  });

  app.post('/api/marketingos/skus', requireKey, async (req, res) => {
    try {
      const body = parseJsonBody(req);
      const payload = skuPayloadFromBody(body);
      const { rows } = await pool.query(
        `insert into marketing_content (content_id, content_type, content_data)
         values ($1, $2, $3)
         returning id, content_id, content_type, content_data, created_at`,
        [payload.content_id, payload.content_type, payload.content_data]
      );
      const item = { ...rows[0], content_data: safeJsonParse(rows[0].content_data, rows[0].content_data) };
      if (typeof commitToGitHub === 'function' && body?.commit_path && body?.commit_content != null) {
        await commitToGitHub(String(body.commit_path), String(body.commit_content), body.commit_message ? String(body.commit_message) : 'Update marketing SKU');
      }
      return ok(res, { item }, 201);
    } catch (err) {
      logger.error({ err }, 'marketingos sku create failed');
      return errorResponse(res, 500, 'sku_create_failed', 'Failed to create marketing SKU');
    }
  });

  app.post('/api/marketingos/skus/:skuId', requireKey, async (req, res) => {
    try {
      const existing = await fetchSkuById(pool, req.params.skuId);
      if (!existing) return errorResponse(res, 404, 'sku_not_found', 'Marketing SKU not found');
      const body = parseJsonBody(req);
      const next = skuPayloadFromBody(body, { ...existing, content_data: safeJsonParse(existing.content_data, existing.content_data) });
      const { rows } = await pool.query(
        `update marketing_content
         set content_type = $2,
             content_data = $3
         where content_id = $1
         returning id, content_id, content_type, content_data, created_at`,
        [req.params.skuId, next.content_type, next.content_data]
      );
      return ok(res, { item: { ...rows[0], content_data: safeJsonParse(rows[0].content_data, rows[0].content_data) } });
    } catch (err) {
      logger.error({ err, skuId: req.params.skuId }, 'marketingos sku update failed');
      return errorResponse(res, 500, 'sku_update_failed', 'Failed to update marketing SKU');
    }
  });

  app.post('/api/marketingos/skus/:skuId/clone', requireKey, async (req, res) => {
    try {
      const existing = await fetchSkuById(pool, req.params.skuId);
      if (!existing) return errorResponse(res, 404, 'sku_not_found', 'Marketing SKU not found');
      const body = parseJsonBody(req);
      const sourceData = safeJsonParse(existing.content_data, existing.content_data) ?? {};
      const payload = skuPayloadFromBody(body, {
        content_type: existing.content_type,
        content_data: sourceData,
      });
      payload.content_type = body.content_type ? String(body.content_type) : `${existing.content_type}-copy`;
      const { rows } = await pool.query(
        `insert into marketing_content (content_id, content_type, content_data)
         values ($1, $2, $3)
         returning id, content_id, content_type, content_data, created_at`,
        [payload.content_id, payload.content_type, payload.content_data]
      );
      return ok(res, { item: { ...rows[0], content_data: safeJsonParse(rows[0].content_data, rows[0].content_data) } }, 201);
    } catch (err) {
      logger.error({ err, skuId: req.params.skuId }, 'marketingos sku clone failed');
      return errorResponse(res, 500, 'sku_clone_failed', 'Failed to clone marketing SKU');
    }
  });
}

export default registerMarketingosSkuRoutes;