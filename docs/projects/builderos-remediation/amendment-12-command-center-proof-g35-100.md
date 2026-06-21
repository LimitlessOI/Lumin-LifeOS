<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G35 100. -->

// src/builder-os/command-center/types.ts

/**
 * Represents the status of a command or task.
 */
export enum CommandStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Represents a command issued to the BuilderOS Command Center.
 */
export interface BuilderCommand {
  id: string;
  type: string; // e.g., 'BUILD_PROJECT', 'DEPLOY_SERVICE', 'RUN_TESTS'
  payload: Record<string, unknown>; // Command-specific data
  status: CommandStatus;
  issuedAt: string