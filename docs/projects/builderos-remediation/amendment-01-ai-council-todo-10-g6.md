# BuilderOS Remediation: Amendment 01 AI Council - TODO-10-G6 Blueprint Enhancement Memo

This memo addresses the open task `TODO-10-G6` within `AMENDMENT_01_AI_COUNCIL.md`, focusing on the implications of `LIFEOS_DIRECTED_MODE=true` and the suppression of the autonomous scheduler. The goal is to provide a builder-ready enhancement for the next iteration.

## 1. Blocking Ambiguity / Founder Decision List

*   **A1: Directed Execution Trigger Mechanism:** The blueprint states `LIFEOS_DIRECTED_MODE=true` prevents the autonomous scheduler. What is the *explicit, directed* mechanism for triggering BuilderOS loop iterations in this mode? Is it an API endpoint, a message queue listener, or a manual CLI command? This needs to be defined to enable any BuilderOS activity in directed mode.
*   **A2: Granularity of Directed Control:** Does `TODO-10-G6` require defining the *entire* directed execution flow, or just the initial trigger point and the guarantee of autonomous scheduler suppression? Assuming the latter for this slice.
*   **A3: Logging Specification:** What level of detail is required for logging when the autonomous scheduler is suppressed? Should it be a warning, info, or debug log? What specific data points should be included (e.g., timestamp, mode, attempted scheduler ID)?

## 2. Already-Settled Constraints

*   `LIFEOS_DIRECTED_MODE=true` explicitly disables the BuilderOS autonomous loop scheduler. No autonomous scheduling logic will execute in this mode.
*   BuilderOS loop execution must be entirely governed by external direction when `LIFEOS_DIRECTED_MODE=true`.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.
*   Implementation must adhere strictly to approved BuilderOS safe scope.

## 3. Smallest Buildable Next Slice

The smallest buildable slice for `TODO-10-G6` is to robustly enforce the suppression of the autonomous scheduler when `LIFEOS_DIRECTED_MODE=true` and to establish a minimal, explicit entry point for directed execution.

**Slice Components:**
1.  **Scheduler Guard:** Implement a conditional check at the earliest possible entry point of the autonomous scheduler. If `LIFEOS_DIRECTED_MODE` is true, prevent the scheduler from initializing or executing its loop.
2.  **Suppression Logging:** Log an informational message when the autonomous scheduler is suppressed due to `LIFEOS_DIRECTED_MODE=true`.
3.  **Directed Trigger Placeholder:** Define a minimal, internal API endpoint or function (`/builder-os/trigger-directed-loop` or `triggerDirectedLoop()`) that, when invoked, initiates a single iteration of the BuilderOS core loop *only* if `LIFEOS_DIRECTED_MODE` is true. This placeholder will serve as the initial directed execution mechanism.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `src/builder-os/config.js`: To read `LIFEOS_DIRECTED_MODE` (likely from `process.env`).
*   `src/builder-os/scheduler/autonomousScheduler.js`: The primary file containing the autonomous loop logic. Add the guard here.
*   `src