/**
 * SYNOPSIS: Exports createCustodyWorkflow — services/collectibles/custody-workflow.js.
 * @typedef {object} CollectibleItem
 * @property {string} id - Unique identifier for the collectible.
 * @property {string} name - Name of the collectible.
 * @property {string} description - Description of the collectible.
 * @property {string} ownerId - The ID of the legal owner of the collectible.
 * @property {string} possessorId - The ID of the entity currently holding the collectible (may differ from owner).
 * @property {string} custodianId - The ID of the entity responsible for the physical care and security of the collectible.
 * @property {string} currentLocation - The current physical location of the collectible.
 * @property {string[]} pastLocations - A history of previous locations.
 * @property {Date} checkInDate - Date when the item was last checked in.
 * @property {Date|null} checkOutDate - Date when the item was last checked out, or null if currently checked in.
 * @property {string|null} lastWorkflowAction - The last action performed in the custody workflow.
 */

/**
 * @typedef {object} CustodyWorkflowService
 * @property {(itemId: string, newLocation: string, custodianId: string) => Promise<CollectibleItem>} checkIn - Records the check-in of a collectible item to a new location under a specified custodian.
 * @property {(itemId: string, newPossessorId: string, newLocation: string, custodianId: string) => Promise<CollectibleItem>} checkOut - Records the check-out of a collectible item, transferring possession and potentially location.
 * @property {(itemId: string) => Promise<CollectibleItem>} getItemDetails - Retrieves the current details of a collectible item.
 * @property {(itemId: string, newOwnerId: string) => Promise<CollectibleItem>} transferOwnership - Transfers legal ownership of a collectible item.
 * @property {(itemId: string, newCustodianId: string) => Promise<CollectibleItem>} assignCustodian - Assigns a new custodian to a collectible item.
 * @property {(itemId: string, newPossessorId: string) => Promise<CollectibleItem>} assignPossessor - Assigns a new possessor to a collectible item.
 */

/**
 * Creates a custody workflow service for managing collectible items.
 * This service handles the transitions and tracking of collectibles through various states
 * including owner, possessor, custodian, and physical location.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @param {object} options - Configuration options for the service.
 * @param {any} options.pool - Database connection pool or similar data access object.
 * @returns {CustodyWorkflowService} An object containing functions for managing collectible custody.
 */
