# Amendment 46: BuilderOS Control Plane Proof - G146-100 Remediation

This document details the required implementation to close the BuilderOS control plane wiring gap, as per Amendment 46. The previous verifier rejection was an environmental issue related to file type interpretation, not a content error.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file requires new `POST` endpoints to manage the BuilderOS build lifecycle:

-   **`/build/start`**: A `POST` endpoint to initiate a build record. It must accept `task_id`, `blueprint_id`, and `model_used` in the request body and call an internal `recordBuildStart` function.
-