/**
 * SYNOPSIS: Exports createWantGraphService — services/collectibles/want-graph.js.
 * @typedef {object} WantGraphService
 * @property {(userId: string, collectibleId: string) => Promise<void>} want
 * @property {(userId: string, collectibleId: string) => Promise<void>} unwant
 * @property {(userId: string) => Promise<Array<{ collectibleId: string }>>} getWants
 * @property {(userId: string, collectibleId: string) => Promise<void>} watch
 * @property {(userId: string, collectibleId: string) => Promise<void>} unwatch
 * @property {(userId: string) => Promise<Array<{ collectibleId: string }>>} getWatches
 * @property {(userId: string, collectibleId: string) => Promise<void>} love
 * @property {(userId: string, collectibleId: string) => Promise<void>} unlove
 * @property {(userId: string) => Promise<Array<{ collectibleId: string }>>} getLoves
 * @property {(userId: string, collectibleId: string) => Promise<void>} needForDeck
 * @property {(userId: string, collectibleId: string) => Promise<void>} unneedForDeck
 * @property {(userId: string) => Promise<Array<{ collectibleId: string }>>} getNeedsForDeck
 * @property {(userId: string, collectibleId: string) => Promise<void>} needForSet
 * @property {(userId: string, collectibleId: string) => Promise<void>} unneedForSet
 * @property {(userId: string) => Promise<Array<{ collectibleId: string }>>} getNeedsForSet
 */

/**
 * Creates a WantGraphService instance for managing user collectible wants.
 * This service handles persistent wants, watches, loves, needs for deck, and needs for set.
 * It does not support auto-listing.
 *
 * @param {object} options - Options for the service.
 * @param {import('pg').Pool} options.pool - The PostgreSQL connection pool.
 * @returns {WantGraphService} An instance of the WantGraphService.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
export function createWantGraphService({ pool }) {
  const ensureTableExists = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_collectible_wants (
        user_id VARCHAR(255) NOT NULL,
        collectible_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'want', 'watch', 'love', 'need_for_deck', 'need_for_set'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, collectible_id, type)
      );
    `);
  };

  ensureTableExists();

  const addWant = async (userId, collectibleId, type) => {
    await pool.query(
      'INSERT INTO user_collectible_wants (user_id, collectible_id, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, collectible_id, type) DO NOTHING',
      [userId, collectibleId, type]
    );
  };

  const removeWant = async (userId, collectibleId, type) => {
    await pool.query(
      'DELETE FROM user_collectible_wants WHERE user_id = $1 AND collectible_id = $2 AND type = $3',
      [userId, collectibleId, type]
    );
  };

  const getWantsByType = async (userId, type) => {
    const { rows } = await pool.query(
      'SELECT collectible_id FROM user_collectible_wants WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC',
      [userId, type]
    );
    return rows;
  };

  return {
    /**
     * Records a 'want' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    want: (userId, collectibleId) => addWant(userId, collectibleId, 'want'),
    /**
     * Removes a 'want' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    unwant: (userId, collectibleId) => removeWant(userId, collectibleId, 'want'),
    /**
     * Retrieves all 'wants' for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<{ collectibleId: string }>>} A list of collectible IDs the user wants.
     */
    getWants: (userId) => getWantsByType(userId, 'want'),

    /**
     * Records a 'watch' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    watch: (userId, collectibleId) => addWant(userId, collectibleId, 'watch'),
    /**
     * Removes a 'watch' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    unwatch: (userId, collectibleId) => removeWant(userId, collectibleId, 'watch'),
    /**
     * Retrieves all 'watches' for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<{ collectibleId: string }>>} A list of collectible IDs the user watches.
     */
    getWatches: (userId) => getWantsByType(userId, 'watch'),

    /**
     * Records a 'love' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    love: (userId, collectibleId) => addWant(userId, collectibleId, 'love'),
    /**
     * Removes a 'love' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    unlove: (userId, collectibleId) => removeWant(userId, collectibleId, 'love'),
    /**
     * Retrieves all 'loves' for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<{ collectibleId: string }>>} A list of collectible IDs the user loves.
     */
    getLoves: (userId) => getWantsByType(userId, 'love'),

    /**
     * Records a 'need for deck' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    needForDeck: (userId, collectibleId) => addWant(userId, collectibleId, 'need_for_deck'),
    /**
     * Removes a 'need for deck' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    unneedForDeck: (userId, collectibleId) => removeWant(userId, collectibleId, 'need_for_deck'),
    /**
     * Retrieves all 'needs for deck' for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<{ collectibleId: string }>>} A list of collectible IDs the user needs for a deck.
     */
    getNeedsForDeck: (userId) => getWantsByType(userId, 'need_for_deck'),

    /**
     * Records a 'need for set' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    needForSet: (userId, collectibleId) => addWant(userId, collectibleId, 'need_for_set'),
    /**
     * Removes a 'need for set' for a collectible by a user.
     * @param {string} userId - The ID of the user.
     * @param {string} collectibleId - The ID of the collectible.
     */
    unneedForSet: (userId, collectibleId) => removeWant(userId, collectibleId, 'need_for_set'),
    /**
     * Retrieves all 'needs for set' for a user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<{ collectibleId: string }>>} A list of collectible IDs the user needs for a set.
     */
    getNeedsForSet: (userId) => getWantsByType(userId, 'need_for_set'),
  };
}