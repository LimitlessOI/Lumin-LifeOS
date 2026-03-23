/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
export function createSandboxTester({ runSandboxTest, rootDir, pool }) {
  return async function sandboxTest(code, testDescription) {
    return runSandboxTest({ code, testDescription, __dirname: rootDir, pool });
  };
}
