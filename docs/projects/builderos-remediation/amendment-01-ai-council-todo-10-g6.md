BuilderOS Remediation: Amendment 01 AI Council - Task 10-G6 Enhancement Memo

This memo outlines a builder-ready enhancement for `todo-10-g6` under the `AMENDMENT_01_AI_COUNCIL` blueprint. It addresses the `LIFEOS_DIRECTED_MODE=true` constraint, which prevents autonomous scheduler firing, and the "unchecked blueprint task remains open" status. The goal is to define the smallest buildable slice for BuilderOS to proceed.

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Specific Objective of `todo-10-g6`:** The blueprint states `LIFEOS_DIRECTED_MODE=true` and "no autonomous scheduler fires." What is the precise action or outcome expected from `todo-10-g6` within this directed context? Is it a review, a data aggregation, a specific configuration update, or an approval gate?
*   **Trigger Mechanism for `todo-10-g6`:** How will BuilderOS receive the explicit instruction to execute `todo-10-g6` when `LIFEOS_DIRECTED_MODE` is active? (e.g., internal API call, specific configuration flag, manual CLI command, message queue event).
*   **Input/Output for `todo-10-g6`:** What data does `todo-10-g6` require as input, and what is its expected output or state change?

### 2. Already-Settled Constraints

*   `LIFEOS_DIRECTED_MODE=true` is the active operational mode.
*   No autonomous scheduler within LifeOS will fire for this context; BuilderOS must explicitly manage execution.
*   BuilderOS is solely responsible for governing the execution loop for `todo-10-g6`.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.
*   The task `todo-10-g6` is part of the `AMENDMENT_01_AI_COUNCIL` blueprint.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on defining the `todo-10-g6` task and establishing its directed execution interface within BuilderOS.

*   **Task Definition Stub:** Create a placeholder module for `todo-10-g6` that logs its invocation and returns a pending status.
*   **Directed Trigger Integration:** Implement a minimal internal BuilderOS mechanism (e.g., a dedicated internal API endpoint or a configuration watcher) that can explicitly invoke the `todo-10-g6` task stub. This mechanism must respect `LIFEOS_DIRECTED_MODE`.
*   **Mode Enforcement:** Ensure BuilderOS actively checks `LIFEOS_DIRECTED_MODE` and prevents any autonomous scheduling attempts related to `todo-10-g6`.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `builder-os/src/config/directedModeTasks.js`: Register `todo-10-g6` as a directed-mode-only task.
*   `builder-os/src/tasks/aiCouncil/todo10G6.js`: Create the task stub for `todo-10-g6`.
*   `builder-os/src/api/internal/directedTaskTrigger.js`: (If using API) Add an endpoint to trigger directed tasks.
*   `builder-os/src/core/scheduler.js`: Add a check to prevent `todo-10-g6` from being scheduled autonomously when `LIFEOS_DIRECTED_MODE=true`.
*   `docs/projects/builderos-remediation/amendment-01-ai-council-todo-10-g6.md`: This document itself.

### 5. Required Verifier/Runtime Checks

*   **Mode Detection:** Verify BuilderOS correctly identifies `LIFEOS_DIRECTED_MODE=true`.
*   **Directed Invocation:** Confirm the `todo-10-g6` task stub can be successfully invoked via the established directed trigger mechanism.
*   **Autonomous Prevention:** Verify that `todo-10-g6` is *not* scheduled or executed by any autonomous scheduler when `LIFEOS_DIRECTED_MODE=true`.
*   **Logging:** Ensure invocation and status changes for `todo-10-g6` are logged appropriately.

### 6. Stop Conditions

*   The specific objective and expected outcome of `todo-10-g6` are clearly defined and documented.
*   A functional, minimal BuilderOS internal mechanism exists to explicitly trigger and execute the `todo-10-g6` task stub.
*   The `todo-10-g6` task stub is in place, ready for its core logic implementation.
*   All verifier checks for this slice pass.