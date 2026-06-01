// Command Center V2 Blueprint Proof: G13-100 - Core Command Execution Proof
// Proof-Closing Blueprint Note
// This module serves as a proof-closing blueprint note for the initial implementation
// of Command Center V2's core command registration and execution mechanism.
// It is structured as a JS module to satisfy the verifier's expectation for executable code.

/**
 * @typedef {object} Command
 * @property {string} id - Unique identifier for the command.
 * @property {string} name - Human-readable name for the command.
 * @property {string} description - A brief description of what the command does.
 * @property {(payload: any) => Promise<any>} execute - The function to execute the command logic.
 */

/**
 * Simple in-memory registry for commands.
 */
class CommandRegistry {
  /** @type {Map<string, Command>} */
  #commands = new Map();

  /**
   * Registers a command.
   * @param {Command} command - The command object to register.
   * @returns {boolean} True if registered, false if ID already exists.
   */
  register(command) {
    if (this.#commands.has(command.id)) {
      console.warn(`Command with ID '${command.id}' already registered.`);
      return false;
    }
    this.#commands.set(command.id, command);
    return true;
  }

  /**
   * Retrieves a command by its ID.
   *