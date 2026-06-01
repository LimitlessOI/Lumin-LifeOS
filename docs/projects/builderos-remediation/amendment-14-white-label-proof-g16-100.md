Amendment 14: White Label Proof - Remediation for g16-100
This document serves as a proof-closing blueprint note for the remediation of Amendment 14, specifically addressing the white label proof generation for `g16-100`.
---
Blueprint Note: Next Smallest Build Slice
1. Exact Missing Implementation or Proof Gap:
The specific data fetching and application logic for `g16-100` within the existing white-label proof generation service is incomplete or incorrect, leading to a failure in producing the customized proof artifact. The core gap is the integration of `g16-100`'s unique configuration and data into the generic proof templating engine.

2. Smallest Safe Build Slice to Close It:
Implement a dedicated `g16-100` configuration and data provider module. This module will encapsulate all `g16-100`-specific data retrieval and transformation logic, exposing a standardized interface that the existing `whiteLabelProofService` can consume. This minimizes changes to the core service and isolates client-specific logic.

3. Exact Safe-Scope Files to Touch First:
*   `src/services/proof-generation/g16-100-config-provider.js` (new file)
*   `src/services/proof-generation/whiteLabelProofService.js` (to import and utilize `g16-100-config-provider` when `g16-100` is the target)
*   `src/tests/services/proof-generation/g16-100-config-provider.test.js` (new file)

4. Verifier/Runtime Checks:
*   **Unit Tests:** Run `src/tests/services/proof-generation/g16-100-config-provider.test.js` to ensure the provider correctly fetches and formats `g16-100` data.
*   **Integration Test:** Trigger a `g16-100` white-label proof generation request via the BuilderOS API.
*   **Output Verification:** Inspect the generated proof artifact for `g16-100` to confirm it contains the correct branding, data points, and is free of placeholders or errors.
*   **Log Monitoring:** Monitor BuilderOS logs for any errors or warnings related to `g16-100` proof generation.

5. Stop Conditions if Runtime Truth Disagrees:
*   If unit tests for `g16-100-config-provider` fail.
*   If the BuilderOS API call for `g16-100` proof generation returns an error or times out.
*   If the generated `g16-100` proof artifact is malformed, incomplete, or contains incorrect client-specific data/branding.
*   If the `whiteLabelProofService` logs errors indicating a failure to integrate with the new `g16-100-config-provider`.
*   **Action:** Rollback the changes. Investigate the source of `g16-100` configuration data, the contract between the config provider and the proof service, or the templating engine's ability to consume the provided data.