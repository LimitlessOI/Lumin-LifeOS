# BuilderOS Remediation: Amendment 01 AI Council - TODO 8-G6 Blueprint Enhancement Memo

This memo addresses the unchecked task within `AMENDMENT_01_AI_COUNCIL.md` concerning `savings_pct` > 0 in `*tul` (token_usage_log). The goal is to provide a builder-ready enhancement memo to enable the next smallest buildable slice.

## 1. Blocking Ambiguity or Founder Decision List

The core blueprint `AMENDMENT_01_AI_COUNCIL.md` currently lacks specific actionable details regarding `savings_pct`. Before proceeding with any implementation that modifies system behavior, the following decisions are required:

*   **Definition of "Savings Percentage":**
    *   What is the precise formula for `savings_pct`? (e.g., `(original_cost - actual_cost) / original_cost` or `(potential_cost - actual_cost) / potential_cost`?)
    *   How are `original_cost` / `potential_cost` and `actual_cost` derived from `*tul` entries?
    *   Are there specific token types, models, or service calls that `savings_pct` should apply to?
*   **Target/Threshold for `savings_pct`:**
    *   Is there a target `savings_pct` to achieve or maintain?
    *   What constitutes a "successful" `savings_pct` > 0? Is any positive value sufficient, or is there a minimum threshold for action/reporting?
*   **Actionability of `savings_pct`:**
    *   What specific actions are expected when `savings_pct` is observed (e.g., logging, alerting, automatic adjustments to model parameters, routing changes)?
    *   Who is the primary consumer of this `savings_pct` data (e.g., AI Council, specific engineering teams, automated systems)?
*   **Attribution and Granularity:**
    *   How should `savings_pct` be aggregated? Per call, per user, per service, per day/week?
    *   Is cross-service or cross-model attribution required?

## 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modifications to LifeOS user features or TSOS customer-facing surfaces.
*   **Implementation:** Adhere strictly to approved builder safe scope.
*   **Data Source:** `*tul` (token_usage_log) is the primary data source for `savings_pct` observation.
*   **Objective:** The overall objective relates to understanding and potentially optimizing `savings_pct` where it is currently observed to be positive.

## 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on establishing clear observability of the `savings_pct` metric without introducing any behavioral changes or assumptions about its meaning or desired actions.

**Slice Goal:** Implement an internal BuilderOS utility to parse `*tul` entries, extract `savings_pct` (using a placeholder or a basic, agreed-upon definition), and log/report its occurrence and value. This slice will serve as a foundation for data-driven decision-making regarding the ambiguities listed above.

**Key Activities:**
1.  Develop a `TokenUsageLogParser` utility within BuilderOS.
2.  Define a basic `SavingsMetrics` data structure.
3.  Implement a scheduled BuilderOS job to process recent `*tul` entries.
4.  Log aggregated `savings_pct` occurrences and values to an internal BuilderOS log stream or metrics system.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `docs/projects/builderos-remediation/amendment-01-ai-council-todo-8-g6.md` (this document)
*   `builderos/src/utils/tokenUsageLogParser.js` (new file)
*   `builderos/src/metrics/savingsMetrics.js` (new file, defines data structure and basic aggregation)
*   `builderos/src/jobs/processTokenUsageSavings.js` (new file, scheduled job)
*   `builderos/src/config/jobScheduler.js` (update to register new job)
*   `builderos/src/logger/internalLogger.js` (potential update for specific `savings_pct` logging)

## 5. Required Verifier/Runtime Checks

*   **File Integrity:** Ensure `tokenUsageLogParser.js` correctly parses `*tul` entries without errors.
*   **Data Accuracy:** Verify that `savingsMetrics.js` correctly aggregates `savings_pct` values based on the current (even if placeholder) definition.
*   **Job Execution:** Confirm `processTokenUsageSavings.js` runs on schedule and completes without resource exhaustion.
*   **Logging:** Validate that `savings_pct` data is correctly logged to the internal BuilderOS logging system.
*   **Isolation:** Runtime checks must confirm no interaction or side effects on LifeOS or TSOS components.
*   **Performance:** Monitor the impact of `*tul` processing on BuilderOS performance.

## 6. Stop Conditions

This slice is considered complete when:

*   The `TokenUsageLogParser` utility is deployed and stable.
*   The `processTokenUsageSavings` job is successfully running on its defined schedule.
*   Aggregated `savings_pct` data is consistently being logged/reported internally within BuilderOS.
*   All required verifier/runtime checks pass.
*   The ambiguities listed in Section 1 are formally addressed and documented, enabling the next phase of development.