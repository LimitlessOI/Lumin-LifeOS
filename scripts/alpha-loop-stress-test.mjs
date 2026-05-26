// scripts/alpha-loop-stress-test.mjs
import fetch from 'node-fetch';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

const proofFreshnessUrl = `${PUBLIC_BASE_URL}/api/v1/lifeos/command-center/proof-freshness`;
const selfRepairDeployCheckUrl = `${PUBLIC_BASE_URL}/api/v1/lifeos/command-center/self-repair/deploy-check`;
const proofStalenessUrl = `${PUBLIC_BASE_URL}/api/v1/gemini/proof`;

async function getProofFreshness() {
  const response = await fetch(proofFreshnessUrl, {
    headers: {
      'Authorization': `Bearer ${COMMAND_CENTER_KEY}`,
    },
  });
  const data = await response.json();
  return data;
}

async function forceStaleness() {
  const response = await fetch(proofStalenessUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${COMMAND_CENTER_KEY}`,
    },
    body: JSON.stringify({ fakeSHA: 'fake-sha-123' }),
  });
  const data = await response.json();
  return data;
}

async function selfRepairDeployCheck() {
  const response = await fetch(selfRepairDeployCheckUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COMMAND_CENTER_KEY}`,
    },
  });
  const data = await response.json();
  return data;
}

async function pollProofFreshness() {
  let lastState = null;
  let timeout = false;
  for (let i = 0; i < 24; i++) {
    const response = await fetch(proofFreshnessUrl, {
      headers: {
        'Authorization': `Bearer ${COMMAND_CENTER_KEY}`,
      },
    });
    const data = await response.json();
    if (data.freshness.overall === 'CURRENT') {
      console.log(`Proof CURRENT: ${data.freshness.overall}`);
      console.log(`Repair queue open count: ${data.repair_queue.open_count}`);
      process.exit(0);
    } else {
      lastState = data;
    }
    if (i * 5 >= 120) {
      timeout = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (timeout) {
    console.log(`TIMEOUT: ${lastState.freshness.overall}`);
    console.log(`Last state: ${JSON.stringify(lastState)}`);
    process.exit(1);
  }
}

async function main() {
  const preTestState = await getProofFreshness();
  if (preTestState.freshness.overall === 'CURRENT') {
    const fakeStaleness = await forceStaleness();
    console.log(`Forced staleness: ${fakeStaleness}`);
  }
  const deployCheck = await selfRepairDeployCheck();
  console.log(`Deploy check: ${deployCheck}`);
  await pollProofFreshness();
}

main();
```

```json
---
METADATA---
{
  "target_file": "scripts/alpha-loop-stress-test.mjs",
  "insert_after_line": null,
  "confidence": 0.9
}