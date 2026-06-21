<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G889 100. -->

Amendment 46: BuilderOS Control Plane Proof - G889-100

Blueprint Note: BuilderOS Control Plane Wiring for `/build` Endpoints Remediation

This note outlines the remediation plan for the BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`, addressing the OIL verifier rejection. The previous submission attempted to embed executable code directly into this markdown file, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`. This document now serves as the proof-closing blueprint note, detailing the required implementation.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of explicit route definitions and handler logic within `routes/lifeos-council-builder-routes.js` for the `/build` start and complete endpoints. Specifically:
- A `POST /build/start` endpoint to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
- A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`, incorporating `canMarkBuildDone` health checks.
- Proper import and utilization of internal BuilderOS control plane functions.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and their respective handlers. These handlers will call existing internal BuilderOS service functions.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their logic.
- (Assumed) `services/builder-control-plane.js` (or similar): This file is assumed to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions, which will be imported into the routes file. No modification to this file is required for this slice, only consumption.

### 4. Verifier/Runtime Checks

To confirm successful implementation:
- **Route Registration:** Verify that `POST /build/start` and `POST /build/complete` are active and reachable.
- **`recordBuildStart` Invocation:** A `POST` request to `/build/start` with `task_id`, `blueprint_id`, and `model_used` in the body should result in a successful 200 response and a confirmed call to `recordBuildStart` with the correct parameters.
- **`recordBuildComplete` Invocation:** A `POST` request to `/build/complete` with `token` and `OIL receipt IDs` in the body should result in a successful 200 response and a confirmed call to `recordBuildComplete`.
- **`canMarkBuildDone` Health Check:** When `canMarkBuildDone()` (simulating a RED health state) returns `false`, a `POST` request to `/build/complete` must return a 409 Conflict status code. When `canMarkBuildDone()` returns `true`, it should proceed to call `recordBuildComplete`.
- **Isolation:** Confirm no unintended side effects on LifeOS user features or TSOS customer-facing surfaces.

### 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted if any of the following conditions are observed:
- The `/build/start` or `/build/complete` routes are not accessible or return unexpected HTTP status codes (e.g., 404, 500) under normal operating conditions.
- `recordBuildStart` or `recordBuildComplete` are demonstrably not invoked or are invoked with incorrect parameters during successful route calls.
- The 409 Conflict response for `/build/complete` when `canMarkBuildDone` is `false` is not observed, or if a 409 is returned when `canMarkBuildDone` is `true`.
- Any regression or functional change is detected in existing LifeOS user features or TSOS customer-facing surfaces.