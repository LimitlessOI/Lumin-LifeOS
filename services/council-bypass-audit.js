/**
 * SYNOPSIS: --- Constants for Audit Configuration ---
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'child_process';

// --- Constants for Audit Configuration ---
const DIRECTORY_SCOPE = ['services/', 'routes/'];
const EXCLUDE_FILES = ['builder-council-review.js', 'metered-ai-call.js'];
// This pattern targets common ways of directly interacting with a 'provider' object
// or instantiating a 'Provider' without going through a controlled factory/interface.
const DIRECT_PROVIDER_FETCH_PATTERN = 'provider\\.get|provider\\.fetch|provider\\.create|new Provider\\(';
const KNOWN_P0_FILE = 'services/builder-council-review.js';
const KNOWN_P0_BYPASS_COUNT = 8; // As specified in the task

/**
 * Audits the codebase for direct provider fetches that bypass the council review process.
 * This function leverages the `grep` command-line utility to identify files within
 * specified directories (`services/` and `routes/`) that contain patterns indicative
 * of direct interaction with a 'provider' object, thereby potentially bypassing
 * established governance mechanisms.
 *
 * Files explicitly listed in `EXCLUDE_FILES` are omitted from the audit to prevent
 * false positives or to acknowledge sanctioned bypasses.
 *
 * @param {string} projectRoot - The absolute path to the root directory of the project
 *   to be audited. Defaults to the current working directory (`process.cwd()`) if not provided.
 * @returns {Promise<{ bypass_count: number, bypass_files: string[], known_p0_file: string, known_p0_bypass_count: number, audit_source: string, audited_at: string } | { bypass_count: -1, error: string }>}
 *   A Promise that resolves to an object containing the audit results.
 *   - `bypass_count`: The total number of files identified as containing direct provider fetches.
 *   - `bypass_files`: An array of strings, where each string is the path to a file
 *     identified as a bypass, relative to `projectRoot`.
 *   - `known_p0_file`: The path to a known P0 file, as per specification.
 *   - `known_p0_bypass_count`: The specified bypass count for the known P0 file.
 *   - `audit_source`: Indicates the tool used for the audit (e.g., 'grep').
 *   - `audited_at`: An ISO 8601 timestamp indicating when the audit was performed.
 *   If an error occurs during the audit (e.g., `grep` command fails), the Promise
 *   resolves to an error object with `bypass_count: -1` and an `error` message.
 */
export async function auditCouncilBypasses(projectRoot = process.cwd()) {
  try {
    // Construct the grep command dynamically using defined constants.
    // -r: Recursive search through directories.
    // -l: List only the names of files that contain matches.
    // -E: Use extended regular expressions (for OR operator in pattern).
    // --exclude: Exclude specified files from the search.
    const excludeArgs = EXCLUDE_FILES.map(file => `--exclude=${file}`).join(' ');
    const searchScopeArgs = DIRECTORY_SCOPE.join(' ');

    const grepCommand = `grep -r -l -E "${DIRECT_PROVIDER_FETCH_PATTERN}" ${searchScopeArgs} ${excludeArgs}`;

    // Execute the grep command. The `cwd` option ensures the command runs
    // relative to the specified project root, making file paths consistent.
    // `encoding: 'utf8'` ensures the output is a string.
    const stdoutBuffer = execSync(grepCommand, { cwd: projectRoot, encoding: 'utf8' });
    const stdout = stdoutBuffer.toString().trim();

    // Process the output: split by newline and filter out any empty lines.
    // This results in an array of file paths that contain the bypass pattern.
    const bypassFiles = stdout
      ? stdout.split('\n').filter(file => file.length > 0)
      : [];

    // Return the structured audit result.
    return {
      bypass_count: bypassFiles.length,
      bypass_files: bypassFiles,
      known_p0_file: KNOWN_P0_FILE,
      known_p0_bypass_count: KNOWN_P0_BYPASS_COUNT,
      audit_source: 'grep',
      audited_at: new Date().toISOString(),
    };
  } catch (e) {
    // Catch any errors that occur during the execution of execSync (e.g.,
    // command not found, permission issues, or non-zero exit code from grep
    // if it encounters an error other than no matches).
    // Return a standardized error object as per specification.
    return {
      bypass_count: -1,
      error: e.message,
    };
  }
}