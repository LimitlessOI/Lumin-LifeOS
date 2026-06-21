<!-- SYNOPSIS: Amendment 46 - BuilderOS Control Plane Proof (G595-100) -->

export const blueprintNote = `
# Amendment 46 - BuilderOS Control Plane Proof (G595-100)

This document serves as a proof-closing blueprint note for the implementation of BuilderOS control plane wiring as specified in \`AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md\`.

## 1. Exact Missing Implementation / Proof Gap

The \`routes/lifeos-council-builder-routes.js\` module requires the following additions to fully implement the BuilderOS control plane wiring:

-   **\`POST /build/start\` Endpoint:** A new route handler is needed to capture the initiation of a build process. This handler must internally call \`recordBuildStart({ task_id, blueprint_id, model_used })\`.
-   **