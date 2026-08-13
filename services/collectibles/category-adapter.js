/**
 * SYNOPSIS: Exports createCategoryAdapterRegistry — services/collectibles/category-adapter.js.
 * @typedef {object} CategoryAdapter
 * @property {(input: string) => string | null} identify - Given an arbitrary string, returns a canonical identity string for an item in this category, or null if it cannot be identified.
 * @property {(candidate: string) => boolean} resolveIdentity - Given a canonical identity string, returns true if it is valid for this category, false otherwise.
 * @property {(identity: string, opts?: object) => Promise<number | null>} price - Given a canonical identity string, returns the current market price for the item, or null if no price is available.
 * @property {() => object} conditionSchema - Returns a JSON schema for valid condition properties for items in this category.
 */

/**
 * Creates a registry for collectible category adapters.
 *
 * @returns {object} An object with methods to register, retrieve, and list category adapters.
 * @property {(adapter: CategoryAdapter) => void} register - Registers a category adapter.
 * @property {(categoryId: string) => CategoryAdapter | undefined} get - Retrieves a category adapter by its ID.
 * @property {() => CategoryAdapter[]} list - Returns an array of all registered category adapters.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
export function createCategoryAdapterRegistry() {
  const adapters = new Map();

  return {
    /**
     * Registers a category adapter.
     * @param {CategoryAdapter} adapter - The adapter to register.
     */
    register(adapter) {
      if (!adapter || typeof adapter.identify !== 'function' || typeof adapter.resolveIdentity !== 'function' || typeof adapter.price !== 'function' || typeof adapter.conditionSchema !== 'function') {
        throw new Error('Invalid CategoryAdapter: missing required methods (identify, resolveIdentity, price, conditionSchema).');
      }
      const categoryId = adapter.identify('__CATEGORY_ID_TEST__'); // Use a special input to get the category ID
      if (!categoryId || typeof categoryId !== 'string') {
        throw new Error('CategoryAdapter must return a non-null string for identify("__CATEGORY_ID_TEST__") to serve as its ID.');
      }
      if (adapters.has(categoryId)) {
        console.warn(`Category adapter for ID "${categoryId}" already registered. Overwriting.`);
      }
      adapters.set(categoryId, adapter);
    },

    /**
     * Retrieves a category adapter by its ID.
     * @param {string} categoryId - The ID of the category.
     * @returns {CategoryAdapter | undefined} The registered adapter, or undefined if not found.
     */
    get(categoryId) {
      return adapters.get(categoryId);
    },

    /**
     * Returns an array of all registered category adapters.
     * @returns {CategoryAdapter[]} An array of registered adapters.
     */
    list() {
      return Array.from(adapters.values());
    },
  };
}