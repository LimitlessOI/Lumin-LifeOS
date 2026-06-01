@ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
Patch Plan: routes/marketing-routes.js (Amendment 41, Task 9)

1. Goal in plain English.
To safely integrate new marketing-related routing logic, as specified in Amendment 41, Build Order Task 9, into the existing `routes/marketing-routes.js` file, ensuring no disruption to existing functionality.

2. Why the original target is blocked or high-risk.
The original target `routes/marketing-routes.js` is blocked due to `ZONE3_PATCH_REQUIRED`. This indicates that direct modification carries a high risk of introducing regressions or violating established architectural patterns. A carefully planned, minimal, and isolated patch strategy is essential to mitigate these risks and ensure system stability.

3. Exact controlling blueprint excerpt summary.
From `docs/projects/AMENDMENT_41_MARKETINGOS.md`, Build Order Task 9 specifies: "Integrate new marketing campaign tracking routes into `routes/marketing-routes.js`. These routes must handle `POST /marketing/campaign/:id/track` and `GET /marketing/campaign/:id/status` with appropriate middleware for authentication and logging. Ensure existing routes are untouched." This mandates the addition of two specific API endpoints.

4. Smallest safe helper-extraction or surgical patch strategy.
The strategy involves surgically adding the two new routes directly into the `routes/marketing-routes.js` file. This will entail importing any necessary controller functions (e.g., `trackCampaign`, `getCampaignStatus`) and relevant middleware (e.g., `authMiddleware`, `logMiddleware`) and then defining the `router.post()` and `router.get()` calls. No new helper files or significant refactoring should occur; the focus is on minimal, additive changes within the existing file structure.

5. Required verifier checks.
-   **Syntax Check**: Verify `routes/marketing-routes.js` maintains valid Node.js/ESM syntax after modification.
-   **Route Existence**: Confirm `POST /marketing/campaign/:id/track` and `GET /marketing/campaign/:id/status` are correctly defined and accessible.
-   **Existing Route Integrity**: Ensure no pre-existing routes within `routes/marketing-routes.js` have been altered, removed, or negatively impacted.
-   **Middleware Application**: Validate that the specified authentication and logging middleware are correctly applied to the newly added routes.
-   **No Feature Changes**: Confirm that no product features or customer-facing surfaces have been inadvertently modified.
-   **File Scope**: Verify that changes are strictly confined to `routes/marketing-routes.js` and no new files were created.

6. What BuilderOS should attempt next through C2.
BuilderOS should proceed with generating the specific code changes for `routes/marketing-routes.js`. This involves:
    a. Identifying the appropriate location within the file to add new routes.
    b. Importing placeholder or existing controller functions (e.g., `marketingController.trackCampaign`, `marketingController.getCampaignStatus`).
    c. Importing necessary middleware (e.g., `authMiddleware`, `loggingMiddleware`).
    d. Adding `router.post('/marketing/campaign/:id/track', authMiddleware, loggingMiddleware, marketingController.trackCampaign);`
    e. Adding `router.get('/marketing/campaign/:id/status', authMiddleware, loggingMiddleware, marketingController.getCampaignStatus);`
    f. Ensuring the existing `router` export remains intact.

7. What must not be changed.
-   Any existing route definitions, their handlers, or their order within `routes/marketing-routes.js`.
-   The overall file structure, imports, or exports of `routes/marketing-routes.js` beyond the necessary additions.
-   Any files or modules outside of `routes/marketing-routes.js`.
-   Core application logic, database schemas, or environment variables.
-   LifeOS user features or TSOS customer-facing surfaces.