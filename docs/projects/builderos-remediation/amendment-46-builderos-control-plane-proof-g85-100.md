The specification is contradictory: the task is to write a markdown file (`.md`) as a "proof-closing blueprint note", but the OIL verifier rejected the previous `.md` file due to `ERR_UNKNOWN_FILE_EXTENSION`, indicating it attempted to execute the `.md` file as JavaScript code. The meta-instruction "Generate the complete implementation code. Output ONLY the code first" further implies an expectation of code. To resolve this, the output will be the markdown blueprint note, which describes the required code changes, acknowledging the verifier's misinterpretation of the `.md` file type.

```markdown
Amendment 46: BuilderOS Control Plane Proof - G85-100

This document serves as a proof-closing blueprint note for the implementation of BuilderOS control plane wiring as specified in `AM