/**
 * SYNOPSIS: Registers QuoteRoutes routes/handlers (routes/quoteRoutes.js).
 */
export function registerQuoteRoutes(app, deps) {
  const { pool, requireKey, logger, callCouncilMember, baseUrl, commitToGitHub, commitManyToGitHub } = deps || {};

  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new Error('registerQuoteRoutes requires an Express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerQuoteRoutes requires deps.pool');
  }

  const router = app;

  const ok = (res, data) => res.status(200).json({ ok: true, ...data });
  const fail = (res, status, error) => res.status(status).json({ ok: false, error });

  router.get('/api/quotes/pass', async (req, res) => {
    try {
      const tenantId = req.query.tenant_id || req.query.tenantId || null;
      const userId = req.query.user_id || req.query.userId || null;

      const params = [];
      let where = '1=1';

      if (tenantId) {
        params.push(tenantId);
        where += ` AND tenant_id = $${params.length}`;
      }
      if (userId) {
        params.push(userId);
        where += ` AND user_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT id, tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required, created_at, resolved_at, resolved_by
         FROM lifere_approval_queue
         WHERE ${where} AND action_type = 'confirm_pass_quote'
         ORDER BY created_at DESC
         LIMIT 100`,
        params
      );

      return ok(res, { quotes: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'failed to list pass quotes');
      return fail(res, 500, 'Failed to list pass quotes');
    }
  });

  router.post('/api/quotes/pass', requireKey, async (req, res) => {
    try {
      const {
        tenant_id,
        tenantId,
        user_id,
        userId,
        payload,
        draft_text,
        status,
        autonomy_level_required
      } = req.body || {};

      const resolvedTenantId = tenant_id || tenantId || null;
      const resolvedUserId = user_id || userId || null;
      const resolvedStatus = status || 'pending';

      const result = await pool.query(
        `INSERT INTO lifere_approval_queue
          (tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required)
         VALUES ($1, $2, 'confirm_pass_quote', $3, $4, $5, $6)
         RETURNING id, tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required, created_at, resolved_at, resolved_by`,
        [
          resolvedTenantId,
          resolvedUserId,
          payload ?? null,
          draft_text ?? null,
          resolvedStatus,
          autonomy_level_required ?? null
        ]
      );

      return ok(res, { quote: result.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'failed to create pass quote');
      return fail(res, 500, 'Failed to create pass quote');
    }
  });

  router.post('/api/quotes/pass/:id/confirm', requireKey, async (req, res) => {
    try {
      const { id } = req.params;
      const { resolved_by, resolvedBy, tenant_id, tenantId, user_id, userId } = req.body || {};
      const resolvedByValue = resolved_by || resolvedBy || null;

      const { rows: existingRows } = await pool.query(
        `SELECT id, tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required, created_at, resolved_at, resolved_by
         FROM lifere_approval_queue
         WHERE id = $1 AND action_type = 'confirm_pass_quote'
         LIMIT 1`,
        [id]
      );

      if (!existingRows.length) {
        return fail(res, 404, 'Pass quote not found');
      }

      const existing = existingRows[0];
      if ((tenant_id || tenantId) && existing.tenant_id !== (tenant_id || tenantId)) {
        return fail(res, 404, 'Pass quote not found');
      }
      if ((user_id || userId) && existing.user_id !== (user_id || userId)) {
        return fail(res, 404, 'Pass quote not found');
      }

      const update = await pool.query(
        `UPDATE lifere_approval_queue
         SET status = 'resolved',
             resolved_at = NOW(),
             resolved_by = $2
         WHERE id = $1 AND action_type = 'confirm_pass_quote'
         RETURNING id, tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required, created_at, resolved_at, resolved_by`,
        [id, resolvedByValue]
      );

      return ok(res, { quote: update.rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'failed to confirm pass quote');
      return fail(res, 500, 'Failed to confirm pass quote');
    }
  });
}

export default registerQuoteRoutes;