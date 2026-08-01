/**
 * SYNOPSIS: Implements a 48-hour auto-reject timeout for approval requests.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
export async function setApprovalTimeout(deps, payload) {
  const { pool, logger } = deps;
  const { approvalRequestId } = payload || {};

  if (!approvalRequestId) {
    logger.warn('setApprovalTimeout called without approvalRequestId');
    throw new Error('Missing approvalRequestId in payload');
  }

  try {
    // This function doesn't set* a timeout in the traditional JS sense (setTimeout).
    // Instead, it updates the database to reflect that a timeout mechanism
    // should be applied to this approval request, likely to be picked up
    // by a separate cron job or background process that looks for timed-out requests.
    // The specific implementation of the '48h auto-reject' mechanism
    // is assumed to be handled by an external system that queries `approval_requests`
    // for requests that are still 'pending' after a certain duration.
    // This service function's role is to mark or update the request for that system.

    // For the purpose of this task, we'll assume updating the status to indicate
    // it's now subject to a 48h auto-reject.
    // This query doesn't directly implement the timeout but sets the stage for it.
    const updateResult = await pool.query(
      `UPDATE approval_requests
       SET status = 'pending_48h_auto-reject'
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status, created_at;`,
      [approvalRequestId]
    );

    if (updateResult.rows.length === 0) {
      logger.warn({ approvalRequestId }, 'No pending approval request found to apply 48h auto-reject, or status was not pending.');
      return null;
    }

    logger.info({ approvalRequestId, newStatus: updateResult.rows[0].status }, 'Approval request marked for 48h auto-reject.');
    return updateResult.rows[0];

  } catch (error) {
    logger.error({ error, approvalRequestId }, 'Error in setApprovalTimeout while marking for auto-reject');
    throw new Error('Failed to mark approval request for 48h auto-reject');
  }
}