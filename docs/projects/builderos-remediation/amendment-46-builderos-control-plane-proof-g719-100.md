# Amendment 46: BuilderOS Control Plane Proof - G719-100 Remediation

This document outlines the remediation for the OIL verifier rejection related to Amendment 46, specifically addressing the missing implementation for wiring the BuilderOS control plane routes. The previous attempt incorrectly placed executable JavaScript code within this documentation file, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` during verification.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file requires implementation to wire the `/build` start and complete endpoints to the `builder-control-plane` service functions. Specifically:
- A `POST` endpoint for `/build/start` to invoke `recordBuildStart({ task_id