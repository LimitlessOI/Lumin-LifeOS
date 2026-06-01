# BuilderOS Remediation: Amendment 01 AI Council - TOON Codegen Savings (Task 9-G6)

This memo outlines a builder-ready enhancement plan to integrate TOON-enabled codegen paths, specifically addressing the "Codegen task type shows >10% savings (TOON now enabled)" section of `AMENDMENT_01_AI_COUNCIL.md`. The goal is to leverage TOON's efficiency gains within BuilderOS without impacting LifeOS user features or TSOS customer surfaces.

## 1. Blocking Ambiguity / Founder Decision List

*   **Specific Codegen Task Identification:** The blueprint states "Codegen task type shows >10% savings". Which *specific* codegen task(s) within BuilderOS are the initial targets for TOON integration? A founder decision is needed to prioritize a low-risk, high-impact candidate.
*   **TOON Integration Interface:** Is there an existing, standardized API or SDK for BuilderOS to interact with TOON's codegen capabilities, or does one need to be defined/built?
*   **Fallback Strategy:** What is the desired fallback mechanism if TOON is unavailable or fails during a codegen request? (e.g., revert to existing BuilderOS codegen, fail fast, retry).

## 2. Already-Settled Constraints

*   **BuilderOS-only Scope:** All modifications must be confined to BuilderOS internal logic and execution loops.
*   **No User/Customer Impact:** LifeOS user features and TSOS customer-facing surfaces must remain untouched.
*   **TOON Capability:** TOON is confirmed to be enabled and capable of delivering >10% savings for relevant codegen tasks.
*   **Existing Patterns:** New code must adhere to existing Node/ESM patterns within the BuilderOS codebase.

## 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on integrating TOON for a single, well-defined, low-risk codegen task. This involves:
1.  **Task Identification:** Select one specific, simple codegen task (e.g., generating a basic data model interface or a boilerplate component stub).
2.  **TOON Adapter:** Implement a dedicated service or utility within BuilderOS to encapsulate calls to the TOON codegen API for this specific task type.
3.  **Conditional Routing:** Modify the BuilderOS codegen task dispatcher to conditionally route the identified task to the new TOON adapter, based on a feature flag or configuration.
4.  **Telemetry & Monitoring:** Add basic logging and metrics to track TOON usage and performance for the integrated task.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `config/builderos-features.js`: Add a feature flag for `toonCodegenEnabled` for the specific task.
*   `src/builderos/services/toonCodegenAdapter.js`: New file for TOON API interaction.
*   `src/builderos/codegen/taskRouter.js`: Modify existing router to conditionally use `toonCodegenAdapter.js`.
*   `src/builderos/codegen/taskDefinitions.js`: Update definition for the chosen task to reference TOON path.
*   `test/builderos/codegen/toonCodegenAdapter.test.js`: New test file for the adapter.
*   `test/builderos/codegen/taskRouter.test.js`: Update existing tests for routing logic.

## 5. Required Verifier/Runtime Checks

*   **Functional Correctness:** Verify the output of the TOON-generated code matches expected specifications for the chosen task.
*   **Performance Validation:** Confirm the integrated task demonstrates the expected >10% savings (e.g., reduced execution time, lower CPU/memory usage) compared to the legacy path.
*   **Error Handling & Fallback:** Test scenarios where TOON is unavailable or returns an error, ensuring BuilderOS handles gracefully and potentially falls back to the original codegen path.
*   **Isolation:** Runtime checks to ensure no unintended side effects on LifeOS or TSOS.
*   **Telemetry Integrity:** Verify metrics and logs for TOON usage are correctly emitted.

## 6. Stop Conditions

*   Successful integration and verification of TOON for the initial, chosen codegen task.
*   All performance and functional checks pass consistently in staging and production environments.
*   Monitoring confirms stability and expected savings without regressions.
*   A clear path for integrating additional codegen tasks with TOON is established and prioritized.