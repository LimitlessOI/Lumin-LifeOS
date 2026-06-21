<!-- SYNOPSIS: Amendment 12 Command Center Proof - G766-100 -->

# Amendment 12 Command Center Proof - G766-100

## Blueprint Note: Next Smallest Build Slice for Command Dispatch Integration

This document outlines the proof-closing details for Amendment 12, focusing on the immediate next steps to integrate the core command dispatch mechanism within BuilderOS. This slice aims to establish a verifiable path for new command types to be registered and initiated.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the concrete implementation and proof of a new command type's lifecycle from registration to initial dispatch within the BuilderOS Command Center. While command structures are defined, the active integration with the BuilderOS execution loop and robust status tracking for a *new* command type (e.g., `BUILD_SLICE_COMMAND`) is not yet fully proven. Specifically, the mechanism to safely inject a new command definition, trigger its execution via the `CommandDispatcher`, and observe its initial state transition (e.g., `PENDING` to `RUNNING`) is the current focus.

### 2. Smallest Safe Build Slice to Close It

Implement the `BUILD_SLICE_COMMAND` type and its basic dispatch handler. This slice will:
*   Define the `BUILD_SLICE_COMMAND` type and its payload schema.
*   Register `BUILD_SLICE_COMMAND` with the `CommandRegistry`.
*   Add a minimal handler in `CommandDispatcher` to acknowledge and log the initiation of `BUILD_SLICE_COMMAND`.
*   Update `CommandStatusService` to record the initial `PENDING` and subsequent `RUNNING` status for `BUILD_SLICE_COMMAND` instances.
*   Ensure no side effects on existing BuilderOS commands or LifeOS/TSOS surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/types/command-types.js`: Define `BUILD_SLICE_COMMAND` constant and its interface.
*   `src/builder-os/commands/command-registry.js`: Add registration for `BUILD_SLICE_COMMAND`.
*   `src/builder-os/command-center/command-dispatcher.js`: Implement `dispatchBuildSliceCommand` function and integrate it into the main dispatch logic.
*   `src/builder-os/command-center/command-status-service.js`: Add logic to handle status updates for `BUILD_SLICE_COMMAND` instances.
*   `src/builder-os/command-center/command-dispatcher.test.js`: Add unit tests for `BUILD_SLICE_COMMAND` dispatch.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `command-dispatcher.test.js`: Verify `BUILD_SLICE_COMMAND` can be dispatched without errors.
    *   `command-status-service.test.js`: Verify `BUILD_SLICE_COMMAND` status transitions from `PENDING` to `RUNNING` correctly.
*   **Integration Tests (BuilderOS internal):**
    *   Simulate an external trigger invoking `BUILD_SLICE_COMMAND` via the BuilderOS API.
    *   Verify BuilderOS internal logs show `BUILD_SLICE_COMMAND` registration and dispatch events.
    *   Query `CommandStatusService` to confirm the command instance exists and its status is `RUNNING`.
*   **Manual Verification (Developer Console):**
    *   In a BuilderOS development environment, manually trigger a `BUILD_SLICE_COMMAND` (if an internal dev endpoint exists).
    *   Observe console logs for expected dispatch messages.
    *   Inspect internal state via debugging tools to confirm command registration and status.

### 5. Stop Conditions if Runtime Truth Disagrees

*   `BUILD_SLICE_COMMAND` fails to register in `CommandRegistry` at startup.
*   `CommandDispatcher` throws an unhandled exception when attempting to dispatch `BUILD_SLICE_COMMAND`.
*   `CommandStatusService` fails to record or update the status of a `BUILD_SLICE_COMMAND` instance.
*   Existing BuilderOS commands exhibit altered behavior or regressions.
*   Any unexpected side effects or errors are observed in BuilderOS logs or functionality.
*   Performance metrics for command dispatch or status updates degrade significantly.
*   The verifier attempts to execute this `.md` file as a JavaScript module again, indicating a fundamental misconfiguration in the build loop environment that needs addressing before further code changes.