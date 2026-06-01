BuilderOS Remediation: Amendment 01 AI Council - Directed Mode Processing (G6)

This memo outlines the enhancement plan for processing AI Council directives under `LIFEOS_DIRECTED_MODE=true`, addressing the current blocking issue where no autonomous scheduler fires. The goal is to enable directed execution of AI Council tasks without violating existing constraints or rebuilding core components.

**1. Blocking Ambiguity / Founder Decision List**
*   **Directive Source & Format:** What is the authoritative source for AI Council directives in `LIFEOS_DIRECTED_MODE`? Is it a file system path, a specific API endpoint, or a message queue? What is the expected data format (e.g., JSON schema, YAML) for these directives?
*   **Execution Semantics:** Are directives intended for immediate, one-