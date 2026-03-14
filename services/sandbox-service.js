/**
 * Sandbox Service — runs AI-generated code snippets in an isolated temp file
 * via child_process exec (5 s timeout), persisting pass/fail results to the
 * database for audit and escalation decisions.
 *
 * Dependencies: path, fs, child_process (exec), util (promisify), pool (pg, injected)
 * Exports: sandboxTest({ code, testDescription, __dirname, pool })
 */
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Run a sandboxed Node.js test for a code snippet and persist results.
 */
export async function sandboxTest({ code, testDescription, __dirname, pool }) {
  try {
    const testId = `test_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    console.log(`🧪 Sandbox testing: ${testDescription}`);

    const sandboxDir = path.join(__dirname, "sandbox");
    const testPath = path.join(sandboxDir, `${testId}.js`);
    await fsPromises.mkdir(sandboxDir, { recursive: true });

    const wrappedCode = `
      // Sandbox test: ${testDescription}
      ${code}
      console.log('Test completed successfully');
    `;

    await fsPromises.writeFile(testPath, wrappedCode);

    let testResult;
    let success = false;
    let errorMessage = null;

    try {
      const { stdout, stderr } = await execAsync(
        `node --no-warnings ${testPath}`,
        {
          timeout: 5000,
          cwd: __dirname,
          env: { ...process.env, NODE_ENV: "test" },
        }
      );

      testResult = stdout || "Test passed";
      success = !stderr || stderr.includes("Warning");
      if (stderr && !success) errorMessage = stderr;
    } catch (error) {
      testResult = "Test failed";
      errorMessage = error.message;
      success = false;
    }

    await fsPromises.unlink(testPath).catch((cleanupError) => {
      console.debug(
        "[SANDBOX] Failed to cleanup test file:",
        cleanupError.message
      );
    });

    await pool.query(
      `INSERT INTO sandbox_tests (test_id, code_change, test_result, success, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [testId, code.slice(0, 1000), testResult, success, errorMessage]
    );

    return { success, result: testResult, error: errorMessage };
  } catch (error) {
    console.error("Sandbox test error:", error.message);
    return { success: false, result: null, error: error.message };
  }
}

