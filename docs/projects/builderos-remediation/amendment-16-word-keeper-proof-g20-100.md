# Amendment 16 Word Keeper Proof - G20-100 Remediation

This document outlines the proof-closing blueprint note for Amendment 16, focusing on the "Word Keeper" functionality within BuilderOS. The goal is to address the OIL verifier rejection by implementing a minimal, safe build slice to ensure critical words are handled as specified.

## 1. Exact Missing Implementation or Proof Gap

The current BuilderOS pipeline lacks an explicit, automated verification step to confirm that "protected words" (as defined by Amendment 16) are correctly preserved or processed within generated artifacts or configuration files. The proof gap is the absence of a dedicated validation module that can be integrated into the BuilderOS build process to assert the presence or absence of these words according to the amendment's rules.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves introducing a new BuilderOS utility module responsible for "Word Keeper" validation. This module will expose a function that takes a file path or content string and a list of protected words/rules, returning a boolean indicating compliance or a detailed report of violations. This module will be invoked at a post-generation or pre-commit stage within the BuilderOS build loop.

## 3. Exact Safe-Scope Files to Touch First

1.  **`builderos/utils/wordKeeperValidator.js`**: New module to encapsulate the word validation logic.
    *   **Purpose**: Contains the core logic for checking files/content against word-keeping rules.
    *   **Initial Content**:
        ```javascript
        // builderos/utils/wordKeeperValidator.js
        export function validateWordKeeper(content, rules) {
          let violations = [];
          // Example rule: ensure 'BuilderOS' is present
          if (rules.ensurePresence && rules.ensurePresence.length > 0) {
            for (const word of rules.ensurePresence) {
              if (!content.includes(word)) {
                violations.push(`Missing required word: '${word}'`);
              }
            }
          }
          // Example rule: ensure 'LegacySystem' is absent
          if (rules.ensureAbsence && rules.ensureAbsence.length > 0) {
            for (const word of rules.ensureAbsence) {
              if (content.includes(word)) {
                violations.push(`Forbidden word found: '${word}'`);
              }
            }
          }
          return violations;
        }
        ```
2.  **`builderos/build/postProcessors/wordKeeperCheck.js`**: New post-processor module.
    *   **Purpose**: Integrates `wordKeeperValidator` into the build flow.
    *   **Initial Content**:
        ```javascript
        // builderos/build/postProcessors/wordKeeperCheck.js
        import { validateWordKeeper } from '../../utils/wordKeeperValidator.js';
        import { readFileSync } from 'fs';
        import path from 'path';

        export function runWordKeeperCheck(buildArtifactPath, config) {
          const filePath = path.join(buildArtifactPath, config.targetFile);
          const content = readFileSync(filePath, 'utf8');
          const rules = config.wordKeeperRules; // e.g., { ensurePresence: ['BuilderOS'], ensureAbsence: ['LegacySystem'] }

          const violations = validateWordKeeper(content, rules);

          if (violations.length > 0) {
            console.error(`Word Keeper violations in ${filePath}:`);
            violations.forEach(v => console.error(`- ${v}`));
            return false; // Indicate failure
          }
          console.log(`Word Keeper check passed for ${filePath}.`);
          return true; // Indicate success
        }
        ```
3.  **`builderos/config/buildConfig.js`**: Update to integrate the new post-processor.
    *   **Purpose**: Add configuration for `wordKeeperCheck` and define rules.
    *   **Modification**: Add a new entry to a `postProcessors` array or similar configuration structure, and define `wordKeeperRules`.
    *   **Example Diff**:
        ```diff
        // builderos/config/buildConfig.js
        export const buildConfig = {
          // ... existing config
          postProcessors: [
            // ... existing post-processors
        +    {
        +      name: 'wordKeeperCheck',
        +      module: './postProcessors/wordKeeperCheck.js',
        +      config: {
        +        targetFile: 'output/generated-config.json', // Example target file
        +        wordKeeperRules: {
        +          ensurePresence: ['BuilderOS', 'Amendment16'],
        +          ensureAbsence: ['DeprecatedFeatureX']
        +        }
        +      }
        +    }
          ],
          // ...
        };
        ```
    *   **Note**: The exact structure of `buildConfig.js` and how post-processors are invoked will depend on existing BuilderOS patterns. The above is a common pattern.

## 4. Verifier/Runtime Checks

*   **Unit Tests**: Add unit tests for `builderos/utils/wordKeeperValidator.js` to cover various rule sets (presence, absence, mixed) and edge cases (empty content, no rules).
*   **Integration Test (BuilderOS Loop)**:
    *   Run a BuilderOS build that includes the `wordKeeperCheck` post-processor.
    *   **Positive Case**: Ensure a build artifact containing all required words and no forbidden words passes the check and the build completes successfully.
    *   **Negative Case (Missing Word)**: Modify a build artifact (or the generation logic) to omit a required word. Verify that the `wordKeeperCheck` fails, logs the violation, and the BuilderOS build loop reports a failure.
    *   **Negative Case (Forbidden Word)**: Modify a build artifact to include a forbidden word. Verify that the `wordKeeperCheck` fails, logs the violation, and the BuilderOS build loop reports a failure.
*   **Log Monitoring**: Monitor BuilderOS build logs for `Word Keeper violations` messages and successful completion messages.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the `wordKeeperCheck` consistently passes even when required words are missing or forbidden words are present in the target artifacts, indicating a logic error in `wordKeeperValidator.js` or `wordKeeperCheck.js`.
*   If the BuilderOS build loop fails to correctly integrate or invoke the `wordKeeperCheck` post-processor, leading to it being skipped or crashing the build without proper error reporting.
*   If the performance impact of the `wordKeeperCheck` is significant (e.g., adding more than 500ms to typical build times for common artifact sizes), requiring optimization or a different approach.
*   If the configuration mechanism for `wordKeeperRules` proves too rigid or complex for common use cases, indicating a need for a more flexible rule definition system.