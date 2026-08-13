/**
 * SYNOPSIS: Exports createTransactionService — services/collectibles/transaction-service.js.
 */
import { Pool } from 'pg';

/**
 * @typedef {object} Transaction
 * @property {string} id - Unique identifier for the transaction.
 * @property {string} buyerId - ID of the user initiating the purchase.
 * @property {string} sellerId - ID of the user selling the item.
 * @property {string} collectibleId - ID of the collectible being transacted.
 * @property {number} price - Price of the collectible (in major currency units).
 * @property {string} currency - ISO 4217 currency code.
 * @property {'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED'} status - Current status of the transaction.
 * @property {Date} createdAt - Timestamp when the transaction was created.
 * @property {Date} updatedAt - Timestamp when the transaction was last updated.
 * @property {string | null} paymentProviderTransactionId - ID from the payment provider, if applicable.
 * @property {string | null} tradeOfferId - ID of the associated trade offer, if applicable.
 */

/**
 * @typedef {object} CollectibleBalanceUpdate
 * @property {string} collectibleId - The ID of the collectible.
 * @property {string} ownerId - The ID of the current owner.
 * @property {string} newOwnerId - The ID of the new owner.
 */

/**
 * @typedef {object} CashBalanceUpdate
 * @property {string} userId - The ID of the user whose balance is being updated.
 * @property {number} amount - The amount to add or subtract (positive for add, negative for subtract).
 * @property {string} currency - The currency of the amount.
 */

/**
 * @typedef {object} TransactionService
 * @property {(
 *   buyerId: string,
 *   sellerId: string,
 *   collectibleId: string,
 *   price: number,
 *   currency: string
 * ) => Promise<Transaction>} createBuyTransaction - Initiates a new buy transaction.
 * @property {(
 *   transactionId: string,
 *   paymentProviderTransactionId: string
 * ) => Promise<Transaction>} confirmTransactionPayment - Marks a transaction as confirmed after payment.
 * @property {(transactionId: string) => Promise<Transaction>} cancelTransaction - Cancels a pending transaction.
 * @property {(
 *   initiatorId: string,
 *   offerId: string,
 *   offeredCollectibleId: string,
 *   requestedCollectibleId: string,
 *   cashAmount: number,
 *   currency: string
 * ) => Promise<Transaction>} createTradeTransaction - Initiates a new trade transaction.
 * @property {(transactionId: string) => Promise<Transaction>} getTransactionById - Retrieves a transaction by its ID.
 * @property {(transaction: Transaction) => Promise<CollectibleBalanceUpdate>} stubUpdateCollectibleOwnership - Placeholder for updating collectible ownership.
 * @property {(transaction: Transaction) => Promise<CashBalanceUpdate[]>} stubUpdateCashBalances - Placeholder for updating cash balances.
 */

/**
 * Creates a transaction service for managing collectible buy, sell, and trade operations.
 * This service manages the state machine for transactions, handles object and cash balancing stubs,
 * and ensures transaction state is separate from payment provider interactions.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @param {{ pool: Pool }} options - Configuration options.
 * @param {Pool} options.pool - PostgreSQL connection pool.
 * @returns {TransactionService} The transaction service instance.
 */
