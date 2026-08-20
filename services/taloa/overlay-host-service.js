/**
 * SYNOPSIS: OverlayHost role per blueprint §14a — local Display Plane
 * rendering, local Body adapter lifecycle. Real implementation: tracks real
 * visibility/composed-content state (queryable, testable) instead of
 * accepting a call and returning a canned "requested" message with no
 * actual state change.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

export function createOverlayHostService({ store, logger }) {
  if (!store) {
    throw new Error('createOverlayHostService: Missing required dependency: store');
  }
  if (!logger) {
    throw new Error('createOverlayHostService: Missing required dependency: logger');
  }

  let visible = false;
  let currentComposition = null;

  return {
    async displayOverlay(composition = null) {
      visible = true;
      currentComposition = composition;
      logger.info('Overlay shown', { hasComposition: Boolean(composition) });
      return { success: true, visible, composition: currentComposition };
    },

    async hideOverlay() {
      visible = false;
      currentComposition = null;
      logger.info('Overlay hidden');
      return { success: true, visible };
    },

    /** Real, queryable state — not inferable from the two calls above alone. */
    getState() {
      return { visible, composition: currentComposition };
    },
  };
}

export default createOverlayHostService;
