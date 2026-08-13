/**
 * SYNOPSIS: Exports createCollectibleTwinStore — services/collectibles/twin-store.js.
 * @typedef {object} CollectibleTwin
 * @property {string} twinId
 * @property {string} productId
 * @property {string} serialNumber
 * @property {string} status
 * @property {string | null} ownerId
 * @property {string | null} custodianId
 * @property {string | null} locationId
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedBy
 * @property {string} updatedAt
 */

/**
 * @typedef {object} CollectibleTwinStore
 * @property {(twin: Omit<CollectibleTwin, 'createdAt' | 'updatedAt'>) => Promise<CollectibleTwin>} insertTwin
 * @property {(twinId: string) => Promise<CollectibleTwin | null>} getTwin
 * @property {(options?: { productId?: string, ownerId?: string, status?: string, limit?: number, offset?: number }) => Promise<CollectibleTwin[]>} listTwins
 * @property {(twinId: string, updatedBy: string) => Promise<void>} softDeleteTwin
 * @property {(twinId: string, ownerId: string, updatedBy: string) => Promise<void>} updateTwinOwnership
 * @property {(twinId: string, custodianId: string, updatedBy: string) => Promise<void>} updateTwinCustody
 * @property {(twinId: string, locationId: string, updatedBy: string) => Promise<void>} updateTwinLocation
 */

/**
 * Creates a store for managing collectible twins.
 * The Single Source of Truth for this data is defined in:
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 *
 * @param {object} dependencies - The dependencies for the store.
 * @param {import('pg').Pool} dependencies.pool - The PostgreSQL connection pool.
 * @param {import('pino').Logger} dependencies.logger - The logger instance.
 * @returns {CollectibleTwinStore} The collectible twin store.
 */
