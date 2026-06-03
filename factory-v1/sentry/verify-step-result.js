import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

async function runTest(test) {
  if (test.type === 'file_exists') {
    await readFile(test.target, 'utf8');
    return true;
  }

  if (test.type === 'json_parseable') {
    const content = await readFile(test.target, 'utf8');
    JSON.parse(content);
    return true;
  }

  if (test.type === 'file_contains_string') {
    const content = await readFile(test.target, 'utf8');
    return content.includes(test.expected);
  }

  if (test.type === 'file_contains_export') {
    const content = await readFile(test.target, 'utf8');
    return content.includes(`export ${test.expected}`) || content.includes(`export async function ${test.expected}`) || content.includes(`export function ${test.expected}`);
  }

  if (test.type === 'node_check') {
    try {
      execSync(`node --check ${JSON.stringify(test.target)}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  throw new Error(`UNSUPPORTED_TEST_TYPE:${test.type}`);
}

export async function verifyStepResult(result, acceptanceTests) {
  const failedTestIds = [];

  for (const test of acceptanceTests) {
    const passed = await runTest(test);
    if (!passed) {
      failedTestIds.push(test.test_id);
    }
  }

  return {
    status: failedTestIds.length === 0 ? 'VERIFIED' : 'FAILED_VERIFICATION',
    passed: failedTestIds.length === 0,
    failed_test_ids: failedTestIds,
    builder_result: result
  };
}
