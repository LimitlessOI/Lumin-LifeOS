<!-- SYNOPSIS: Documentation — Command Center V2 Blueprint Proof G97 100. -->

The source blueprint `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md` was not provided, requiring inference for the `data-ingestion-service` context.
Command Center V2 Blueprint Proof: G97-100 - Data Ingestion Service Foundation
This document serves as a proof-closing blueprint note for the Command Center V2 project, focusing on the initial build slice for the `data-ingestion-service`.
---
Blueprint Note: Data Ingestion Service (Initial Implementation)

1.  **Exact Missing Implementation or Proof Gap:**
    The foundational capability to receive and persist raw incoming data for the `data-ingestion-service`. This includes defining a basic API endpoint, minimal data validation, and an initial mechanism for acknowledging receipt.

2.  **Smallest Safe Build Slice to Close It:**
    Implement a single HTTP POST endpoint (`/ingest/raw`) that accepts a JSON payload. This endpoint will perform basic schema validation (e.g., ensuring `timestamp` and `payload` fields are present and are of expected types) and log the raw JSON to standard output or a temporary file for proof-of-concept. The service will return a 200 OK status upon successful receipt and validation, or a 400 Bad Request for invalid payloads.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `services/data-ingestion-service/package.json`: Define service dependencies (e.g., `express`, `joi` for validation).
    *   `services/data-ingestion-service/index.js`: Set up an Express server, define basic middleware, and register the `/ingest/raw` route.
    *   `services/data-ingestion-service/src/handlers/ingestRawHandler.js`: Implement the logic for receiving, validating, and logging