/**
 * SYNOPSIS: Exports createCapabilityRegistryService — services/taloa/capability-registry-service.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

export function createCapabilityRegistryService({ pool, logger }) {
  return {
    async reportCapabilities({ body_id, capabilities, reported_at }) {
      const platform = capabilities?.platform;
      const now = reported_at || new Date();

      const query = `
        INSERT INTO overlay_devices (device_key, platform, last_seen_at, capabilities)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (device_key) DO UPDATE
        SET
          platform = COALESCE(EXCLUDED.platform, overlay_devices.platform),
          last_seen_at = EXCLUDED.last_seen_at,
          capabilities = EXCLUDED.capabilities
        RETURNING *;
      `;
      const values = [body_id, platform, now, capabilities];

      try {
        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (error) {
        logger.error(`Error reporting capabilities for device ${body_id}: ${error.message}`);
        throw error;
      }
    },

    async getCapabilities(body_id) {
      const query = `
        SELECT capabilities
        FROM overlay_devices
        WHERE device_key = $1;
      `;
      const values = [body_id];

      try {
        const result = await pool.query(query, values);
        if (result.rows.length > 0) {
          return result.rows[0].capabilities;
        }
        return null;
      } catch (error) {
        logger.error(`Error getting capabilities for device ${body_id}: ${error.message}`);
        throw error;
      }
    },
  };
}