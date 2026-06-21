<!-- SYNOPSIS: Documentation — Amendment 16 Word Keeper Proof G154 100. -->

This note addresses the next smallest blueprint-backed build slice to close the identified gap in the Word Keeper implementation, as outlined in AMENDMENT_16_WORD_KEEPER.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the lack of a robust, internal BuilderOS runtime verification mechanism to ensure that all "words" (as defined by AMENDMENT_16_WORD_KEEPER) are correctly registered, unique, and conform to specified patterns. Specifically, there is no automated check within the BuilderOS pipeline that prevents the processing or deployment of configurations containing unregistered, malformed, or duplicate "words". The OIL verifier's rejection, while misdirected in its execution context, highlights the need for this internal validation.

### 2. Smallest Safe Build Slice to Close It

Implement a `WordKeeperValidator` module within BuilderOS's internal validation pipeline. This module will expose a `validateWords(config)` function that takes a BuilderOS configuration object and returns a result object indicating validity (boolean) and a list of detailed errors if invalid. This function will leverage the definitions and constraints from AMENDMENT_16_WORD_KEEPER to perform its checks.

### 3. Exact Safe-Scope Files to Touch First

*   `builder-os/src/validation/wordKeeperValidator.js`: New module containing the core word validation logic.
*   `builder-os/src/validation/index.js`: Export the new `wordKeeperValidator` module.
*   `builder-os/src/pipeline/configProcessor.js`: Integrate `WordKeeperValidator.validateWords` into the configuration processing pipeline, specifically as an early-stage validation step before any mutation or deployment actions.
*   `builder-os/tests/validation/wordKeeperValidator.test.js`: New unit test file for the `WordKeeperValidator`.

### 4. Verifier/Runtime Checks

*   **Unit Tests (`wordKeeperValidator.test.js`):**
    *   Verify `validateWords` correctly identifies and reports unregistered words.
    *   Verify `validateWords` correctly identifies and reports words violating pattern constraints.
    *   Verify `validateWords` correctly identifies and reports duplicate word registrations within a configuration.
    *   Verify `validateWords` returns `true` for valid BuilderOS configurations.
*   **Integration Tests (`configProcessor.test.js`):**
    *   Verify that a BuilderOS configuration containing invalid words (unregistered, malformed, or duplicate) is rejected by the `configProcessor` with a clear, actionable validation error.
    *   Verify that a valid BuilderOS configuration passes through the `configProcessor` successfully without new errors.
*   **Runtime Check (BuilderOS deployment/activation):**
    *   Attempt to deploy a BuilderOS configuration with an unregistered word. The deployment must fail early with a specific validation error from the `WordKeeperValidator`.
    *   Attempt to deploy a BuilderOS configuration with a word violating its defined pattern. The deployment must fail early.
    *   Deploy a known valid BuilderOS configuration. It must proceed successfully without new validation failures.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `WordKeeperValidator.validateWords` allows an invalid word to pass, or incorrectly rejects a valid word.
*   If the `configProcessor` fails to integrate the validator correctly, allowing invalid configurations to proceed or blocking valid ones.
*   If BuilderOS deployments with known invalid words are not halted by the validation step with appropriate error messages.
*   If the performance impact of the validation step significantly degrades the `configProcessor`'s throughput (e.g., adding more than 50ms to typical configuration processing time).