export function createTransactionService({ pool }) {

  /**
   * Creates a new transaction record in the database.
   * @param {string} buyerId - The ID of the buyer.
   * @param {string} sellerId - The ID of the seller.
   * @param {string} collectibleId - The ID of the collectible.
   * @param {number} price - The price of the collectible.
   * @param {string} currency - The currency.
   * @param {string | null} tradeOfferId - Optional ID of the associated trade offer.
   * @returns {Promise<Transaction>} The created transaction.
   */
  const createTransactionRecord = async (buyerId, sellerId, collectibleId, price, currency, tradeOfferId = null) => {
    const query = `
      INSERT INTO transactions (buyer_id, seller_id, collectible_id, price, currency, status, trade_offer_id)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
      RETURNING id, buyer_id, seller_id, collectible_id, price, currency, status, created_at, updated_at, payment_provider_transaction_id, trade_offer_id;
    `;
    const values = [buyerId, sellerId, collectibleId, price, currency, tradeOfferId];
    const { rows } = await pool.query(query, values);
    const row = rows[0];
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      collectibleId: row.collectible_id,
      price: parseFloat(row.price),
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentProviderTransactionId: row.payment_provider_transaction_id,
      tradeOfferId: row.trade_offer_id,
    };
  };

  /**
   * Updates the status of an existing transaction.
   * @param {string} transactionId - The ID of the transaction to update.
   * @param {'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED'} newStatus - The new status.
   * @param {string | null} paymentProviderTransactionId - Optional payment provider transaction ID.
   * @returns {Promise<Transaction>} The updated transaction.
   */
  const updateTransactionStatus = async (transactionId, newStatus, paymentProviderTransactionId = null) => {
    const query = `
      UPDATE transactions
      SET status = $1, payment_provider_transaction_id = COALESCE($2, payment_provider_transaction_id), updated_at = NOW()
      WHERE id = $3
      RETURNING id, buyer_id, seller_id, collectible_id, price, currency, status, created_at, updated_at, payment_provider_transaction_id, trade_offer_id;
    `;
    const values = [newStatus, paymentProviderTransactionId, transactionId];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      throw new Error(`Transaction with ID ${transactionId} not found.`);
    }
    const row = rows[0];
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      collectibleId: row.collectible_id,
      price: parseFloat(row.price),
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentProviderTransactionId: row.payment_provider_transaction_id,
      tradeOfferId: row.trade_offer_id,
    };
  };

  /**
   * Initiates a new buy transaction.
   * This function creates a pending transaction record. Actual payment processing
   * and fund transfers are handled externally.
   *
   * @param {string} buyerId - ID of the user initiating the purchase.
   * @param {string} sellerId - ID of the user selling the item.
   * @param {string} collectibleId - ID of the collectible being transacted.
   * @param {number} price - Price of the collectible (in major currency units).
   * @param {string} currency - ISO 4217 currency code.
   * @returns {Promise<Transaction>} The created transaction object with 'PENDING' status.
   */
  const createBuyTransaction = async (buyerId, sellerId, collectibleId, price, currency) => {
    return createTransactionRecord(buyerId, sellerId, collectibleId, price, currency);
  };

  /**
   * Marks a transaction as confirmed after a successful payment.
   * This function should only be called after the payment provider confirms the payment.
   *
   * @param {string} transactionId - The ID of the transaction to confirm.
   * @param {string} paymentProviderTransactionId - The transaction ID from the payment provider.
   * @returns {Promise<Transaction>} The updated transaction object with 'CONFIRMED' status.
   */
  const confirmTransactionPayment = async (transactionId, paymentProviderTransactionId) => {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found.`);
    }
    if (transaction.status !== 'PENDING') {
      throw new Error(`Transaction ${transactionId} cannot be confirmed from status ${transaction.status}.`);
    }
    return updateTransactionStatus(transactionId, 'CONFIRMED', paymentProviderTransactionId);
  };

  /**
   * Cancels a pending transaction.
   * This typically happens if payment fails or the buyer/seller cancels before confirmation.
   *
   * @param {string} transactionId - The ID of the transaction to cancel.
   * @returns {Promise<Transaction>} The updated transaction object with 'CANCELLED' status.
   */
  const cancelTransaction = async (transactionId) => {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found.`);
    }
    if (transaction.status !== 'PENDING') {
      throw new Error(`Transaction ${transactionId} cannot be cancelled from status ${transaction.status}.`);
    }
    return updateTransactionStatus(transactionId, 'CANCELLED');
  };

  /**
   * Initiates a new trade transaction, which can involve exchanging collectibles and/or cash.
   * This creates a pending transaction record. The actual transfer of collectibles and cash
   * is handled in subsequent steps (e.g., after trade offer acceptance and payment confirmation).
   *
   * @param {string} initiatorId - The ID of the user initiating the trade.
   * @param {string} offerId - The ID of the associated trade offer.
   * @param {string} offeredCollectibleId - The ID of the collectible being offered by the initiator.
   * @param {string} requestedCollectibleId - The ID of the collectible being requested by the initiator.
   * @param {number} cashAmount - The amount of cash involved (positive if initiator pays cash, negative if initiator receives cash).
   * @param {string} currency - The currency for any cash component.
   * @returns {Promise<Transaction>} The created transaction object with 'PENDING' status.
   */
  const createTradeTransaction = async (initiatorId, offerId, offeredCollectibleId, requestedCollectibleId, cashAmount, currency) => {
    // For a trade, we can model it as two "sides" or a single complex transaction.
    // For simplicity, let's assume a single transaction record for the entire trade offer.
    // The 'buyer' and 'seller' fields might need reinterpretation or additional fields.
    // For now, let's use the initiator as buyer and the counterparty (not directly available here) as seller.
    // This example simplifies by creating a record for the *requested* collectible with the cash component.
    // A more robust solution might require a separate `trade_transactions` table or more complex logic.
    // For the purpose of this exercise, we'll create a "buy" transaction from the initiator's perspective
    // for the *requested* item, with the cash amount. The collectible being offered will be handled in the stub.
    // This is an oversimplification for the prompt's scope.
    const buyerId = initiatorId;
    // This needs to be the owner of the requestedCollectibleId, which isn't passed here.
    // For now, we'll use a placeholder or assume this is derived later.
    const sellerId = 'UNKNOWN_COUNTERPARTY_ID'; // Placeholder, needs actual counterparty from offer.

    // If cashAmount is positive, initiator (buyer) is paying cash.
    // If cashAmount is negative, initiator (buyer) is receiving cash (seller pays cash).
    // The 'price' field is overloaded here to represent the cash component of the trade.
    return createTransactionRecord(buyerId, sellerId, requestedCollectibleId, Math.abs(cashAmount), currency, offerId);
  };

  /**
   * Retrieves a transaction by its unique ID.
   *
   * @param {string} transactionId - The ID of the transaction to retrieve.
   * @returns {Promise<Transaction | null>} The transaction object, or null if not found.
   */
  const getTransactionById = async (transactionId) => {
    const query = `
      SELECT id, buyer_id, seller_id, collectible_id, price, currency, status, created_at, updated_at, payment_provider_transaction_id, trade_offer_id
      FROM transactions
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [transactionId]);
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      collectibleId: row.collectible_id,
      price: parseFloat(row.price),
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentProviderTransactionId: row.payment_provider_transaction_id,
      tradeOfferId: row.trade_offer_id,
    };
  };

  /**
   * Stub function for updating collectible ownership.
   * In a real system, this would interact with a collectible inventory service.
   *
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<CollectibleBalanceUpdate>} Details of the collectible ownership update.
   */
  const stubUpdateCollectibleOwnership = async (transaction) => {
    console.log(`STUB: Updating collectible ownership for transaction ${transaction.id}`);
    // Simulate ownership transfer
    return {
      collectibleId: transaction.collectibleId,
      ownerId: transaction.sellerId, // Old owner
      newOwnerId: transaction.buyerId, // New owner
    };
  };

  /**
   * Stub function for updating user cash balances.
   * In a real system, this would interact with a financial ledger service.
   * This service does NOT hold customer funds.
   *
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<CashBalanceUpdate[]>} Details of the cash balance updates.
   */
  const stubUpdateCashBalances = async (transaction) => {
    console.log(`STUB: Updating cash balances for transaction ${transaction.id}`);
    const updates = [];
    if (transaction.status === 'CONFIRMED' && transaction.price > 0) {
      // Buyer pays, seller receives
      updates.push({
        userId: transaction.buyerId,
        amount: -transaction.price, // Deduct from buyer
        currency: transaction.currency,
      });
      updates.push({
        userId: transaction.sellerId,
        amount: transaction.price, // Add to seller
        currency: transaction.currency,
      });
    } else if (transaction.status === 'REFUNDED' && transaction.price > 0) {
      // Refund: seller pays back, buyer receives
      updates.push({
        userId: transaction.sellerId,
        amount: -transaction.price, // Deduct from seller
        currency: transaction.currency,
      });
      updates.push({
        userId: transaction.buyerId,
        amount: transaction.price, // Add to buyer
        currency: transaction.currency,
      });
    }
    return updates;
  };

  return {
    createBuyTransaction,
    confirmTransactionPayment,
    cancelTransaction,
    createTradeTransaction,
    getTransactionById,
    stubUpdateCollectibleOwnership,
    stubUpdateCashBalances,
  };
}
