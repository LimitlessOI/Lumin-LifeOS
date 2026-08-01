/**
 * SYNOPSIS: Logs token usage for AI council interactions, including provider and cost details.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
export async function logUsage(deps, payload) {
  const { pool, logger } = deps;
  const {
    provider,
    model,
    task_type,
    input_tokens,
    output_tokens,
    saved_tokens,
    cache_hit,
    cost_usd,
    saved_cost_usd,
    ccl_used,
    ccl_packet_id,
    ccl_authority_level,
    ccl_round_trip_status,
    ccl_estimated_savings_tokens,
    ccl_quality_result,
    product_lane,
    blueprint_id,
    oil_result,
  } = payload || {};

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO token_usage_log (
        provider, model, task_type, input_tokens, output_tokens, saved_tokens,
        cache_hit, cost_usd, saved_cost_usd, ccl_used, ccl_packet_id,
        ccl_authority_level, ccl_round_trip_status, ccl_estimated_savings_tokens,
        ccl_quality_result, product_lane, blueprint_id, oil_result
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING id, logged_at;
      `,
      [
        provider,
        model,
        task_type,
        input_tokens,
        output_tokens,
        saved_tokens,
        cache_hit,
        cost_usd,
        saved_cost_usd,
        ccl_used,
        ccl_packet_id,
        ccl_authority_level,
        ccl_round_trip_status,
        ccl_estimated_savings_tokens,
        ccl_quality_result,
        product_lane,
        blueprint_id,
        oil_result,
      ],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in logUsage');
    throw new Error('Failed to log token usage');
  }
}