export function createCustodyWorkflow({ pool }) {
  // For the purpose of this example, we'll use a simple in-memory store
  // In a real application, 'pool' would be used for database interactions.
  /** @type {Map<string, CollectibleItem>} */
  const itemStore = new Map();

  // Initialize with some dummy data if the store is empty
  if (itemStore.size === 0) {
    itemStore.set('collectible-001', {
      id: 'collectible-001',
      name: 'Rare Stamp Collection',
      description: 'A valuable collection of vintage stamps.',
      ownerId: 'user-alice',
      possessorId: 'user-alice',
      custodianId: 'user-alice',
      currentLocation: 'Home Vault A1',
      pastLocations: [],
      checkInDate: new Date(),
      checkOutDate: null,
      lastWorkflowAction: 'initial_creation',
    });
    itemStore.set('collectible-002', {
      id: 'collectible-002',
      name: 'Ancient Coin',
      description: 'A rare coin from the Roman Empire.',
      ownerId: 'user-bob',
      possessorId: 'user-bob',
      custodianId: 'user-bob',
      currentLocation: 'Safe Deposit Box B2',
      pastLocations: [],
      checkInDate: new Date(),
      checkOutDate: null,
      lastWorkflowAction: 'initial_creation',
    });
  }

  /**
   * Records the check-in of a collectible item to a new location under a specified custodian.
   * @param {string} itemId - The ID of the collectible item.
   * @param {string} newLocation - The new physical location where the item is checked in.
   * @param {string} custodianId - The ID of the entity taking custody of the item.
   * @returns {Promise<CollectibleItem>} The updated collectible item.
   */
  const checkIn = async (itemId, newLocation, custodianId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }

    if (item.checkOutDate === null) {
        // Already checked in, just update location/custodian if different
        if (item.currentLocation !== newLocation || item.custodianId !== custodianId) {
            item.pastLocations.push(item.currentLocation);
            item.currentLocation = newLocation;
            item.custodianId = custodianId;
            item.lastWorkflowAction = 'location_or_custodian_update_while_checked_in';
        }
        // If nothing changed, still return the item
        return { ...item };
    }

    item.pastLocations.push(item.currentLocation);
    item.currentLocation = newLocation;
    item.custodianId = custodianId;
    item.possessorId = custodianId; // Typically, the custodian becomes the possessor upon check-in
    item.checkInDate = new Date();
    item.checkOutDate = null;
    item.lastWorkflowAction = 'check_in';

    itemStore.set(itemId, item);
    return { ...item };
  };

  /**
   * Records the check-out of a collectible item, transferring possession and potentially location.
   * @param {string} itemId - The ID of the collectible item.
   * @param {string} newPossessorId - The ID of the entity taking possession of the item.
   * @param {string} newLocation - The new physical location where the item is checked out to.
   * @param {string} custodianId - The ID of the entity releasing custody of the item (the previous custodian).
   * @returns {Promise<CollectibleItem>} The updated collectible item.
   */
  const checkOut = async (itemId, newPossessorId, newLocation, custodianId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }

    if (item.checkOutDate !== null) {
      throw new Error(`Collectible item with ID ${itemId} is already checked out.`);
    }

    // A check-out implies the current custodian is releasing the item.
    // The new possessor might also be the new custodian, or it might be an interim state.
    // For simplicity, we'll assume the new possessor becomes the new custodian for now.
    // More complex scenarios (e.g., shipping to a third-party for appraisal) would require
    // additional states or specific workflow steps.
    item.pastLocations.push(item.currentLocation);
    item.currentLocation = newLocation;
    item.custodianId = newPossessorId; // New possessor takes custody upon check-out
    item.possessorId = newPossessorId;
    item.checkOutDate = new Date(); // Marks it as 'checked out' from the *previous* custodian/location
    item.lastWorkflowAction = 'check_out';

    itemStore.set(itemId, item);
    return { ...item };
  };

  /**
   * Retrieves the current details of a collectible item.
   * @param {string} itemId - The ID of the collectible item.
   * @returns {Promise<CollectibleItem>} The collectible item details.
   */
  const getItemDetails = async (itemId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }
    return { ...item };
  };

  /**
   * Transfers legal ownership of a collectible item.
   * This does not necessarily affect physical possession or custody.
   * @param {string} itemId - The ID of the collectible item.
   * @param {string} newOwnerId - The ID of the new legal owner.
   * @returns {Promise<CollectibleItem>} The updated collectible item.
   */
  const transferOwnership = async (itemId, newOwnerId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }
    item.ownerId = newOwnerId;
    item.lastWorkflowAction = 'transfer_ownership';
    itemStore.set(itemId, item);
    return { ...item };
  };

  /**
   * Assigns a new custodian to a collectible item.
   * The custodian is responsible for the physical care and security.
   * @param {string} itemId - The ID of the collectible item.
   * @param {string} newCustodianId - The ID of the new custodian.
   * @returns {Promise<CollectibleItem>} The updated collectible item.
   */
  const assignCustodian = async (itemId, newCustodianId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }
    item.custodianId = newCustodianId;
    item.lastWorkflowAction = 'assign_custodian';
    itemStore.set(itemId, item);
    return { ...item };
  };

  /**
   * Assigns a new possessor to a collectible item.
   * The possessor is the entity currently holding the item.
   * @param {string} itemId - The ID of the collectible item.
   * @param {string} newPossessorId - The ID of the new possessor.
   * @returns {Promise<CollectibleItem>} The updated collectible item.
   */
  const assignPossessor = async (itemId, newPossessorId) => {
    const item = itemStore.get(itemId);
    if (!item) {
      throw new Error(`Collectible item with ID ${itemId} not found.`);
    }
    item.possessorId = newPossessorId;
    item.lastWorkflowAction = 'assign_possessor';
    itemStore.set(itemId, item);
    return { ...item };
  };

  /*
   * Insurance marketing remains legal-gated comments only.
   * This means any functionality related to insurance, especially
   * marketing or promotion of insurance products, should not be
   * implemented or exposed through this service.
   * Future considerations for integration with insurance partners
   * would require separate legal review and explicit approval.
   */

  return {
    checkIn,
    checkOut,
    getItemDetails,
    transferOwnership,
    assignCustodian,
    assignPossessor,
  };
}