Blueprint Enhancement Memo: AMENDMENT_09_LIFE_COACHING - Todo 2 (G7)
This memo addresses the blocking condition: "No `routes/life-coaching-routes.js` file exists yet," which currently prevents direct build of `AMENDMENT_09_LIFE_COACHING.md`. The primary goal of this remediation step is to establish the foundational routing file for life coaching features and integrate it correctly into the existing LifeOS application architecture.

1.  Blocking Ambiguity / Founder Decision List:
    -   Initial Functional Endpoint Definition: While a placeholder `GET /health` endpoint will be implemented for initial integration and verification, a founder decision is required to define the first concrete, functional endpoint(s) for life coaching. This could involve endpoints for managing coaching sessions, client progress tracking, or goal setting. Without this, further feature development is blocked.
    -   Base Path for Life Coaching Routes: Confirm the desired base path for all life coaching API endpoints. Assuming `/api/life-coaching` as a standard API prefix for this initial slice.

2.  Already-Settled Constraints:
    -   Node.js with ESM syntax for all new and modified JavaScript files.
    -   Express.js framework for API routing.
    -   New routes must be integrated into the main application entry point (e.g., `app.js`).
    -   No modifications to existing LifeOS user features or TSOS customer-facing surfaces.
    -   The `routes/life-coaching-routes.js` file must export an instance of an Express Router.
    -   Adherence to existing LifeOS API patterns for response structure and error handling (where applicable for a simple health check).

3.  Smallest Buildable Next Slice:
    -   Create `routes/life-coaching-routes.js`.
    -   Inside `routes/life-coaching-routes.js`, define and export an Express Router.
    -   Add a `GET /health` endpoint to this router that responds with HTTP status 200 and a JSON body `{ "status": "ok" }`.
    -   Modify the main application file (e.g., `app.js`) to import the `lifeCoachingRoutes` router and mount it under the base path `/api/life-coaching`.

4.  Exact Safe-Scope Files BuilderOS Should Touch First:
    -   `routes/life-coaching-routes.js` (new file creation)
    -   `app.js` (modification for router import and mounting)

5.  Required Verifier/Runtime Checks:
    -   File Existence Check: Verify `routes/life-coaching-routes.js` exists.
    -   File Content Check: Confirm `routes/life-coaching-routes.js` exports an Express Router and includes the `/health` endpoint.
    -   Integration Check: Verify `app.js` correctly imports and mounts `lifeCoachingRoutes` under `/api/life-coaching`.
    -   Runtime API Test: Send a `GET` request to `/api/life-coaching/health`. Expect HTTP status 200 and JSON response `{ "status": "ok" }`.

6.  Stop Conditions:
    -   The file `routes/life-coaching-routes.js` is created, contains an exported Express Router, and includes the `/health` endpoint.
    -   The `lifeCoachingRoutes` router is successfully integrated into the main application via `app.js`.
    -   The `/api/life-coaching/health` endpoint is fully functional and passes all runtime verification checks.