# Command Center V2 Blueprint Proof: G10-100 - Initial Data Ingestion Pipeline

This document serves as a proof-closing blueprint note for Proof Gap G10-100, focusing on the initial data ingestion pipeline for core system metrics as outlined in `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`, Phase 1.

---

### Blueprint Note: G10-100

**1. Exact missing implementation or proof gap:**
The core gap is the absence of a functional data ingestion pipeline capable of receiving and persisting core system metrics (CPU, memory, disk I/O) into the Command Center V2's designated data store. This is the foundational step for any subsequent dashboarding or action engine capabilities.

**2. Smallest safe build slice to close it:**
Implement a minimal API endpoint (`POST /api/v2/metrics/ingest`) that accepts a standardized metric payload and stores it. This slice will focus solely on the ingestion mechanism, without immediate integration into a dashboard or complex processing.

**3. Exact safe-scope files to touch first:**
*   `src/routes/commandCenterV2.js`: To define and register the new `/api/v2/metrics/ingest` route.
*   `src/controllers/commandCenterV2MetricsController.js`: To handle the incoming HTTP request, validate the payload, and delegate to a service layer.
*   `src/services/metricIngestionService.js`: To encapsulate the business logic for processing and storing metrics.
*   `src/data/metricRepository.js`: To manage the persistence of metric data (e.g., saving to an in-memory store for initial proof, or a simple file/DB interface).
*   `src/models/Metric.js`: To define the expected data structure for a core system metric.

**4. Verifier/runtime checks:**
*   **API Reachability:** Send a `POST` request to `/api/v2/metrics/ingest` with a valid JSON payload (e.g., `{ "type": "cpu", "value": 75.2, "unit": "%", "timestamp": "2023-10-27T10:00:00Z", "source": "host-1" }`). Verify a `200 OK` or `201 Created` status code is returned.
*   **Data Persistence:** After a successful ingestion, verify that the submitted metric data is retrievable from the underlying `metricRepository` (e.g., via a temporary debug endpoint or direct inspection of the data store).
*   **Error Handling (Invalid Payload):** Send a `POST` request with an invalid or incomplete payload. Verify a `400 Bad Request` status code is returned with an appropriate error message.
*   **Error Handling (Server Issue):** Simulate a data storage failure (if possible) and verify a `5xx` status code is returned.

**5. Stop conditions if runtime truth