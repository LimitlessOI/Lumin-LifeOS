/**
 * SYNOPSIS: services/memory-signal-intake.js
 */
// services/memory-signal-intake.js
/** @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md */
import { Pool } from 'pg';
import crypto from 'node:crypto';

const normalizeSignal = async (rawInput, context) => {
  const signalId = crypto.randomUUID();
  const sourceType = rawInput.source_type || 'system_observation';
  const quarantineFlag = rawInput.content
    .toLowerCase()
    .match(/(system(?:\s+instruction)?\s*:|canonical\s*:|trust override|promote to canonical|bypass|explicit authority escalation|override trust rules)/i)
    ? true
    : false;

  const signalObject = {
    signal_id: signalId,
    source_type: sourceType,
    signal_type: rawInput.signal_type,
    content: rawInput.content,
    evidence_refs: rawInput.evidence_refs || [],
    ambiguity_level: rawInput.ambiguity_level || 'low',
    received_at: new Date(),
    quarantine_flag: quarantineFlag,
  };

  if (quarantineFlag) {
    throw { halt_code: 'MEMORY_INJECTION_ATTEMPT', signal: signalObject };
  }

  return signalObject;
};

const writeSignalIntakeReceipt = async (signal, pool) => {
  if (!pool) {
    throw new Error('Pool is required');
  }

  const receiptId = await pool.query(
    `
      INSERT INTO memory_use_receipts (receipt_type, created_by, signal_id, source_ref)
      VALUES ('signal_intake_receipt', 'system', $1, $2)
      RETURNING id
    `,
    [signal.signal_id, signal.source_type]
  );

  return receiptId.rows[0].id;
};

export { normalizeSignal, writeSignalIntakeReceipt };
