/**
 * SYNOPSIS: Exports createMediaEvidenceStore — services/collectibles/media-evidence.js.
 * @typedef {object} MediaEvidenceStore
 * @property {(twinId: string, mimeType: string, filename: string, sha256: string, data: Buffer) => Promise<string>} persistMedia
 * @property {(mediaId: string) => Promise<{ twinId: string, mimeType: string, filename: string, sha256: string, data: Buffer } | null>} getMedia
 * @property {(twinId: string) => Promise<Array<{ mediaId: string, mimeType: string, filename: string, sha256: string }>>} listMediaForTwin
 */

/**
 * Creates a media evidence store.
 *
 * This store manages the persistence and retrieval of media evidence
 * associated with collectible twins. It uses a PostgreSQL database
 * to store media data, leveraging `bytea` for binary content.
 * SHA256 hashes are required for content integrity verification.
 *
 * @param {object} params - Parameters for store creation.
 * @param {import('pg').Pool} params.pool - PostgreSQL connection pool.
 * @param {object} params.logger - Logger instance.
 * @param {function(string, ...any): void} params.logger.info - Info logger.
 * @param {function(string, ...any): void} params.logger.error - Error logger.
 * @returns {MediaEvidenceStore} An object containing functions to interact with the media evidence store.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
export function createMediaEvidenceStore({ pool, logger }) {
  /**
   * Persists new media evidence.
   *
   * @param {string} twinId - The ID of the twin associated with this media.
   * @param {string} mimeType - The MIME type of the media (e.g., 'image/jpeg').
   * @param {string} filename - The original filename of the media.
   * @param {string} sha256 - The SHA256 hash of the media data.
   * @param {Buffer} data - The binary content of the media.
   * @returns {Promise<string>} The generated media ID.
   */
  const persistMedia = async (twinId, mimeType, filename, sha256, data) => {
    logger.info(`Persisting media for twin ${twinId}, filename: ${filename}`);
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO media_evidence (twin_id, mime_type, filename, sha256, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING media_id`,
        [twinId, mimeType, filename, sha256, data]
      );
      return result.rows[0].media_id;
    } catch (error) {
      logger.error(`Error persisting media for twin ${twinId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Retrieves media evidence by its ID.
   *
   * @param {string} mediaId - The ID of the media to retrieve.
   * @returns {Promise<{ twinId: string, mimeType: string, filename: string, sha256: string, data: Buffer } | null>} The media object, or null if not found.
   */
  const getMedia = async (mediaId) => {
    logger.info(`Retrieving media with ID: ${mediaId}`);
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT twin_id, mime_type, filename, sha256, data
         FROM media_evidence
         WHERE media_id = $1`,
        [mediaId]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          twinId: row.twin_id,
          mimeType: row.mime_type,
          filename: row.filename,
          sha256: row.sha256,
          data: row.data,
        };
      }
      return null;
    } catch (error) {
      logger.error(`Error retrieving media ${mediaId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Lists metadata for all media evidence associated with a specific twin.
   *
   * @param {string} twinId - The ID of the twin.
   * @returns {Promise<Array<{ mediaId: string, mimeType: string, filename: string, sha256: string }>>} An array of media metadata objects.
   */
  const listMediaForTwin = async (twinId) => {
    logger.info(`Listing media for twin ${twinId}`);
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT media_id, mime_type, filename, sha256
         FROM media_evidence
         WHERE twin_id = $1
         ORDER BY created_at DESC`,
        [twinId]
      );
      return result.rows.map((row) => ({
        mediaId: row.media_id,
        mimeType: row.mime_type,
        filename: row.filename,
        sha256: row.sha256,
      }));
    } catch (error) {
      logger.error(`Error listing media for twin ${twinId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    persistMedia,
    getMedia,
    listMediaForTwin,
  };
}