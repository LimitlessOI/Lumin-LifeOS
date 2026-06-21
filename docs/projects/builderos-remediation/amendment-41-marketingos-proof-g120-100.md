<!-- SYNOPSIS: Documentation — Amendment 41 Marketingos Proof G120 100. -->

Amendment 41: MarketingOS Proof G120-100 Remediation Blueprint Note
Source Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
Signal: This document — SSOT foundation.
---
This blueprint note addresses the implementation gap for "MarketingOS Proof G120-100" as outlined in Amendment 41. The objective is to establish a verifiable, auditable mechanism within MarketingOS for generating this specific proof, ensuring compliance and internal reporting accuracy without impacting customer-facing surfaces.
1. Exact Missing Implementation or Proof Gap
The current MarketingOS platform lacks a dedicated, auditable mechanism to generate "Proof G120-100". This proof, as defined by Amendment 41, requires the aggregation and attestation of specific marketing campaign performance metrics over a defined period. The gap is the absence of:
-   A standardized data aggregation pipeline for G120-100 metrics.
-   An internal apiEP or scheduled job to trigger and retrieve the proof.
-   A verifiable output format for the proof (e.g., signed JSON, immutable record).
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves introducing a new internal service and endpoint within MarketingOS dedicated solely to G120-100 proof generation. This slice will:
1.  Define a new internal data aggregation function for G120-100 metrics.
2.  Expose this function via a new, authenticated internal apiEP.
3.  Return the aggregated proof data in a structured, verifiable format (e.g., JSON with a timestamp and version).
4.  Log proof generation events for auditability.
This slice avoids modifying existing customer-facing features or core data models, focusing purely on the internal proof generation requirement.
3. Exact Safe-Scope Files to Touch First
Based on existing Node/ESM patterns within MarketingOS:
-   `src/marketingos/services/proofs/g120ProofGenerator.js`: New module containing the core logic for aggregating G120-100 data. This will encapsulate data retrieval from existing MarketingOS data sources (e.g., `src/marketingos/data/campaignRepository.js`) and apply the specific aggregation rules.
-   `src/marketingos/controllers/internal/g120ProofController.js`: New controller to handle requests for G120-100 proof generation. It will orchestrate calls to `g120ProofGenerator.js`.
-   `src/marketingos/routes/internal/proofs.js`: Extend this existing internal routes file (or create if not present) to define a new GET endpoint, e.g., `/internal/proofs/g120-100`, which maps to `g120ProofController.js`.
-   `src/marketingos/config/proofs.js`: (New or existing) Configuration file for G120-100 specific parameters, such as data retention policies or aggregation window defaults.
-   `src/marketingos/utils/auditLogger.js`: (Existing) Integrate logging calls for proof generation events.
4. Verifier/Runtime Checks
-   API Endpoint Test: Make an authenticated GET request to `/internal/proofs/g120-100` with valid date range parameters. Verify that the response is a 200 OK, contains a JSON object with expected G120-100 metrics, and includes a timestamp and version.
-   Data Integrity Check: Manually verify a sample of generated proof data against raw campaign data in the MarketingOS db for a specific period, ensuring aggregation rules are correctly applied.
-   Audit Log Verification: Check MarketingOS internal logs for successful proof generation events, including the request parameters and outcome.
-   Performance Monitoring: Monitor the latency and resource consumption of the new endpoint to ensure it does not negatively impact MarketingOS stability.
5. Stop Conditions if Runtime Truth Disagrees
-   Data Mismatch: If the generated proof data consistently deviates from expected values based on raw data and aggregation rules, indicating a fundamental flaw in the `g120ProofGenerator.js` logic.
-   Endpoint Failure: If the `/internal/proofs/g120-100` endpoint consistently returns errors (e.g., 5xx status codes) or fails to respond within acceptable latency thresholds.
-   Security Vulnerability: If any security audit or penetration test identifies vulnerabilities related to the new endpoint or data access patterns.
-   Unacceptable Performance Impact: If the proof generation process significantly degrades the performance of other critical MarketingOS services or consumes excessive resources.
-   Non-Compliance: If the generated proof fails to meet the specific verifiability or auditability requirements outlined in Amendment 41.