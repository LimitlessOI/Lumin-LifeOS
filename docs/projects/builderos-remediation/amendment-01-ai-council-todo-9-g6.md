BuilderOS Remediation: Amendment 01 AI Council - TOON Codegen Savings Formalization
Source Blueprint: `docs/projects/AMENDMENT_01_AI_COUNCIL.md`
Reason Blueprint Not Directly Buildable: Unchecked blueprint task remains open.
Relevant Section Summary: Codegen task type shows >10% savings (TOON now enabled).

---

### Builder-Ready Blueprint Enhancement Memo: TOON Codegen Savings Formalization

This memo outlines the initial, smallest buildable slice for formalizing the reported >10% savings from TOON-enabled codegen tasks within BuilderOS, as per Amendment 01 AI Council blueprint.

#### 1. Blocking Ambiguity or Founder Decision List

*   **Definition of "Formalization":** Clarify the exact output required for "formalizing" savings. Is it a new metric, a dashboard update, a specific log entry, or a configuration flag?
    *   *Assumption for this slice:* Formalization implies BuilderOS internal configuration updates to recognize TOON-enabled tasks and a defined mechanism for logging/tracking associated savings.
*   **TOON Integration Scope:** While TOON is "enabled," the blueprint doesn't specify if BuilderOS should actively *invoke* TOON for codegen tasks in this slice, or merely *track* its reported savings.
    *   *Assumption for this slice:* Focus on tracking and configuration; active invocation of TOON for new tasks is out of scope for this minimal slice unless explicitly defined by existing patterns.

#### 2. Already-Settled Constraints

*   BuilderOS-only governed loop execution.
*   No modification to LifeOS user features or TSOS customer-facing surfaces.
*   Implementation strictly within approved BuilderOS safe scope.
*   Codegen task type *already shows* >10% savings (TOON now enabled) - this is a given fact to be formalized.

#### 3. Smallest Buildable Next Slice

The smallest buildable slice focuses on establishing the internal BuilderOS configuration and data structures to acknowledge and track TOON-enabled codegen tasks and their reported savings.

*   **Task Type Configuration Update:** Introduce a flag or property within BuilderOS's internal codegen task type definitions to mark tasks as `toonEnabled: true` and potentially `expectedSavings: "10%+"`.
*   **Savings Tracking Hook:** Define a minimal internal mechanism (e.g., a new log event type or a metric increment) that BuilderOS can trigger when a TOON-enabled codegen task completes, indicating the reported savings. This does not require complex calculation in this slice, only the *ability* to record the fact.

#### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `builderos/config/taskTypes/codegen.json`: Update this configuration file to add `toonEnabled: true` and `expectedSavings: "10%+"` properties to relevant codegen task definitions. This file governs how BuilderOS understands and categorizes its codegen tasks.
*   `builderos/lib/metrics/taskCompletionLogger.js`: Extend an existing logging utility to include a new event type or payload structure for `TOON_SAVINGS_REPORTED` when a `toonEnabled` codegen task completes. This ensures the formalization is captured.

#### 5. Required Verifier/Runtime Checks

*   **Verifier Check:**
    *   Confirm `builderos/config/taskTypes/codegen.json` correctly reflects `toonEnabled: true` for designated codegen tasks.
    *   Verify `builderos/lib/metrics/taskCompletionLogger.js` includes the new `TOON_SAVINGS_REPORTED` event structure without breaking existing logging.
*   **Runtime Check:**
    *   Execute a mock TOON-enabled codegen task within BuilderOS's test environment.
    *   Confirm the `TOON_SAVINGS_REPORTED` event is correctly emitted/logged upon task completion.
    *   Ensure no regressions in non-TOON codegen task execution.

#### 6. Stop Conditions

*   BuilderOS's internal configuration accurately identifies and flags codegen tasks as `toonEnabled`.
*   A defined, minimal mechanism exists within BuilderOS to log/report the completion of a `toonEnabled` codegen task with an indication of its reported savings.
*   No changes or regressions observed in LifeOS user features or TSOS customer-facing surfaces.
*   The "unchecked blueprint task" for formalizing TOON codegen savings is considered addressed for this initial configuration and tracking slice.