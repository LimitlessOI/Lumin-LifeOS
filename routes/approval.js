/**
 * SYNOPSIS: Registers routes for commitment approvals.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
export function registerApproval(app, deps) {
  app.post('/api/v1/approval/commitment', deps.requireKey, async (req, res, next) => {
    try {
      // For now, directly insert into lifere_approval_queue.
      // In a more complex scenario, this would call a dedicated service function
      // that orchestrates the approval process, potentially interacting with
      // other tables or AI services.
      const { tenant_id, user_id, action_type, payload, draft_text, autonomy_level_required } = req.body;

      if (!tenant_id || !user_id || !action_type || !payload) {
        return res.status(400).json({ error: 'Missing required fields for commitment approvals.' });
      }

      const sql = `
        INSERT INTO lifere_approval_queue (tenant_id, user_id, action_type, payload, draft_text, status, autonomy_level_required)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        RETURNING id, created_at;
      `;
      const values = [tenant_id, user_id, action_type, payload, draft_text, autonomy_level_required || 0];
      const result = await deps.pool.query(sql, values);

      res.status(201).json({
        message: 'Commitment approval request submitted successfully.',
        approvalId: result.rows[0].id,
        createdAt: result.rows[0].created_at,
      });
    } catch (error) {
      deps.logger.error({ error }, 'Error in commitment approvals route');
      next(error);
    }
  });
}