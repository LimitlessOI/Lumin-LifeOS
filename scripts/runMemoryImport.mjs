/**
 * SYNOPSIS: Exports runMemoryImport — scripts/runMemoryImport.mjs.
 */
import { importDumpsToTwin } from './import-dumps-to-twin.js';

export function runMemoryImport() {
  importDumpsToTwin();
}