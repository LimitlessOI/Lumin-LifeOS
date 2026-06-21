<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G253 100. -->

### Blueprint Note: Amendment 12 Command Center - Proof G253-100

**1. Missing Implementation/Proof Gap:**
The `BuilderCommand` interface lacks explicit `commandSource` and `commandIntent` fields, leading to an unverified command origin and purpose. This is a proof gap in the command's lifecycle validation.

**2. Smallest Safe Build Slice:**
Extend `BuilderCommand` with `commandSource` and `commandIntent`. Update command parsing and dispatch to incorporate these new fields for initial validation.

**3. Safe-Scope Files to Touch First:**
*   `src/builder-os/interfaces/BuilderCommand.ts`: Add `commandSource: 'internal' | 'external' | 'api';` and `commandIntent: string;`
*   `src/builder-os/command-parser/parseCommand.ts`: Implement extraction of `commandSource` and `commandIntent`.
*   `src/builder-os/command-dispatcher/dispatchCommand.ts`: Add preliminary validation for `commandSource`.

**4. Verifier/Runtime Checks:**
*   **Unit:** `test/builder-os/command-parser/parseCommand.test.ts`: Verify `commandSource` and `commandIntent` extraction.
*   **Unit:** `test/builder-os/command-dispatcher/dispatchCommand.test.ts`: Verify rejection of commands with invalid `commandSource`.
*   **Integration:** `test/builder-os/e2e/command-flow.test.ts`: Confirm propagation and validation of new fields for internal/external commands.
*   **Runtime:** Monitor BuilderOS logs for `CommandValidationFailed` events related to `commandSource` or `commandIntent`.

**5. Stop Conditions (Runtime Disagreement):**
*   Existing valid BuilderOS commands fail due to new validation.
*   `commandSource` or `commandIntent` are incorrectly populated or ignored downstream.
*   Unexpected performance degradation in command processing.
*   Verifier continues to reject `.md` files due to `ERR_UNKNOWN_FILE_EXTENSION`.