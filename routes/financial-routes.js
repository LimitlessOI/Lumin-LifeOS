/**
 * Financial & Revenue Routes
 * Extracted from server.js
 *
 * Note: The core financial classes (IncomeDroneSystem, FinancialDashboard)
 * and helper functions (recordRevenueEvent, syncStripeRevenue) are defined
 * in server.js at module level for shared access across all route handlers.
 * This file registers the financial API routes that use those helpers.
 */
import logger from '../services/logger.js';

export function createFinancialRoutes(app, ctx) {
  // All financial classes/helpers (IncomeDroneSystem, FinancialDashboard,
  // recordRevenueEvent, syncStripeRevenue) are module-level in server.js.
  // Routes that use them live in auto-builder-routes.js and command-center-routes.js.
  // No additional routes to register here.
}
