<!-- SYNOPSIS: Documentation — Amendment 10 Api Cost Savings Enhancement G3. -->

Amendment 10: API Cost Savings Enhancement - G3 Memo
This memo outlines the next buildable slice for the API Cost Savings initiative, focusing on establishing foundational API usage and cost tracking. This addresses the blueprint's "Phase 1: Identify high-cost, cacheable APIs" by enabling initial data collection.
1. Blocking Ambiguity or Founder Decision List
- A1: Target API Selection: Which specific apiEP should be instrumented first for initial data collection? (e.g., `GET /api/v1/user/profile`, `POST /api/v1/data/process`, or a specific internal service call). This decision impacts the initial scope and visibility of collected data.
- A2: Data Storage Mechanism: What is the preferred storage mechanism for raw API usage data (e.g., in-memory buffer, specific db table, logging service like Splunk/ELK, dedicated metrics store like Prometheus/Grafana)? This impacts data retention, queryability, and infrastructure cost.
- A3: Metric Granularity: What specific metrics are required for initial data collection (e.g., request count, response time, payload size, error rate)? This defines the instrumentation scope.
2. Already-settled Constraints
- Do not modify LifeOS user features or TSOS customer-facing surfaces.
- Focus on internal API usage for cost analysis.
- Initial implementation must be minimal, focusing solely on data collection, not immediate caching or optimization.
- Leverage existing platform patterns for metrics/logging where possible.
3. Smallest Buildable Next Slice
Instrument a single, non-critical, internal apiEP to collect basic request count and response time metrics. Store these metrics in a simple, temporary, in-memory structure or log them to a standard logging stream. This slice aims to prove the instrumentation mechanism and data flow.
4. Exact Safe-Scope Files BuilderOS Should Touch First
- `src/utils/metrics.js`: Create or extend a utility to provide a `recordApiMetric` function.
- `src/api/v1/internal/status.js` (or similar existing internal endpoint handler): Add calls to `recordApiMetric` within the handler for the chosen API.
5. Required Verifier/Runtime Checks
- Verify that the instrumented apiEP still functions correctly (e.g., returns 200 OK).
- Verify that metrics are being collected (e.g., by inspecting application logs for metric output, or a simple in-memory counter if implemented).
- Verify no regressions in other apiEPs or system functionality.
6. Stop Conditions
- The chosen internal apiEP is successfully instrumented.
- Basic request count and response time metrics are collected and observable (e.g., in logs or a simple in-memory store).
- No functional regressions are introduced.