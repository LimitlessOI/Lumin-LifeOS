The task specifies writing to a `.md` file, but the verifier rejected the previous `.md` file at this path due to `ERR_UNKNOWN_FILE_EXTENSION` (implying it expected executable code), and the instruction also states "Generate the complete implementation code. Output ONLY the code first". This is a contradiction. I will generate the requested implementation code, assuming the verifier expects code at this path despite the `.md` extension, and that the "proof-closing blueprint note" is intended to *contain* this code.

```javascript
// routes/lifeos-council-builder-routes.js (proposed changes)

import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderos-control-plane.js