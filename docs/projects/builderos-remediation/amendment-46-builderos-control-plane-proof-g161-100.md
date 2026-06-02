Amendment 46 BuilderOS Control Plane Proof - G161-100

This document outlines the implementation plan to wire the BuilderOS control plane routes as specified in Amendment 46, focusing on `routes/lifeos-council-builder-routes.js`.

1. Exact Missing Implementation or Proof Gap
The `routes/lifeos-council-builder-routes.js` file requires new POST endpoints to manage the BuilderOS build lifecycle:
-   A `/build` endpoint to initiate a build, calling `builderService.recordBuildStart`.
-   A `/build/complete` endpoint to finalize a build, calling `builderService.recordBuildComplete` and conditionally checking `builderService.canMarkBuildDone`.
The `canMarkBuildDone` check needs to be integrated