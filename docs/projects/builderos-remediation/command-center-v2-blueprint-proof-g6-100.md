# Blueprint Proof: G6-100 BuilderOS Command Remediation Integration

This document serves as a proof-closing note for the `g6-100: BuilderOS Command Remediation Integration` phase of the Command Center V2 blueprint. It identifies the current implementation gap and proposes the smallest, safest build slice to close it, preparing for the next C2 build pass.

## 1. Exact Missing Implementation or Proof Gap

The immediate proof gap is the lack of a defined, parseable BuilderOS command for remediation within the BuilderOS command registry. The previous attempt to close this gap resulted in a verifier rejection due to attempting to execute a `.md` file as a JavaScript module, indicating a misunderstanding of the artifact's purpose or a misconfiguration in the verifier's execution context for documentation files. The core implementation gap remains: a functional, internal BuilderOS command that can be registered and invoked.

## 2. Smallest Safe Build Slice to Close It

Define a minimal, no-op BuilderOS command for remediation. This command will serve as a placeholder to validate the command definition and registration mechanism within BuilderOS, ensuring it can be parsed and recognized without side effects.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/commands/remediationCommand.js` (new file)
*   `src/builder-os/commandRegistry.js` (update to register the new command)

### `src/builder-os/commands/remediationCommand.js` (example content)

```javascript
// src/builder-os/commands/remediationCommand.js
import { BuilderOSCommand } from '../core/BuilderOSCommand.js'; // Assuming a base command class pattern

class RemediationCommand extends BuilderOSCommand {
  constructor() {
    super('remediate', 'Performs BuilderOS remediation tasks.');
  }

  async execute(args) {
    console.log('Executing BuilderOS Remediation Command with args:', args);
    // Placeholder for actual remediation logic
    return { success: true, message: 'Remediation command executed (no-op).' };
  }
}

export default RemediationCommand;
```

### `src/builder-os/commandRegistry.js` (example update)

```javascript
// src/builder-os/commandRegistry.js (excerpt)
import RemediationCommand from './commands/remediationCommand.js';
// ... other imports

const commands = new Map();

function registerCommand(commandInstance) {
  if (commands.has(commandInstance.name)) {
    console.warn(`Command "${commandInstance.name}" already registered. Overwriting.`);
  }
  commands.set(commandInstance.name, commandInstance);
}

// Initial registration
registerCommand(new RemediationCommand());
// ... register other commands

export function getCommand(name) {
  return commands.get(name);
}

export function listCommands() {
  return Array.from(commands.keys());
}
```

## 4. Verifier/Runtime Checks

*   **Verifier Check:** The BuilderOS verifier successfully parses `src/builder-os/commands/remediationCommand.js` and `src/builder-os/commandRegistry.js` without syntax errors. Crucially, the verifier *does not* attempt to execute `docs/projects/builderos-remediation/command-center-v2-blueprint-proof-g6-100.md` as code.
*   **Runtime Check 1 (Command Listing):** After BuilderOS startup, `listCommands()` from `src/builder-os/commandRegistry.js` includes `'remediate'`.
*   **Runtime Check 2 (Command Invocation):** Invoking the command via `getCommand('remediate').execute({})` returns `{ success: true, message: 'Remediation command executed (no-op).' }` and logs the expected message to the console.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the verifier attempts to execute `.md` files again, indicating a fundamental misconfiguration of the build loop's artifact handling.
*   If `src/builder-os/commands/remediationCommand.js` or `src/builder-os/commandRegistry.js` produce syntax errors during parsing or execution.
*