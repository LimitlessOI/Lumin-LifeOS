The specification is contradictory: the target file is a markdown document (`.md`), but the verifier rejected the previous attempt with a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` indicating it attempted to execute the `.md` file as JavaScript. The existing content of the target `.md` file also explicitly instructs to "Output ONLY the code first". This implies the `.md` file's content should begin with executable JavaScript code, followed by the blueprint note in markdown.

```javascript
// Proposed addition to routes/lifeos-council-builder-routes.js
// This code block should be inserted into the existing router definition.

import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderService.js';
import { getSystemHealth } from '../utils/health