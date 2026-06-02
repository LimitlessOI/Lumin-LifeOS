# Command Center V2 Blueprint Proof: G671-100 Remediation

This document outlines the next smallest build slice to address the previous OIL verifier rejection and advance the Command Center V2 (CCv2) implementation. The prior rejection was due to the verifier attempting to execute a `.md` file as a Node.js module, indicating a verifier configuration issue rather than a flaw in the blueprint content itself. This remediation focuses on delivering the first functional, minimal component of CCv2 within BuilderOS.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of a foundational, BuilderOS-native command that CCv2 can reliably invoke and receive a response from. This initial command serves as the "hello world" for CCv2's interaction with BuilderOS, proving the basic command registration, execution, and response mechanism.

## 2. Smallest Safe Build Slice to Close It

Implement a minimal `builder-os ping` command. This command will perform a no-op or return a simple success message, establishing the end-to-end flow for command definition, registration, and execution within BuilderOS. This slice avoids any complex business logic or external dependencies, focusing solely on the command infrastructure.

## 3. Exact Safe-Scope Files to Touch First

The following files are within the approved BuilderOS safe scope and should be touched first:

*   `src/builder-os/commands/ping-command.js`: Define the `PingCommand` class, extending a base command class (e.g., `BaseCommand`). This file will specify the command's name (`ping`) and a minimal `execute` method.
*   `src/builder-os/command-registry.js`: Add an entry to the existing command registry to map the `ping` command string to the `PingCommand` class. This ensures BuilderOS can discover and instantiate the command.

## 4. Verifier/Runtime Checks

*   **BuilderOS Startup:** Verify that BuilderOS starts successfully without any new errors or warnings after the changes.
*   **Command Registration:** Execute `builder-os help` or a similar command listing mechanism to confirm `ping` appears in the list of available commands.
*   **Command Execution:** Run `builder-os execute ping`. The command should complete successfully and output a predefined success message (e.g., "BuilderOS Ping successful.").
*   **Verifier Behavior:** Confirm that the OIL verifier no longer attempts to execute `.md` files as Node.js modules. (This is an external check, but critical for the overall remediation loop).

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Startup Failure:** If BuilderOS fails to start or throws unhandled exceptions related to command registration or `ping-command.js`.
*   **Command Not Found:** If `builder-os execute ping` results in an "unknown command" error.
*   **Execution Error:** If `builder-os execute ping` throws an exception during its execution or does not produce the expected success output.
*   **Verifier Regression:** If the OIL verifier again flags `.md` files as syntax errors, indicating the underlying verifier configuration issue has not been resolved. In this case, the focus must shift back to the verifier configuration before proceeding with further code changes.