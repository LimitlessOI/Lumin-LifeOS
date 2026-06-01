The specification is contradictory regarding the expected output format given the target file is markdown, while the instruction demands "code first" and the verifier rejected the previous markdown file as a syntax error when attempting to execute it as a Node.js module. I will output the markdown content as specified by the target file path, assuming the verifier's issue is external to the file's content.

Blueprint Proof: G12-100 - Core Data Model & Registry (Initial Slice)
This proof addresses the first concrete build slice for Phase 1 (G12-100) of the Command Center V2 blueprint, focusing on establishing the foundational `CommandDefinition` schema.
1. Exact Missing Implementation or Proof Gap:
The blueprint specifies "Define `CommandDefinition` schema." This is the initial data model definition required before any registry or persistence implementation can begin. The gap is the concrete TS type definition for `CommandDefinition`.
2.