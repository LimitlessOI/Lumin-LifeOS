BuilderOS Remediation: Amendment 01 AI Council - Token Savings Monitoring (TODO-8-G6)
Blueprint Enhancement Memo

This memo outlines a builder-ready enhancement slice for the Amendment 01 AI Council blueprint, specifically addressing the open task related to `savings_pct` in `*tul`. The goal is to establish foundational monitoring to understand and improve token usage efficiency.

---

### 1. Blocking Ambiguity or Founder Decision List

The core blueprint task highlights `savings_pct > 0` for most calls in `*tul`. To proceed with a buildable slice, the following founder decisions are required:

*   **Definition of "Most Calls":** Clarify the threshold or criteria for "most calls." Is it a percentage (e.g., >50%, >75%) of all `*tul` entries, or calls exceeding a certain token cost, or calls within specific service contexts?
*   **Target `savings_pct` Range/Threshold:** Is there a desired minimum `savings_pct` to achieve or maintain? What constitutes an "unacceptable" `savings_pct`?
*   **Actionability of Monitoring:** Beyond mere observation, what is the intended action or escalation path if `savings_pct` falls below a target or deviates significantly? Is this slice purely for data gathering, or does it feed into an automated optimization loop?
*   **Reporting Destination & Frequency:** Where should the aggregated `savings_pct` metrics be reported (e.g., specific dashboard, internal Slack channel, email digest)? How frequently should this report be generated (e.g., hourly, daily, weekly)?

---

### 2. Already-Settled Constraints

*   **Execution Environment:** BuilderOS-only governed loop execution.
*   **Scope:** Do not modify LifeOS user features or TSOS customer-facing surfaces.
*   **Implementation:** Implement exactly what the instruction asks for inside approved builder safe scope.
*   **Focus:** The primary focus is on monitoring and reporting `savings_pct` derived from `*tul` data.
*   **Output Format:** This document itself is a markdown file.

---

### 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on establishing a basic, non-invasive mechanism to extract, aggregate, and report `savings_pct` data from `*tul` entries. This slice will provide visibility without introducing complex decision-making or automated actions.

**Objective:** Create a scheduled job or script that processes recent `*tul` data to calculate and log key `savings_pct` metrics.

**Key Activities:**
1.  **Data Extraction:** Read `*tul` entries for a defined period (e.g., last 24 hours).
2.  **Filtering:** Identify entries containing a `savings_pct` field.
3.  **Aggregation:** Calculate:
    *   Count of calls with `savings_pct > 0`.
    *   Total count of calls with `savings_pct` present.
    *   Average `savings_pct` across all relevant calls.
    *   Median `savings_pct`.
4.  **Logging/Reporting:** Output these aggregated metrics to a designated internal log or simple report file.

---

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

The following files are within the safe scope for this initial slice. BuilderOS should prioritize creating or modifying these:

*   `docs/projects/builderos-remediation/amendment-01-ai-council-todo-8-g6.md` (This document itself)
*   `jobs/token-savings-monitor/run.js` (New Node.js script for data processing and aggregation)
*   `jobs/token-savings-monitor/package.json` (Dependencies for the new job, if any)
*   `config/jobs/token-savings-monitor.json` (Configuration for scheduling and parameters, e.g., `lookback_hours`)
*   `services/logging/internalMetricsLogger.js` (If a dedicated internal logger exists, extend it to accept new metric types, otherwise log to console/file)

---

### 5. Required Verifier/Runtime Checks

*   **File Existence & Format:** Verify `jobs/token-savings-monitor/run.js` exists and is a valid Node.js ESM module.
*   **`*tul` Data Access:** Confirm the job can successfully read and parse `*tul` data.
*   **`savings_pct` Presence:** Verify that `savings_pct` fields are correctly identified and extracted from `*tul` entries.
*   **Metric Calculation Accuracy:** Runtime checks to ensure `count > 0`, `total count`, `average`, and `median savings_pct` are calculated correctly and produce sensible values (e.g., `savings_pct` between 0 and 100).
*   **Output Verification:** Confirm the aggregated metrics are logged or reported to the intended destination in the expected format.
*   **No Side Effects:** Automated checks to ensure no modifications to LifeOS user features or TSOS customer-facing surfaces.

---

### 6. Stop Conditions

This slice is considered complete when:

*   The `jobs/token-savings-monitor/run.js` script successfully executes on a schedule.
*   Aggregated `savings_pct` metrics are consistently generated and logged/reported.
*   The founder decisions outlined in Section 1 are provided, enabling the next iteration of the blueprint.
*   The output of this monitoring slice is consumed by the AI Council or a