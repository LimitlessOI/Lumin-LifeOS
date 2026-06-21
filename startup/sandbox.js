/**
 * SYNOPSIS: Exports createSandboxTester — startup/sandbox.js.
 */
export function createSandboxTester({ runSandboxTest, rootDir, pool }) {
  return async function sandboxTest(code, testDescription) {
    return runSandboxTest({ code, testDescription, __dirname: rootDir, pool });
  };
}
