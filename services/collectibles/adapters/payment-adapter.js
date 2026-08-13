/**
 * SYNOPSIS: Exports createPaymentAdapterRegistry — services/collectibles/adapters/payment-adapter.js.
 * @typedef {object} PaymentProvider
 * @property {function(object): Promise<object>} createCharge - Function to create a charge.
 * @property {function(string): Promise<object>} retrieveCharge - Function to retrieve a charge.
 * @property {function(string): Promise<object>} refundCharge - Function to refund a charge.
 */

/**
 * @typedef {object} PaymentAdapterRegistry
 * @property {function(string): PaymentProvider | undefined} getProvider - Function to get a payment provider by name.
 * @property {function(string, PaymentProvider): void} registerProvider - Function to register a payment provider.
 */

/**
 * Creates a registry for payment adapters.
 * This function provides an abstraction for third-party held-funds providers,
 * ensuring that the system never invents in-house custody of funds.
 * It fails closed if no provider is found for a given name.
 *
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @returns {PaymentAdapterRegistry} A registry object with methods to manage payment providers.
 */
export function createPaymentAdapterRegistry() {
  /** @type {Map<string, PaymentProvider>} */
  const providers = new Map();

  return {
    /**
     * Retrieves a registered payment provider by its name.
     * If no provider is found, it returns undefined, adhering to a fail-closed principle.
     *
     * @param {string} providerName - The name of the payment provider to retrieve.
     * @returns {PaymentProvider | undefined} The payment provider, or undefined if not found.
     */
    getProvider(providerName) {
      return providers.get(providerName);
    },

    /**
     * Registers a new payment provider with a given name.
     *
     * @param {string} providerName - The name to register the payment provider under.
     * @param {PaymentProvider} providerInstance - The instance of the payment provider.
     * @returns {void}
     */
    registerProvider(providerName, providerInstance) {
      providers.set(providerName, providerInstance);
    },
  };
}