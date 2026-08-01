/**
 * SYNOPSIS: Initiates the funding process for a dream.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export async function initiateDreamFunding(deps, payload) {
  const { pool, logger } = deps;
  const { dreamId, amount } = payload || {}; // Assuming payload contains dreamId and amount
  try {
    // First, verify the dream exists and get current funded_amount
    const { rows: dreamRows } = await pool.query(
      'SELECT id, funded_amount, user_id FROM dreams WHERE id = $1',
      [dreamId]
    );

    if (dreamRows.length === 0) {
      logger.warn({ dreamId }, 'Dream not found for funding initiation.');
      return null;
    }

    const dream = dreamRows[0];
    const newFundedAmount = (dream.funded_amount || 0) + amount;

    // Update the dream's funded_amount
    const { rows: updatedDreamRows } = await pool.query(
      'UPDATE dreams SET funded_amount = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [newFundedAmount, 'funded', dreamId]
    );

    // Record the funding as a self_funding_spending entry
    await pool.query(
      `INSERT INTO self_funding_spending(spending_id, opportunity_name, amount, category, status, execution_data, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        dreamId,
        `Funding for Dream ID: ${dreamId}`,
        amount,
        'Dream Funding', // Assuming 'Dream Funding' is a valid category
        'completed',
        { dreamId, fundedAmount: amount, userId: dream.user_id }
      ]
    );

    logger.info({ dreamId, amount, newFundedAmount }, 'activate Dream Funding for dream.');
    return updatedDreamRows[0];
  } catch (error) {
    logger.error({ error, dreamId, amount }, 'Error in initiateDreamFunding');
    throw new Error('Failed in initiateDreamFunding');
  }
}