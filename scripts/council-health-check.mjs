/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * @file scripts/council-health-check.mjs
 * @description Tests the health of various council members by sending a trivial build request.
 */

import { performance } from 'node:perf_hooks';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

if (!PUBLIC_BASE_URL) {
  console.error('Error: PUBLIC_BASE_URL environment variable is not set.');
  process.exit(1);
}
if (!COMMAND_CENTER_KEY) {
  console.error('Error: COMMAND_CENTER_KEY environment variable is not set.');
  process.exit(1);
}

const councilMembers = [
  'groq_llama',
  'gemini_flash',
  'cerebras_llama',
  'openrouter_free',
];

const trivialSpec = 'Write: export const ok = true;';

async function main() {
  console.log('--- Council Health Check ---');
  console.log(`Target Base URL: ${PUBLIC_BASE_URL}`);
  console.log(`Testing ${councilMembers.length} council members with spec: "${trivialSpec}"\n`);

  const results = [];

  for (const member of councilMembers) {
    const startTime = performance.now();
    let status = 'ERROR';
    let responseTime = 'N/A';

    try {
      const response = await fetch(`${PUBLIC_BASE_URL}/api/v1/lifeos/builder/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${COMMAND_CENTER_KEY}`,
        },
        body: JSON.stringify({
          spec: trivialSpec,
          target_model: member,
        }),
      });

      const endTime = performance.now();
      responseTime = `${(endTime - startTime).toFixed(2)}ms`;

      if (response.ok) {
        status = 'OK';
      } else {
        const errorText = await response.text();
        status = `ERROR (${response.status}: ${errorText.substring(0, 50)}...)`;
      }
    } catch (error) {
      const endTime = performance.now();
      responseTime = `${(endTime - startTime).toFixed(2)}ms`;
      status = `NETWORK ERROR: ${error.message.substring(0, 50)}...`;
    } finally {
      results.push({ member, status, responseTime });
      console.log(`[${member.padEnd(15)}] Status: ${status.padEnd(30)} | Time: ${responseTime}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log('-----------------------------------------------------------------');
  console.log('Member             | Status                         | Response Time');
  console.log('-----------------------------------------------------------------');
  for (const result of results) {
    console.log(`${result.member.padEnd(18)} | ${result.status.padEnd(30)} | ${result.responseTime}`);
  }
  console.log('-----------------------------------------------------------------');

  const healthyCount = results.filter(r => r.status === 'OK').length;
  console.log(`\n${healthyCount} of ${councilMembers.length} council members are healthy.`);

  if (healthyCount !== councilMembers.length) {
    process.exit(1); // Indicate failure if not all members are healthy
  }
}

main().catch(error => {
  console.error('\nAn unhandled error occurred:', error);
  process.exit(1);
});