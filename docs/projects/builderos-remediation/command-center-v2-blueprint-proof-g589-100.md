# Command Center V2 Blueprint Proof: G589-100 - Initial Command API Endpoint

This document serves as a proof-closing note for the initial build slice of the Command Center V2, focusing on establishing the core API endpoint for command reception.

---

### 1. Exact Missing Implementation or Proof Gap

The fundamental API endpoint for receiving and processing commands for Command Center V2 is not yet implemented or proven. This endpoint is critical for any subsequent command execution or management features.

### 2. Smallest Safe Build Slice to Close It

Implement a basic, unauthenticated (for initial proof of concept) `/api/v2/command` POST endpoint. This endpoint will accept a command payload, perform basic validation, log the received command, and return a success status. This slice proves the API surface, routing, basic request handling, and initial data ingress capability.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/v2/command/post.js`: New file. Implements the POST handler logic for `/api/v2/command`.
*   `src/api/v2/command/schema.js`: New file. Defines the request body validation schema for the command payload.
*   `src/api/v2/index.js`: New file (if `v2` API doesn't exist) or update existing. Aggregates `command` routes under `/api/v2`.
*   `src/routes.js`: Update. Integrates `src/api/v2/index.js` into the main application routing.

**Example `src/api/v2/command/post.js` (conceptual):**

```javascript
// src/api/v2/command/post.js
import { validate } from '../../utils/validation'; // Assuming a common validation utility
import { commandSchema } from './schema';
import logger from '../../../utils/logger'; // Assuming a common logger

export default async function postCommand(req, res) {
  try {
    const { body } = req;
    const validatedBody = validate(body, commandSchema); // Validate incoming payload

    // For initial proof, just log the command
    logger.info('Received Command Center V2 command:', validatedBody);

    // In future iterations, this would trigger command execution, persistence, etc.

    res.status(200).json({
      status: 'success',
      message: 'Command received successfully.',
      commandId: 'mock-command-id-123' // Placeholder for future command ID
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      logger.warn('Validation error for Command Center V2 command:', error.details);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid command payload.',
        details: error.details
      });
    }
    logger.error('Error processing Command Center V2 command:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error.'
    });
  }
}
```

**Example `src/api/v2/command/schema.js` (conceptual, using Joi-like syntax):**

```javascript
// src/api/v2/command/schema.js
import Joi from 'joi'; // Assuming Joi or similar validation library

export const commandSchema = Joi.object({
  command: Joi.string().min(1).required().description('The name of the command to execute.'),
  args: Joi.object().pattern(Joi.string(), Joi.any()).optional().description('Arguments for the command.'),
  metadata: Joi.object().pattern(Joi.string(), Joi.any()).optional().description('Optional metadata for the command.')
});
```

**Example `src/api/v2/index.js` (conceptual):**

```javascript
// src/api/v2/index.js
import { Router } from 'express'; // Assuming Express.js
import postCommand from './command/post';

const router = Router();

router.post('/command', postCommand);

export default router;
```

**Example `src/routes.js` (conceptual):**