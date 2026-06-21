<!-- SYNOPSIS: Class Command — docs/projects/builderos-remediation/amendment-12-command-center-proof-g635-100.md. -->

// src/command-center/command.js
export class Command {
  constructor(id, handler) {
    if (!id || typeof id !== 'string') {
      throw new Error('Command ID must be a non-empty string.');
    }
    if (typeof handler !== 'function') {
      throw new Error('Command handler must be a function.');
    }
    this.id = id;
    this.handler = handler;
  }

  execute(...args) {
    return this.handler(...args);
  }
}

// src/command-center/command-registry.js
import { Command } from './command.js'; // Assuming command.js is in the same directory

export class CommandRegistry {
  constructor()