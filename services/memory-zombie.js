// services/memory-zombie.js
import { Pool } from 'pg';
import { LEVEL } from '../memory-intelligence-service.js';

const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

async function isZombie(capsuleId, pool) {
  const result = await pool.query(
    `SELECT review_by, status FROM memory_capsules WHERE capsule_id = $1`,
    [capsuleId]
  );
  return result.rows[0].status === 'QUARANTINED' || result.rows[0].review_by < new Date();
}

async function quarantineCapsule(capsuleId, reason, pool) {
  await pool.query(
    `UPDATE memory_capsules SET status = 'QUARANTINED', updated_at = NOW() WHERE capsule_id = $1`,
    [capsuleId]
  );
  await pool.query(
    `INSERT INTO agent_protocol_violations (incident_type, details, related_capsule_id) VALUES ($1, $2, $3)`,
    ['zombie_quarantine', reason, capsuleId]
  );
}

async function runZombieCheck(capsuleIds, pool) {
  const results = await Promise.all(
    capsuleIds.map((capsuleId) => isZombie(capsuleId, pool))
  );
  const quarantined = capsuleIds.filter((_, index) => results[index]);
  const healthy = capsuleIds.filter((_, index) => !results[index]);
  return { quarantined, healthy };
}

async function delayQuarantine(capsuleId, newReviewBy, correctionReceipt, pool) {
  const correctionReceiptResult = await pool.query(
    `SELECT * FROM memory_use_receipts WHERE receipt_type = 'correction_receipt' AND receipt_id = $1`,
    [correctionReceipt]
  );
  if (!correctionReceiptResult.rows.length) {
    throw new Error('Correction receipt not found');
  }
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (new Date(newReviewBy) > now || new Date(newReviewBy) > sevenDaysAgo) {
    throw new Error('Invalid new review by date');
  }
  await pool.query(
    `UPDATE memory_capsules SET review_by = $1 WHERE capsule_id = $2`,
    [newReviewBy, capsuleId]
  );
}

async function checkZombieForAction(capsuleId, lane, pool) {
  if (lane === 'action_authority_lane' && (await isZombie(capsuleId, pool))) {
    throw { halt_code: 'ZOMBIE_MEMORY_USED_FOR_ACTION' };
  }
}

export {
  isZombie,
  quarantineCapsule,
  runZombieCheck,
  delayQuarantine,
  checkZombieForAction,
};