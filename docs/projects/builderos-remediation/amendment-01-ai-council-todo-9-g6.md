BuilderOS Remediation: Amendment 01 AI Council - TOON Codegen Savings (Task 9-G6)
Blueprint Enhancement Memo
Source Blueprint: `docs/projects/AMENDMENT_01_AI_COUNCIL.md`
Relevant Section Summary: Codegen task type shows >10% savings (TOON now enabled).
Reason Blueprint Not Directly Buildable: Unchecked blueprint task remains open.
---
This memo outlines a builder-ready enhancement plan to address the open task related to TOON-enabled codegen savings, focusing on a minimal, buildable next slice.

1. Blocking Ambiguity or Founder Decision List
    -   Decision Required: Precisely define the "10% savings" metric (e.g., build time, CPU cycles, memory, LOC reduction).
    -   Decision Required: Identify the specific "Codegen task type" or a pilot codegen task within BuilderOS to target first for TOON enablement.
    -   Decision Required: Clarify the mechanism for "TOON now enabled" – is it a new API, a configuration flag, or a specific module integration?
    -   Decision Required: Confirm the scope of the "unchecked blueprint task" beyond just enabling TOON for savings measurement.

2. Already-Settled Constraints
    -   Execution must be confined to BuilderOS-governed loops.
    -   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    -   Implementation must adhere strictly to approved builder safe scope.
    -   TOON is confirmed enabled and demonstrates >10% savings potential for codegen tasks.

3. Smallest Buildable Next Slice
    -   **Objective:** Instrument a single, low-risk, internal BuilderOS codegen task to leverage TOON and measure actual savings.
    -   **Scope:** Select a non-critical, internal utility code generation task (e.g., internal API client stubs, configuration schema generation).
    -   **Action:** Implement the minimal integration required to invoke TOON for this specific task and capture pre/post-TOON metrics.

4. Exact Safe-Scope Files BuilderOS Should Touch First
    -   `builderos/config/codegen-tasks.json`: Add a new configuration entry or flag for TOON enablement on a specific task.
    -   `builderos/lib/codegen/task-runner.js`: Modify the task execution logic to conditionally invoke TOON for the selected task.
    -   `builderos/modules/toon-integration.js`: (New file if needed) Encapsulate TOON API calls and metric collection.
    -   `builderos/tests/codegen/toon-pilot.test.js`: Add unit/integration tests for the pilot task with TOON.

5. Required Verifier/Runtime Checks
    -   **Verifier Checks:**
        -   `builderos-codegen-toon-invocation`: Confirm TOON API is called with correct parameters for the pilot task.
        -   `builderos-codegen-output-equivalence`: Verify generated code post-TOON is functionally identical to pre-TOON output.
        -   `builderos-codegen-metric-capture`: Ensure metrics (e.g., execution time, resource usage) are correctly captured.
    -   **Runtime Checks:**
        -   Monitor `builderos` logs for TOON-related errors or warnings.
        -   Track `builderos` task execution metrics for the pilot task to confirm savings.
        -   Monitor downstream system health for any unexpected regressions caused by new codegen.

6. Stop Conditions
    -   Successful deployment and verification of TOON integration for the pilot codegen task.
    -   Demonstrated and validated >10% savings (based on defined metric) for the pilot task.
    -   No functional regressions or performance degradations observed in the pilot task or its consumers.
    -   Completion of initial metric collection and reporting for the pilot task.
    -   Readiness for expanding TOON integration to additional codegen tasks.