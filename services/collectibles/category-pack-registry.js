/**
 * SYNOPSIS: Exports createCategoryPackRegistry — services/collectibles/category-pack-registry.js.
 * @typedef {object} CategoryPack
 * @property {string} id - Unique identifier for the pack.
 * @property {string} name - Display name of the pack.
 * @property {string} category - The category this pack belongs to (e.g., 'sports', 'comics', 'coins').
 * @property {string} description - A brief description of the pack's contents.
 * @property {string[]} items - List of item IDs included in the pack.
 * @property {string} certificationStatus - The certification status of the adapter for this pack (e.g., 'certified', 'pending', 'unsupported').
 * @property {Date} createdAt - Timestamp when the pack was created.
 * @property {Date} updatedAt - Timestamp when the pack was last updated.
 */

/**
 * @typedef {object} CategoryPackRegistry
 * @property {function(string): Promise<CategoryPack | undefined>} getPackById - Retrieves a category pack by its ID.
 * @property {function(string): Promise<CategoryPack[]>} getPacksByCategory - Retrieves all category packs for a given category.
 * @property {function(): Promise<CategoryPack[]>} getAllPacks - Retrieves all registered category packs.
 * @property {function(CategoryPack): Promise<CategoryPack>} registerPack - Registers a new category pack.
 * @property {function(string, Partial<CategoryPack>): Promise<CategoryPack | undefined>} updatePack - Updates an existing category pack.
 * @property {function(string): Promise<boolean>} deletePack - Deletes a category pack by its ID.
 */

/**
 * Creates a registry for managing category-specific collectible packs.
 * This registry extends beyond traditional TCG packs to encompass various categories
 * like sports, comics, coins, etc., leveraging a universal Twin model for core data.
 * It also tracks the certification status of the adapter used for each pack category.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @returns {CategoryPackRegistry} An object providing methods to interact with the category pack registry.
 */
export function createCategoryPackRegistry() {
  const packs = new Map(); // Simulating a data store

  /**
   * Retrieves a category pack by its ID.
   * @param {string} id - The unique identifier of the pack.
   * @returns {Promise<CategoryPack | undefined>} The category pack if found, otherwise undefined.
   */
  async function getPackById(id) {
    return packs.get(id);
  }

  /**
   * Retrieves all category packs for a given category.
   * @param {string} category - The category to filter packs by.
   * @returns {Promise<CategoryPack[]>} An array of category packs belonging to the specified category.
   */
  async function getPacksByCategory(category) {
    return Array.from(packs.values()).filter(pack => pack.category === category);
  }

  /**
   * Retrieves all registered category packs.
   * @returns {Promise<CategoryPack[]>} An array of all category packs.
   */
  async function getAllPacks() {
    return Array.from(packs.values());
  }

  /**
   * Registers a new category pack.
   * @param {CategoryPack} packData - The data for the new category pack.
   * @returns {Promise<CategoryPack>} The registered category pack.
   */
  async function registerPack(packData) {
    if (packs.has(packData.id)) {
      throw new Error(`Pack with ID ${packData.id} already exists.`);
    }
    const now = new Date();
    const newPack = {
      ...packData,
      createdAt: now,
      updatedAt: now,
      certificationStatus: packData.certificationStatus || 'pending' // Default status
    };
    packs.set(newPack.id, newPack);
    return newPack;
  }

  /**
   * Updates an existing category pack.
   * @param {string} id - The ID of the pack to update.
   * @param {Partial<CategoryPack>} updateData - The partial data to update the pack with.
   * @returns {Promise<CategoryPack | undefined>} The updated category pack, or undefined if not found.
   */
  async function updatePack(id, updateData) {
    const existingPack = packs.get(id);
    if (!existingPack) {
      return undefined;
    }
    const updatedPack = {
      ...existingPack,
      ...updateData,
      updatedAt: new Date()
    };
    packs.set(id, updatedPack);
    return updatedPack;
  }

  /**
   * Deletes a category pack by its ID.
   * @param {string} id - The ID of the pack to delete.
   * @returns {Promise<boolean>} True if the pack was deleted, false otherwise.
   */
  async function deletePack(id) {
    return packs.delete(id);
  }

  return {
    getPackById,
    getPacksByCategory,
    getAllPacks,
    registerPack,
    updatePack,
    deletePack,
  };
}