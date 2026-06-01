BuilderOS Remediation: Amendment 01 AI Council - TODO 13 G7 Enhancement Memo
This memo outlines the next buildable slice for addressing the "phrase table not firing; IR compiler needs tuning" issue for `general` task types, targeting 4% savings. The previous verifier rejection was due to an incorrect file type interpretation; this document provides the intended markdown content.

1.  Blocking Ambiguity / Founder Decision List
    *   Phrase Table Definition: What constitutes a "phrase table" in the context of the IR compiler? Is it a static lookup dictionary, a dynamic rule set, or a machine learning model's feature set? What is its precise expected input/output format (e.g., JSON, YAML, custom DSL)? How is this table sourced, updated, and versioned within the BuilderOS platform?
    *   IR Compiler Tuning Scope: What specific aspects of the IR compiler are candidates for tuning? Is it rule-based optimization, AST transformation, code generation, or resource allocation? What are the current performance bottlenecks identified?
    *   "4% Savings" Metric: How is "savings" precisely measured (e.g., CPU cycles, memory usage, execution time, output token count)? What is the baseline for this 4% target, and what are the current measured savings for `general` task types?

2.  Already-settled Constraints
    *   Target Scope: Remediation specifically for `general` task types within BuilderOS.
    *   Objective: Achieve a measurable 4% savings.
    *   Identified Root Cause: "Phrase table not firing" and "IR compiler needs tuning."
    *   Platform: BuilderOS internal components; no direct impact on LifeOS user features or TSOS customer-facing surfaces.
    *   Technology Stack: Node.js/ESM, adhering to existing BuilderOS patterns.

3.  Smallest Buildable Next Slice
    *   **Define and Load Static Phrase Table:** Implement a minimal, static phrase table (e.g., a JSON file) and integrate a basic loading mechanism into the IR compiler for `general` task types. This slice focuses on establishing the "firing" mechanism, not necessarily achieving the 4% savings yet.
        *   Sub-tasks:
            *   Create a `phrase-table.json` with a few example phrase mappings.
            *   Modify the IR compiler's initialization to load this `phrase-table.json`.
            *   Add a simple lookup function within the IR compiler that attempts to apply transformations based on the loaded phrase table for `general` task inputs.

4.  Exact Safe-Scope Files BuilderOS Should Touch First
    *   `config/ir-compiler-phrases.json` (new file): Stores the static phrase table data.
    *   `src/builder-os/ir-compiler/general-task-processor.js` (existing, modification): Add logic to load `config/ir-compiler-phrases.json` and integrate a basic lookup/transformation step.
    *   `src/builder-os/ir-compiler/index.js` (existing, modification): Potentially update initialization or dependency injection to pass the phrase table to the `general-task-processor`.

5.  Required Verifier/Runtime Checks
    *   **Phrase Table Loading Check:** Verify that `config/ir-compiler-phrases.json` is successfully loaded at IR compiler initialization without errors. Log the loaded table's content (or a hash/count) for verification.
    *   **Basic Phrase Application Check:** For a predefined `general` task input containing a phrase from the table, verify that the IR compiler's output reflects the expected transformation. This is a functional check, not a performance check.
    *   **Error Handling:** Ensure that if the phrase table file is missing or malformed, the IR compiler logs an error but continues operation (graceful degradation).

6.  Stop Conditions
    *   The `config/ir-compiler-phrases.json` file is created and contains valid JSON.
    *   The `general-task-processor.js` successfully loads the phrase table.
    *   A unit test confirms that the IR compiler attempts to use the loaded phrase table for `general` task inputs, even if the transformation is minimal.
    *   No regressions are introduced in other task types or BuilderOS functionality.
    *   The system is ready for the next iteration of tuning or expanding the phrase table.