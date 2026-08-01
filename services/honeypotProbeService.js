/**
 * SYNOPSIS: Provides functions to create and manage honeypot probe routes and write receipt of probes.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
import express from 'express';

// A map to store probe routes and their handlers
const probeRoutes = new Map();

/**
 * SYNOPSIS: Creates a honeypot probe route entry in the database.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
export async function createProbeRoute(deps, payload) {
  const { pool, logger } = deps;
  const { route_path, service_id } = payload;
  try {
    const { rows } = await pool.query(
      'INSERT INTO honeypot_probe_routes(route_path, service_id) VALUES ($1, $2) RETURNING id, route_path, service_id',
      [route_path, service_id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in createProbeRoute');
    throw new Error('Failed to create probe route');
  }
}

/**
 * SYNOPSIS: Writes a probe receipt into the security_receipts table.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
export async function writeProbeReceipt(deps, payload) {
  const { pool, logger } = deps;
  const { receipt_type, payload: receiptPayload, owner_id, security_finding_receipt, severity, repro_steps, exact_fix_target, proof_limits } = payload;
  try {
    const { rows } = await pool.query(
      `INSERT INTO security_receipts(receipt_type, payload, owner_id, security_finding_receipt, severity, repro_steps, exact_fix_target, proof_limits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [receipt_type, receiptPayload, owner_id, security_finding_receipt, severity, repro_steps, exact_fix_target, proof_limits]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error }, 'Error in writeProbeReceipt');
    throw new Error('Failed to write probe receipt');
  }
}

// Add a honeypot probe route and its corresponding handler
export function addHoneypotProbeRoute(routePath, handler) {
  if (!probeRoutes.has(routePath)) {
    probeRoutes.set(routePath, handler);
  }
}

// Get the list of probe routes for external use
export function getProbeRoutes() {
  return Array.from(probeRoutes.keys());
}

// Example usage with an express app
const app = express();

app.use(express.json());

probeRoutes.forEach((handler, routePath) => {
  app.post(routePath, (req, res) => {
    handler(req.body);
    res.status(200).send('Probe received');
  });
});

export { app as honeypotApp };