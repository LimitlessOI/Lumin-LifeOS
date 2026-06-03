// config/builder-safe-scope.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

// Paths the supervised Builder is allowed to write or overwrite.
// Unlisted paths require manual mode or founder approval.
export const SAFE_WRITE_PATHS = Object.freeze([
  'routes/',
  'services/',
  'config/',
  'db/migrations/',
  'prompts/',
  'public/overlay/',
  'scripts/',
  'docs/projects/builderos-remediation/',
  'factory-v1/',
  'docs/architecture/factory-v1-blueprint-pack/',
]);

// Paths that are always blocked regardless of mode.
export const BLOCKED_WRITE_PATHS = Object.freeze([
  'server.js',
  'startup/',
  'middleware/',
  'core/',
  '.env',
  '.github/',
  'CLAUDE.md',
  'docs/SSOT_NORTH_STAR.md',
  'docs/SSOT_COMPANION.md',
]);

// Task types the supervised Builder may execute without extra approval.
export const SAFE_TASK_TYPES = Object.freeze([
  'create_service',
  'create_route',
  'create_migration',
  'create_config',
  'update_prompt',
  'create_script',
]);

// Task types that are always blocked in supervised mode.
export const BLOCKED_TASK_TYPES = Object.freeze([
  'modify_constitution',
  'delete_file',
  'modify_auth',
  'modify_startup',
  'modify_server',
]);

export function isSafeTarget(targetFile) {
  if (!targetFile) return false;
  const normalized = targetFile.replace(/^\//, '');
  for (const blocked of BLOCKED_WRITE_PATHS) {
    if (normalized === blocked || normalized.startsWith(blocked)) return false;
  }
  for (const safe of SAFE_WRITE_PATHS) {
    if (normalized.startsWith(safe)) return true;
  }
  return false;
}
