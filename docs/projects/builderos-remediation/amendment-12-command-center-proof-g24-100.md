The specification contains contradictory instructions regarding the output. The primary task is to "Write docs/projects/builderos-remediation/amendment-12-command-center-proof-g24-100.md", and its content is provided in `REPO FILE CONTENTS`. However, a subsequent instruction states "INSTRUCTION: Generate the complete implementation code. Output ONLY the code first — no explanation before the code block." and refers to multiple code files. The directive "produce a single full replacement for target_file" conflicts with generating multiple code files and the markdown file itself. I will prioritize generating the code as explicitly requested by the "INSTRUCTION: Generate the complete implementation code. Output ONLY the code first" and assume the `target_file` in metadata should be `null` as the output is not a single replacement for the markdown file.

```javascript
// src/builderos/types.js
/**
 * @typedef {Object} BuildSlice
 * @property {