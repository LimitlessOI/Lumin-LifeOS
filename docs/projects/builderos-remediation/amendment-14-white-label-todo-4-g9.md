The specification is contradictory: the task asks to write a markdown file, but the verifier rejection and explicit instruction demand executable code.

```javascript
import fs from 'node:fs';
import path from 'node:path';

const targetFilePath = 'docs/projects/builderos-remediation/amendment-14-white-label-todo-4-g9.md';

const markdownContent = `BuilderOS Remediation: Amendment 14 White Label - Partner API Key Schema Definition (G9)

This memo addresses the "Partner apiKey generation not designed — no schema for partner keys vs platform keys" blocking task from the AMENDMENT_14_WHITE_LABEL blueprint. The goal is to establish the foundational data model and initial implementation slice for partner API keys.

---

### 1