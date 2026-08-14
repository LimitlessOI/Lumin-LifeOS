/**
 * SYNOPSIS: Exports createSellAgent — services/collectibles/sell-agent.js.
 * @typedef {object} SellAgentOptions
 * @property {import('pg').Pool} pool - The PostgreSQL connection pool.
 */

/**
 * @typedef {'fast' | 'balanced' | 'max-net'} NetProceedsStrategy
 */

/**
 * @typedef {object} SellAgentResult
 * @property {boolean} success - True if the sell operation was successful.
 * @property {string} message - A descriptive message about the outcome.
 * @property {number | null} transactionId - The ID of the created transaction, if successful.
 * @property {number | null} netProceeds - The calculated net proceeds, if successful.
 * @property {string[] | null} warnings - Any warnings generated during the sell process.
 */

/**
 * @typedef {object} SellAgentInput
 * @property {string} collectibleId - The ID of the collectible to sell.
 * @property {number} askingPrice - The price the user wants to sell the collectible for.
 * @property {NetProceedsStrategy} strategy - The strategy for calculating net proceeds.
 */

/**
 * @callback SellAgentFunction
 * @param {SellAgentInput} input
 * @returns {Promise<SellAgentResult>}
 */

/**
 * Creates a sell agent instance for executing one-motion collectible sales.
 *
 * This agent integrates with the `MASTER_BLUEPRINT V4 Intelligent Commerce` system
 * to provide a streamlined selling experience. It supports various net proceeds
 * strategies and includes regret warnings for items marked with sentimental tags.
 *
 * @param {SellAgentOptions} options - Configuration options for the sell agent.
 * @returns {SellAgentFunction} An async function to perform the sell operation.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
export function createSellAgent({ pool }) {
  return async ({ collectibleId, askingPrice, strategy }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Simulate fetching collectible details and sentimental tags
      // In a real system, this would involve database queries.
      const collectibleDetails = {
        id: collectibleId,
        currentOwnerId: 'user123', // Assume a current owner
        tags: ['rare', 'vintage'],
        value: 100, // Example current estimated value
      };

      // Simulate sentimental tag check
      const sentimentalTags = ['gift', 'heirloom', 'first-edition'];
      const hasSentimentalTag = collectibleDetails.tags.some(tag => sentimentalTags.includes(tag));
      const warnings = [];

      if (hasSentimentalTag) {
        warnings.push(`Warning: This collectible has sentimental tags (${collectibleDetails.tags.filter(tag => sentimentalTags.includes(tag)).join(', ')}). Are you sure you wish to sell?`);
      }

      // Simulate net proceeds calculation based on strategy
      let netProceeds = 0;
      let serviceFeeRate = 0;

      switch (strategy) {
        case 'fast':
          serviceFeeRate = 0.15; // Higher fee for faster processing
          break;
        case 'balanced':
          serviceFeeRate = 0.10; // Moderate fee
          break;
        case 'max-net':
          serviceFeeRate = 0.05; // Lower fee, potentially slower sale
          break;
        default:
          serviceFeeRate = 0.10; // Default to balanced if strategy is unknown
          warnings.push(`Unknown strategy '${strategy}', defaulting to 'balanced'.`);
      }

      const serviceFee = askingPrice * serviceFeeRate;
      netProceeds = askingPrice - serviceFee;

      // Simulate transaction creation
      const insertTransactionQuery = `
        INSERT INTO transactions (collectible_id, seller_id, buyer_id, asking_price, final_price, service_fee, net_proceeds, status, strategy, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id;
      `;
      // For a one-motion sell, we might assume a buyer is found immediately or it enters a marketplace
      // For this simulation, we'll just create a 'pending' transaction.
      const transactionStatus = 'pending_sale'; // Or 'completed' if buyer is immediate
      const transactionResult = await client.query(insertTransactionQuery, [
        collectibleId,
        collectibleDetails.currentOwnerId,
        null, // Buyer ID would be determined upon actual sale match
        askingPrice,
        askingPrice, // Assuming final price is asking price for now
        serviceFee,
        netProceeds,
        transactionStatus,
        strategy,
      ]);
      const transactionId = transactionResult.rows[0].id;

      await client.query('COMMIT');

      return {
        success: true,
        message: `Collectible ${collectibleId} listed for sale with asking price ${askingPrice}.`,
        transactionId,
        netProceeds,
        warnings: warnings.length > 0 ? warnings : null,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error in sell agent for collectible ${collectibleId}:`, error);
      return {
        success: false,
        message: `Failed to list collectible ${collectibleId} for sale: ${error.message}`,
        transactionId: null,
        netProceeds: null,
        warnings: null,
      };
    } finally {
      client.release();
    }
  };
}