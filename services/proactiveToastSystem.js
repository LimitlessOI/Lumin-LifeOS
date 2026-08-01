/**
 * SYNOPSIS: Registers a proactive toast based on user context and preferences.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
export async function registerProactiveToast(deps, payload) {
  const { pool, logger } = deps;
  const { owner_id, message, options } = payload || {};

  if (!owner_id || !message) {
    logger.warn({ payload }, 'Missing owner_id or message in registerProactiveToast payload');
    throw new Error('Missing required payload fields');
  }

  try {
    // Fetch user context and preferences
    const { rows: contextRows } = await pool.query(
      'SELECT context FROM overlay_user_context WHERE owner_id = $1',
      [owner_id]
    );
    const userContext = contextRows[0]?.context || {};

    // For simplicity, we'll store toast interaction data in overlay_interactions
    // This allows for learning dismissal preferences over time.
    // The actual "displaying" of the toast happens on the client side,
    // this service merely records the intent and relevant data.
    const interactionData = {
      type: 'proactive_toast_registration',
      message: message,
      options: options,
      user_context: userContext,
      status: 'pending_display', // Indicates the toast is ready to be displayed by the client
    };

    const { rows: insertRows } = await pool.query(
      `INSERT INTO overlay_interactions (owner_id, interaction_data) VALUES ($1, $2) RETURNING id, created_at`,
      [owner_id, interactionData]
    );

    return {
      id: insertRows[0].id,
      owner_id: owner_id,
      message: message,
      options: options,
      status: 'registered',
      created_at: insertRows[0].created_at,
    };
  } catch (error) {
    logger.error({ error, payload }, 'Error in registerProactiveToast');
    throw new Error('Failed to register proactive toast');
  }
}