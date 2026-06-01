BuilderOS Remediation: Amendment 01 AI Council - TODO 13 G7 Enhancement Memo

This memo outlines the next buildable slice for addressing the "phrase table not firing; IR compiler needs tuning" issue for `general` task types, targeting 4% savings. The previous verifier rejection was due to an incorrect file type interpretation; this document provides the intended markdown content.

1. Blocking Ambiguity / Founder Decision List
   *   **Phrase Table Definition**: What constitutes a "phrase table" in the context of the IR compiler? Is it a static lookup dictionary, a dynamic rule set, or a machine learning model's feature set? What is its precise expected input/output format (e.g., JSON, YAML, custom DSL)? How is this table sourced, updated, and versioned within the Builder