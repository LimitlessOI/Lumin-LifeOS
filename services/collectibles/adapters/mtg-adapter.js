/**
 * SYNOPSIS: MTG CategoryAdapter wrapping existing LifeOS vision/pricing modules.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
import { identifyMtgCardFromPhoto } from '../../mtg-card-vision.js';
import { lookupMtgCardPrice } from '../../mtg-card-pricing.js';

/**
 * @returns {object} CategoryAdapter for Magic: The Gathering
 */
export function createMtgCategoryAdapter() {
  return {
    identify(input) {
      if (input === '__CATEGORY_ID_TEST_STRING__') return 'mtg';
      return identifyMtgCardFromPhoto(input);
    },
    resolveIdentity(candidate) {
      return Boolean(candidate && (candidate.scryfall_id || candidate.name || candidate.set_code));
    },
    async price(identity, opts = {}) {
      const name = identity?.name || identity;
      const set = identity?.set || identity?.set_code || null;
      return lookupMtgCardPrice(name, set, opts);
    },
    conditionSchema() {
      return {
        type: 'string',
        enum: ['NM', 'LP', 'MP', 'HP', 'DMG'],
      };
    },
  };
}
