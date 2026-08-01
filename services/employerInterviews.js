/**
 * SYNOPSIS: Records an interview with an employer regarding credentials.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
export async function recordEmployerInterview(deps, payload) {
  const { pool, logger } = deps;
  const {
    agent_id,
    call_id,
    recording_url,
    recording_type,
    transcript_segments,
    speaker,
    client_email,
    client_phone,
    property_address,
  } = payload || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO sales_call_recordings (
        agent_id,
        call_id,
        recording_url,
        recording_type,
        transcript_segments,
        speaker,
        client_email,
        client_phone,
        property_address,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, created_at`,
      [
        agent_id,
        call_id,
        recording_url,
        recording_type,
        transcript_segments,
        speaker,
        client_email,
        client_phone,
        property_address,
      ],
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in recordEmployerInterview');
    throw new Error('Failed to record employer interview');
  }
}