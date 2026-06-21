<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G629 100. -->

Amendment 46: BuilderOS Control Plane Proof - G629-100

Proof-Closing Blueprint Note

This document outlines the missing implementation and the plan to close the proof gap for Amendment 46, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js` for build start and completion events.

1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of a `POST /build` endpoint within `routes/lifeos-council-builder-routes.js` that can handle both build start and completion events. Specifically:
- The `POST /build` endpoint needs to internally call `recordBuildStart({ task_id, blueprint_id, model_used })` when a build start event is received (e.g., identified by