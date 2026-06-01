Proof-Closing Blueprint Note: Amendment 01 AI Council - Proof G91-100
1. Exact Missing Implementation or Proof Gap
The blueprint `AMENDMENT_01_AI_COUNCIL.md` mandates the establishment of foundational data feeds for the AI Council to perform its governance functions. Specifically, proof points G91-100 require the initial implementation of a mechanism to collect and expose core system health metrics (e.g., API latency, error rates, resource utilization) from existing LifeOS monitoring infrastructure. The current gap is the absence of this automated, internal-facing data aggregation and exposure service, which is a prerequisite for any subsequent AI Council reporting or dashboarding initiatives.
2. Smallest Safe Build Slice to Close It
Implement a new, internal-only Node service responsible for aggregating predefined system health metrics. This service will query existing LifeOS monitoring endpoints (e.g., Prometheus, internal logging services) and expose the collected, summarized data via a new, read-only internal apiEP. This slice focuses exclusively on the data aggregation logic and the API exposure, without involving any UI, complex analytics, or persistent storage beyond what's necessary for immediate aggregation.
3. Exact Safe-Scope Files to Touch First
-   `src/services/ai-council-metrics/index.js`: New module for the AI Council metrics aggregation logic.
-   `src/services/ai-council-metrics/aiCouncilMetrics.routes.js`: New route definitions for the internal metrics apiEP.
-   `src/services/ai-council-metrics/aiCouncilMetrics.schema.js`: New Joi/Zod schema for validating the output of the metrics API.
-   `src/routes/internal.routes.js`: Integration point to mount the new `aiCouncilMetrics.routes.js` under the `/internal` prefix.
-   `src/config/metrics.js`: (If not present, create; otherwise, extend) Configuration for specific metrics to be collected, including their source endpoints and aggregation rules.
-   `docs/api/internal/ai-council-metrics.md`: Documentation for the new internal apiEP.
4. Verifier/Runtime Checks
1.  API Endpoint Accessibility: Verify that the new internal apiEP `/internal/ai-council/metrics` is reachable and returns a 200 OK status code.
2.  Data Structure Conformance: Confirm that the JSON response from the API strictly adheres to the schema defined in `aiCouncilMetrics.schema.js`, including expected fields like `timestamp`, `metricName`, `value`, and `unit`.
3.  Data Freshness: Validate that the returned metrics reflect recent system state, ideally within the last 60 seconds, by comparing `timestamp` values against current time.
4.  Error Handling: Test the API with invalid query parameters (if any are introduced) to ensure appropriate error responses (e.g., 400 Bad Request) are returned without crashing the service.
5.  Resource Utilization: Monitor the new service's CPU and memory usage to ensure it operates within acceptable limits and does not introduce significant overhead to the LifeOS platform.
5. Stop Conditions if Runtime Truth Disagrees
1.  If the API endpoint is consistently unreachable or returns non-200 status codes for valid requests, halt and investigate network configuration or service startup issues.
2.  If the API response schema deviates from `aiCouncilMetrics.schema.js`, stop and correct the data serialization logic or schema definition.
3.  If metrics data is consistently stale (e.g., timestamps older than 5 minutes), pause and debug the data aggregation and source querying mechanisms.
4.  If the service exhibits high CPU (>50% sustained) or memory (>500MB sustained) usage under typical load, stop and optimize the aggregation logic or resource management.
5.  If the service introduces new, unhandled errors into existing LifeOS monitoring logs, halt and address the root cause to prevent system instability.