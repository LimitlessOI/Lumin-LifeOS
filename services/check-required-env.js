/**
 * SYNOPSIS: Checks if a list of required environment variables are present in process.env.
 * Checks if a list of required environment variables are present in process.env.
 *
 * @param {string[]} varNames - An array of environment variable names to check.
 * @returns {true} - Returns true if all specified environment variables are present.
 * @throws {Error} - Throws an Error if any required environment variables are missing,
 *                   listing all missing variables in the error message.
 */
export function checkRequiredEnv(varNames) {
  const missingVars = [];

  for (const name of varNames) {
    if (process.env[name] === undefined) {
      missingVars.push(name);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return true;
}