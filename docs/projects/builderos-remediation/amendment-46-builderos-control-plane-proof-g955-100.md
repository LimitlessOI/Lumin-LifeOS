<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof - G955-100: Builder Route Wiring -->

# Amendment 46 BuilderOS Control Plane Proof - G955-100: Builder Route Wiring

This document outlines the proof-closing blueprint note for wiring the BuilderOS control plane routes as specified in Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the implementation of the `/build` start and complete endpoints within `routes/lifeos-council-builder-routes.js`. This includes:
- A `POST /build/start` endpoint to trigger `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
- A `POST /build/complete` endpoint to trigger `recordBuildComplete` with `token` and `OIL receipt IDs`.
- An intermediary check using `canMarkBuildDone` before `recordBuildComplete`. If `canMarkBuildDone` returns `false` (indicating health RED or other blocking conditions), the endpoint must return a `409 Conflict` status.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
- Adding two new POST routes to `routes/lifeos-council-builder-routes.js`.
- Implementing or integrating the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions within a dedicated builder service or controller.
- Ensuring proper request body parsing and validation for incoming data.
- Handling error conditions, specifically the `409 Conflict` for `canMarkBuildDone` failure.

## 3. Exact Safe-Scope Files to Touch First

1.  `routes/