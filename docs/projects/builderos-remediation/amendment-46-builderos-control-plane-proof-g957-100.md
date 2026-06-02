# Amendment 46: BuilderOS Control Plane Proof - G957-100

## Proof-Closing Blueprint Note: Wiring `routes/lifeos-council-builder-routes.js`

This document outlines the implementation plan and verification steps for wiring the BuilderOS control plane routes as specified in Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The current `routes/lifeos-council-builder-routes.js` file lacks the necessary endpoints to manage BuilderOS build lifecycle events:
-   A `POST` endpoint for `/build/start` to initiate build recording.
-   A `POST` endpoint for `/build/complete` to finalize build recording and process OIL receipts.
-   Integration of a health check (`canMarkBuildDone`) to prevent build completion under critical conditions.

The proof gap is the absence of these specific route definitions and their associated logic within the designated router file.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and integrating calls to existing or co-developed service functions.

**Proposed `routes/lifeos-council-builder-routes.js` additions:**