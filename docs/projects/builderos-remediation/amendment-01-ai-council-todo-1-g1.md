BuilderOS Remediation Memo: AMENDMENT_01_AI_COUNCIL - General Task Savings (G1)
Blueprint Task: Improve `general` task type savings from 4% → 15%+ (est: 3h) `[needs-review]`
This memo addresses the `[needs-review]` status of the blueprint task by outlining the next buildable slice to gain clarity and enable founder decision-making.

1. Blocking Ambiguity or Founder Decision List
-   Definition of "General" Task Type: The exact scope and boundaries of what constitutes a `general` task type are undefined. Is it a specific set of task IDs, a category, or tasks not explicitly classified otherwise? Founder decision required on a precise, actionable definition.
-   Mechanism for Savings: The blueprint does not specify *how* the savings are to be achieved (e.g., prompt optimization, model selection, caching, task decomposition, pre-computation, etc.). This is the primary founder decision point.
-   Current Savings Measurement: How is the current 4% savings calculated? What is the baseline cost/time metric? This needs explicit confirmation to ensure consistent measurement towards 15%+. Founder decision required on the exact measurement methodology.
-   Quality/Latency Trade-offs: What are the acceptable trade-offs for output quality and processing latency when pursuing cost savings? Founder decision required on acceptable thresholds.

2. Already-Settled Constraints
-   Target: Achieve 15%+ savings for `general` task types.
-   Current State: 4% savings for `general` task types.
-   Estimated Effort for Blueprint Task: 3 hours (for the entire blueprint task, not this slice).
-   Scope: BuilderOS-only governed loop execution. No modification to LifeOS user features or TSOS customer-facing surfaces.

3. Smallest Buildable Next Slice
The immediate next slice focuses on establishing a clear definition for `general` tasks and a verifiable baseline for current savings. This is foundational for any subsequent optimization efforts.
-   **Objective:** Define `general` task types and establish a robust, reproducible measurement system for current savings.
-   **Deliverable:** A clear, documented definition of `general` tasks and a report demonstrating the 4% baseline savings calculation.

4. Exact Safe-Scope Files BuilderOS Should Touch First
To implement the smallest buildable slice:
-   `src/config/taskDefinitions.js`: Update or create a configuration file to explicitly list or define criteria for `general` task types. This might involve adding a `type: 'general'` property to existing task definitions or creating a new lookup mechanism.
-   `src/services/costMeasurementService.js`: Implement or extend a service responsible for calculating and reporting task costs and savings. This service should expose methods to retrieve the current savings for specified task types.
-   `src/reports/savingsReportGenerator.js`: A script or module to generate the baseline savings report, utilizing the `costMeasurementService`.
-   `docs/system/task_type_definitions.md`: Document the agreed-upon definition of `general` tasks.

5. Required Verifier/Runtime Checks
-   **Definition Check:** Verify that `src/config/taskDefinitions.js` contains a clear, unambiguous definition or classification mechanism for `general` task types.
-   **Baseline Measurement Check:** Execute `src/reports/savingsReportGenerator.js` and verify that it accurately reports the current 4% savings for `general` tasks, matching the established baseline methodology.
-   **Consistency Check:** Run the measurement system multiple times to ensure consistent results for the 4% baseline.
-   **No Side Effects Check:** Confirm that changes to `taskDefinitions.js` or `costMeasurementService.js` do not impact non-BuilderOS functionality or customer-facing surfaces.

6. Stop Conditions
-   The AI Council has formally approved the definition of `general` task types.
-   The baseline savings measurement (4%) for `general` tasks is consistently reproducible and validated by the verifier.
-   The documentation for `general` task types (`docs/system/task_type_definitions.md`) is complete and approved.
-   All required verifier/runtime checks for this slice pass successfully.
-   No unintended side effects on LifeOS user features or TSOS customer-facing surfaces are detected.