export function createCollectibleTwinStore({ pool, logger }) {
  /**
   * Inserts a new collectible twin into the database.
   *
   * @param {Omit<CollectibleTwin, 'createdAt' | 'updatedAt'>} twin - The collectible twin data to insert.
   * @returns {Promise<CollectibleTwin>} The created collectible twin.
   */
  const insertTwin = async (twin) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertTwinQuery = `
        INSERT INTO collectible_twins (twin_id, product_id, serial_number, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING twin_id, product_id, serial_number, status, owner_id, custodian_id, location_id, created_by, created_at, updated_by, updated_at;
      `;
      const res = await client.query(insertTwinQuery, [
        twin.twinId,
        twin.productId,
        twin.serialNumber,
        twin.status,
        twin.createdBy,
        twin.updatedBy,
      ]);
      const createdTwin = res.rows[0];

      if (twin.ownerId) {
        await client.query(
          `INSERT INTO ownership_records (entity_id, entity_type, owner_id, assigned_by) VALUES ($1, 'collectible_twin', $2, $3);`,
          [twin.twinId, twin.ownerId, twin.createdBy]
        );
        createdTwin.owner_id = twin.ownerId; // Reflect immediate ownership
      }
      // Custodian and Location are direct updates to collectible_twins
      if (twin.custodianId) {
        await client.query(
          `UPDATE collectible_twins SET custodian_id = $1, updated_by = $2, updated_at = NOW() WHERE twin_id = $3;`,
          [twin.custodianId, twin.updatedBy, twin.twinId]
        );
        createdTwin.custodian_id = twin.custodianId;
      }
      if (twin.locationId) {
        await client.query(
          `UPDATE collectible_twins SET location_id = $1, updated_by = $2, updated_at = NOW() WHERE twin_id = $3;`,
          [twin.locationId, twin.updatedBy, twin.twinId]
        );
        createdTwin.location_id = twin.locationId;
      }

      await client.query('COMMIT');

      return {
        twinId: createdTwin.twin_id,
        productId: createdTwin.product_id,
        serialNumber: createdTwin.serial_number,
        status: createdTwin.status,
        ownerId: createdTwin.owner_id,
        custodianId: createdTwin.custodian_id,
        locationId: createdTwin.location_id,
        createdBy: createdTwin.created_by,
        createdAt: createdTwin.created_at,
        updatedBy: createdTwin.updated_by,
        updatedAt: createdTwin.updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, twin }, 'Failed to insert collectible twin');
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Retrieves a collectible twin by its ID.
   *
   * @param {string} twinId - The ID of the twin to retrieve.
   * @returns {Promise<CollectibleTwin | null>} The collectible twin, or null if not found.
   */
  const getTwin = async (twinId) => {
    const query = `
      SELECT twin_id, product_id, serial_number, status, owner_id, custodian_id, location_id, created_by, created_at, updated_by, updated_at
      FROM collectible_twins
      WHERE twin_id = $1 AND status != 'deleted';
    `;
    const res = await pool.query(query, [twinId]);
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      twinId: row.twin_id,
      productId: row.product_id,
      serialNumber: row.serial_number,
      status: row.status,
      ownerId: row.owner_id,
      custodianId: row.custodian_id,
      locationId: row.location_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    };
  };

  /**
   * Lists collectible twins based on provided filters.
   *
   * @param {object} [options] - Filtering options.
   * @param {string} [options.productId] - Filter by product ID.
   * @param {string} [options.ownerId] - Filter by owner ID.
   * @param {string} [options.status] - Filter by status.
   * @param {number} [options.limit=100] - Limit the number of results.
   * @param {number} [options.offset=0] - Offset for pagination.
   * @returns {Promise<CollectibleTwin[]>} A list of collectible twins.
   */
  const listTwins = async ({ productId, ownerId, status, limit = 100, offset = 0 } = {}) => {
    let query = `
      SELECT twin_id, product_id, serial_number, status, owner_id, custodian_id, location_id, created_by, created_at, updated_by, updated_at
      FROM collectible_twins
      WHERE status != 'deleted'
    `;
    const params = [];
    let paramIndex = 1;

    if (productId) {
      query += ` AND product_id = $${paramIndex++}`;
      params.push(productId);
    }
    if (ownerId) {
      query += ` AND owner_id = $${paramIndex++}`;
      params.push(ownerId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++};`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    return res.rows.map((row) => ({
      twinId: row.twin_id,
      productId: row.product_id,
      serialNumber: row.serial_number,
      status: row.status,
      ownerId: row.owner_id,
      custodianId: row.custodian_id,
      locationId: row.location_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    }));
  };

  /**
   * Soft deletes a collectible twin by updating its status to 'deleted'.
   *
   * @param {string} twinId - The ID of the twin to soft delete.
   * @param {string} updatedBy - The user performing the update.
   * @returns {Promise<void>}
   */
  const softDeleteTwin = async (twinId, updatedBy) => {
    const query = `
      UPDATE collectible_twins
      SET status = 'deleted', updated_by = $2, updated_at = NOW()
      WHERE twin_id = $1;
    `;
    await pool.query(query, [twinId, updatedBy]);
  };

  /**
   * Updates the ownership of a collectible twin.
   * This also creates an entry in ownership_records.
   *
   * @param {string} twinId - The ID of the twin to update.
   * @param {string} ownerId - The ID of the new owner.
   * @param {string} updatedBy - The user performing the update.
   * @returns {Promise<void>}
   */
  const updateTwinOwnership = async (twinId, ownerId, updatedBy) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        UPDATE collectible_twins
        SET owner_id = $1, updated_by = $2, updated_at = NOW()
        WHERE twin_id = $3;
        `,
        [ownerId, updatedBy, twinId]
      );

      await client.query(
        `
        INSERT INTO ownership_records (entity_id, entity_type, owner_id, assigned_by)
        VALUES ($1, 'collectible_twin', $2, $3);
        `,
        [twinId, ownerId, updatedBy]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, twinId, ownerId, updatedBy }, 'Failed to update twin ownership');
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Updates the custody of a collectible twin.
   *
   * @param {string} twinId - The ID of the twin to update.
   * @param {string} custodianId - The ID of the new custodian.
   * @param {string} updatedBy - The user performing the update.
   * @returns {Promise<void>}
   */
  const updateTwinCustody = async (twinId, custodianId, updatedBy) => {
    const query = `
      UPDATE collectible_twins
      SET custodian_id = $1, updated_by = $2, updated_at = NOW()
      WHERE twin_id = $3;
    `;
    await pool.query(query, [custodianId, updatedBy, twinId]);
  };

  /**
   * Updates the location of a collectible twin.
   *
   * @param {string} twinId - The ID of the twin to update.
   * @param {string} locationId - The ID of the new location.
   * @param {string} updatedBy - The user performing the update.
   * @returns {Promise<void>}
   */
  const updateTwinLocation = async (twinId, locationId, updatedBy) => {
    const query = `
      UPDATE collectible_twins
      SET location_id = $1, updated_by = $2, updated_at = NOW()
      WHERE twin_id = $3;
    `;
    await pool.query(query, [locationId, updatedBy, twinId]);
  };

  return {
    insertTwin,
    getTwin,
    listTwins,
    softDeleteTwin,
    updateTwinOwnership,
    updateTwinCustody,
    updateTwinLocation,
  };
}