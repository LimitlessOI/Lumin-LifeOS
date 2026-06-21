/**
 * SYNOPSIS: services/memory-institutional.js
 */
// services/memory-institutional.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */

async function recordViolation(incidentType, details, capsuleRef, pool) {
  const result = await pool.query(
    `INSERT INTO agent_protocol_violations (incident_type, details, related_capsule_id, created_at)
     VALUES ($1, $2, $3, NOW()) RETURNING *`,
    [incidentType, JSON.stringify(details), capsuleRef]
  );
  return result.rows[0];
}

async function recordIntentDrift(askedFor, shipped, sessionRef, pool) {
  const result = await pool.query(
    `INSERT INTO intent_drift_events (asked_for, shipped, session_ref, created_at)
     VALUES ($1, $2, $3, NOW()) RETURNING *`,
    [askedFor, shipped, sessionRef]
  );
  return result.rows[0];
}

async function getRepeatedViolations(incidentType, pool) {
  const result = await pool.query(
    `SELECT * FROM agent_protocol_violations WHERE incident_type = $1 ORDER BY created_at DESC`,
    [incidentType]
  );
  return result.rows;
}

async function getRecentIncidents(limit, pool) {
  const result = await pool.query(
    `SELECT * FROM agent_protocol_violations ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export { recordViolation, recordIntentDrift, getRepeatedViolations, getRecentIncidents };
