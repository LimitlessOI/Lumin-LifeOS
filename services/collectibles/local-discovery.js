/**
 * SYNOPSIS: Exports createLocalDiscoveryService — services/collectibles/local-discovery.js.
 * @typedef {object} Collectible
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} imageUrl
 * @property {number} price
 * @property {string} city
 * @property {string} location
 */

/**
 * @typedef {object} CollectibleEvent
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} date
 * @property {string} time
 * @property {string} city
 * @property {string} location
 */

/**
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 * @param {object} dependencies
 * @param {object} dependencies.pool - A database connection pool.
 * @returns {object} An object containing local discovery and event calendar services.
 */
export function createLocalDiscoveryService({ pool }) {
  /**
   * Fetches a list of collectible items available in a specific city.
   * @param {string} city - The city to search for collectibles.
   * @returns {Promise<Collectible[]>} A promise that resolves to an array of collectibles.
   */
  const getLocalInventory = async (city) => {
    // In a real application, this would query a database using the provided pool.
    // For this stub, we return mock data.
    console.log(`Fetching local inventory for city: ${city} using pool:`, pool);
    return [
      {
        id: 'coll-001',
        name: 'Vintage Vinyl Record',
        description: 'Rare first pressing of a classic album.',
        imageUrl: 'https://example.com/vinyl.jpg',
        price: 150.00,
        city: city,
        location: 'Record Store XYZ',
      },
      {
        id: 'coll-002',
        name: 'Antique Postcard Set',
        description: 'Collection of postcards from the early 20th century.',
        imageUrl: 'https://example.com/postcard.jpg',
        price: 45.00,
        city: city,
        location: 'Antiques Emporium',
      },
    ];
  };

  /**
   * Fetches a list of collectible-related events happening in a specific city.
   * @param {string} city - The city to search for events.
   * @returns {Promise<CollectibleEvent[]>} A promise that resolves to an array of collectible events.
   */
  const getEventCalendar = async (city) => {
    // In a real application, this would query a database using the provided pool.
    // For this stub, we return mock data.
    console.log(`Fetching event calendar for city: ${city} using pool:`, pool);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        id: 'event-001',
        name: 'Local Comic Con',
        description: 'Annual gathering for comic book and pop culture enthusiasts.',
        imageUrl: 'https://example.com/comiccon.jpg',
        date: today.toISOString().split('T')[0],
        time: '10:00 AM',
        city: city,
        location: 'Convention Center',
      },
      {
        id: 'event-002',
        name: 'Vintage Toy Fair',
        description: 'Buy, sell, and trade vintage toys and action figures.',
        imageUrl: 'https://example.com/toyfair.jpg',
        date: tomorrow.toISOString().split('T')[0],
        time: '09:00 AM',
        city: city,
        location: 'Community Hall',
      },
    ];
  };

  return {
    getLocalInventory,
    getEventCalendar,
  };
}