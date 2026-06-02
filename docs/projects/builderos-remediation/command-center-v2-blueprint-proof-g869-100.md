// src/command-center/CommandRegistry.js
class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  /**
   * Registers a command handler.
   * @param {string} commandName - The unique name of the command.
   * @param {Function} handler - The function to execute for the