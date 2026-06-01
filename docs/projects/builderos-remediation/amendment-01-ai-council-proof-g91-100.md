# Proof-Closing Blueprint Note: Amendment 01 AI Council - Proof G91-100

## 1. Exact Missing Implementation or Proof Gap

The blueprint `AMENDMENT_01_AI_COUNCIL.md` mandates the establishment of foundational data feeds for the AI Council to perform its governance functions. Specifically, proof points G91-100 require the initial implementation of a mechanism to collect and expose core system health metrics (e.g., API latency, error rates, resource utilization) from existing LifeOS monitoring infrastructure. The current gap is the absence of this automated, internal-facing data aggregation and exposure service, which is a prerequisite for any subsequent AI Council reporting or dashboarding initiatives.

## 2. Smallest Safe Build Slice to Close It

Implement a new, internal-only Node.js service responsible for aggregating predefined system health metrics. This service will query existing LifeOS monitoring endpoints (e.g., Prometheus, internal logging services) and expose the collected, summarized data via a new, read-only internal API endpoint. This slice focuses exclusively on the data aggregation logic and the API exposure, without involving any UI, complex analytics, or persistent storage beyond what's necessary for immediate aggregation.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/ai-council-metrics/index.js`: New module for the AI Council metrics aggregation logic.
*   `src/services/ai-council-metrics/aiCouncilMetrics.routes.js`: New route definitions for the internal metrics API endpoint.
*   `src/services/ai-council-metrics/aiCouncilMetrics.schema.js`: New Joi/Zod schema for validating the output of the metrics API.
*   `src/routes/internal.routes.js`: Integration point to mount the new `aiCouncilMetrics.routes.js` under the `/internal` prefix.
*   `src/config/metrics.js`: (If not present, create; otherwise, extend) Configuration for specific metrics to be collected, including their source endpoints and aggregation rules.
*   `docs/api/internal/ai-council-metrics.md`: Documentation for the new internal API endpoint.

## 4. Verifier/Runtime Checks

1.  **API Endpoint Accessibility**: Verify that the new internal API endpoint `/internal/ai-council/metrics` is reachable and returns a 200 OK status code.
2.  **Data Structure Conformance**: Confirm that the JSON response from the API strictly adheres to the schema defined in `aiCouncilMetrics.schema.js`, including expected fields like `timestamp