The spec is contradictory: the task asks for a `.md` file, but the instruction "Output ONLY the code first" and the verifier rejection indicate an executable script is expected. I will output an ESM Node.js script that prints the markdown content to stdout, assuming BuilderOS captures this output for the `.md` file.
```javascript
// docs/projects/builderos-remediation/amendment-14-white-label-todo-4-g9.md
// This script generates the markdown content for the specified remediation document.

const markdownContent = `BuilderOS Remediation: Amendment 14 White Label - Partner API Key Schema Definition (G9)

This memo addresses the "Partner apiKey generation not designed — no schema for partner keys vs platform keys" blocking task from the AMENDMENT_14_WHITE_LABEL blueprint.