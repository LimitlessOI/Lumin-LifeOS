@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

# Amendment 41 MarketingOS Marketing Routes Patch Plan (G3)

## 1. Goal in plain English.
The goal is to safely integrate new marketing-specific routes into `routes/marketing-routes.js` as defined by Amendment 41, ensuring that existing routing logic and functionality remain entirely undisturbed. This involves a precise, minimal modification to append the new routes.

## 2. Why the original target is blocked or high-risk.
The target file, `routes/marketing-routes.js`, is designated as `ZONE3_PATCH_REQUIRED`. This classification indicates that it is a critical routing component, potentially handling sensitive or high-traffic paths. Direct, unconstrained modifications carry a high risk of introducing regressions, altering existing route behavior, or disrupting the application's routing integrity. A surgical, isolated approach is mandated to mitigate these risks.

## 3. Exact controlling blueprint excerpt summary.
From `docs/projects/AMENDMENT_41_MARKETINGOS.md`, Build Order Task 9 specifies the addition of new marketing campaign landing page routes. Specifically, it requires the creation of a new `/marketing/campaign/:campaignId` route and a `/marketing/promo/:promoCode` route. These routes should utilize a new `MarketingController` (to be implemented in a subsequent task) for handling requests. The blueprint emphasizes that these additions must be isolated and not interfere with existing `/marketing` sub-routes or other application routes.

## 4. Smallest safe helper-extraction or surgical patch strategy.
The strategy is a surgical patch to `routes/marketing-routes.js`. Assuming `marketing-routes.js` exports an Express Router instance, the plan is to append the new routes directly to this router. A new, clearly demarcated section will be added at the end of the file, specifically for Amendment 41 routes. This section will import the necessary controller (or a placeholder if the controller is not yet available) and define the new GET routes. No existing route definitions, middleware, or export statements will be altered.

```javascript
// Example surgical addition within marketing-routes.js
// ... existing routes and imports ...

// --- AMENDMENT 41: MarketingOS New Routes (BuilderOS G3 Patch) ---
import { getCampaignPage, getPromoPage } from '../controllers/marketingController.js'; // Placeholder, actual path to be confirmed

router.get('/campaign/:campaignId', getCampaignPage);
router.get('/promo/:promoCode', getPromoPage);
// --- END AMENDMENT 41 PATCH ---

export default router;
```

## 5. Required verifier checks.
*   **Functional Check:** Verify that the new `/marketing/campaign/test-campaign` and `/marketing/promo/test-promo` routes are accessible and return a 200 OK status (even if the controller returns a basic response initially).
*   **Regression Check:** Confirm that all pre-existing routes within `marketing-routes.js` (e.g., `/marketing/home`, `/marketing/about`) remain fully functional and return expected responses.
*   **Code Integrity:** Ensure no new global variables, unhandled errors, or unexpected side effects are introduced.
*   **Pattern Adherence:** Confirm the new code adheres to existing file patterns for route definition and module imports/exports.

## 6. What BuilderOS should attempt next through C2.
Upon successful application of this patch and verification of all checks, BuilderOS should proceed to the next task in Amendment 41's build order. This will likely involve the creation or modification of `controllers/marketingController.js` to implement the actual logic for `getCampaignPage` and `getPromoPage`, followed by integration tests.

## 7. What must not be changed.
*   Existing route paths or their associated handlers.
*   The order of existing middleware applied to existing routes.
*   The core export mechanism of `routes/marketing-routes.js`.
*   Any product features or customer-facing surfaces not explicitly part of Amendment 41's marketing route additions.
*   Any environment variables or database schemas.