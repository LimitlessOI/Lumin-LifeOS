// services/memory-retrieval.js
import { Pool } from 'pg';
import { buildProvenanceChain } from './memory-provenance.js';

const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

async function assignRetrievalPermission(capsuleId, pool) {
  const result = await pool.query(
    `
      SELECT trust_level FROM memory_capsules WHERE id = $1
    `,
    [capsuleId]
  );
  const trustLevel = result.rows[0].trust_level;
  const permission = trustLevel === 'trusted' ? 'action_authority' : 'decision_support';
  await pool.query(
    `
      UPDATE memory_capsules SET retrieval_permission = $1 WHERE id = $2
    `,
    [permission, capsuleId]
  );
  const capsuleReceipt = await pool.query(
    `
      SELECT capsule_receipt FROM memory_capsules WHERE id = $1
    `,
    [capsuleId]
  );
  return capsuleReceipt.rows[0].capsule_receipt;
}

async function enforceLaneCeiling(capsule, requestedLane) {
  if (capsule.retrieval_permission === 'blocked' && requestedLane !== 'review_lane') {
    return { allowed: false, reason: 'Blocked capsule in non-review lane' };
  }
  const ceilingOrder = ['blocked', 'context_only', 'decision_support', 'action_authority'];
  const currentLane = capsule.retrieval_permission;
  const currentIndex = ceilingOrder.indexOf(currentLane);
  const requestedIndex = ceilingOrder.indexOf(requestedLane);
  if (currentIndex > requestedIndex) {
    return { allowed: false, reason: 'Lane ceiling exceeded' };
  }
  return { allowed: true, reason: 'Lane ceiling satisfied' };
}

async function retrieveCapsules(query, lane, taskScope, pool) {
  if (!lane) {
    throw { halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN' };
  }
  const results = await pool.query(
    `
      SELECT * FROM memory_capsules
    `
  );
  const capsules = results.rows;
  const includedCapsules = [];
  const abstentionCount = 0;
  for (const capsule of capsules) {
    const enforcementResult = await enforceLaneCeiling(capsule, lane);
    if (enforcementResult.allowed) {
      includedCapsules.push(capsule);
    } else {
      abstentionCount++;
    }
  }
  const provenanceChains = includedCapsules.map((capsule) =>
    buildProvenanceChain(capsule, taskScope, pool)
  );
  return {
    results: includedCapsules,
    abstention_count: abstentionCount,
    lane_applied: lane,
  };
}

async function checkZombieLane(capsule, lane) {
  if (capsule.status === 'QUARANTINED' && lane !== 'review_lane') {
    throw { halt_code: 'ZOMBIE_MEMORY_USED_FOR_ACTION' };
  }
}

export { assignRetrievalPermission, enforceLaneCeiling, retrieveCapsules, checkZombieLane };
```