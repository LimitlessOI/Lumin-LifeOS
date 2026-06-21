/**
 * SYNOPSIS: services/oil-security-receipts.js
 */
// services/oil-security-receipts.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

const SECURITY_RECEIPT_TYPES = Object.freeze({
  GEMINI_LIVE_PROOF: "gemini_live_proof",
  RUNTIME_PROOF: "runtime_proof",
  OIL_AUDIT_RUN: "oil_audit_run",
  SECURITY_FIX_VERIFIED: "security_fix_verified",
  AUDIT_VERIFICATION: "audit_verification",
  DAILY_OIL_SUMMARY: "daily_oil_summary",
  RED_TEAM_FINDING: "red_team_finding",
  HONEYPOT_PROBE: "honeypot_probe",
  CANARY_TRIP: "canary_trip",
  BUILDER_SUPERVISED_BUILD: "builder_supervised_build",
  BUILDER_MODE_CHANGE: "builder_mode_change",
});

const SEC_F01_CORE_RECEIPT_TYPES = Object.freeze([
  SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
  SECURITY_RECEIPT_TYPES.RUNTIME_PROOF,
  SECURITY_RECEIPT_TYPES.OIL_AUDIT_RUN,
  SECURITY_RECEIPT_TYPES.SECURITY_FIX_VERIFIED,
  SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION,
  SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY,
]);

const SECURITY_RECEIPT_CATEGORIES = Object.freeze({
  [SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF]: "runtime_proof",
  [SECURITY_RECEIPT_TYPES.RUNTIME_PROOF]: "runtime_proof",
  [SECURITY_RECEIPT_TYPES.OIL_AUDIT_RUN]: "audit_verification",
  [SECURITY_RECEIPT_TYPES.SECURITY_FIX_VERIFIED]: "audit_verification",
  [SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION]: "audit_verification",
  [SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY]: "daily_summary",
  [SECURITY_RECEIPT_TYPES.RED_TEAM_FINDING]: "compat_legacy",
  [SECURITY_RECEIPT_TYPES.HONEYPOT_PROBE]: "compat_legacy",
  [SECURITY_RECEIPT_TYPES.CANARY_TRIP]: "compat_legacy",
  [SECURITY_RECEIPT_TYPES.BUILDER_SUPERVISED_BUILD]: "compat_builder",
  [SECURITY_RECEIPT_TYPES.BUILDER_MODE_CHANGE]: "compat_builder",
});

const SECRET_KEY_PATTERN = /(secret|password|token|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;
const MAX_STRING_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 240;

function isValidReceiptType(receiptType) {
  return Object.values(SECURITY_RECEIPT_TYPES).includes(receiptType);
}

function truncateString(value, max = MAX_STRING_LENGTH) {
  const stringValue = String(value ?? "");
  return stringValue.length > max ? `${stringValue.slice(0, max)}…` : stringValue;
}

function sanitizeReceiptValue(value, keyPath = "") {
  const keyName = keyPath.split(".").pop() || "";
  if (SECRET_KEY_PATTERN.test(keyName)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry, index) => sanitizeReceiptValue(entry, `${keyPath}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 100).map(([key, entry]) => [
        key,
        sanitizeReceiptValue(entry, keyPath ? `${keyPath}.${key}` : key),
      ])
    );
  }
  if (typeof value === "string") {
    return truncateString(value);
  }
  return value;
}

function sanitizeReceiptPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Security receipt payload must be an object");
  }
  return sanitizeReceiptValue(payload);
}

function buildCanonicalReceiptPayload(receiptType, payload = {}) {
  if (payload?.schema_version === "sec-f01.v1" && payload?.receipt_type === receiptType) {
    return {
      ...sanitizeReceiptValue(payload),
      receipt_type: receiptType,
      category: SECURITY_RECEIPT_CATEGORIES[receiptType] || payload.category || "compat_legacy",
      constraints: {
        no_secrets: true,
        real_data_only: true,
        no_autonomous_enforcement: true,
      },
    };
  }

  const sanitized = sanitizeReceiptPayload(payload);
  const runtime = sanitized.runtime && typeof sanitized.runtime === "object"
    ? sanitized.runtime
    : {};
  const summary = truncateString(
    sanitized.summary ||
      sanitized.message ||
      sanitized.proof_result ||
      sanitized.note ||
      `${receiptType} receipt recorded`,
    MAX_SUMMARY_LENGTH
  );

  return {
    schema_version: "sec-f01.v1",
    receipt_type: receiptType,
    category: SECURITY_RECEIPT_CATEGORIES[receiptType] || "compat_legacy",
    status: truncateString(sanitized.status || "RECORDED", 64),
    subject: truncateString(sanitized.subject || receiptType, 120),
    summary,
    runtime: {
      environment:
        runtime.environment ||
        process.env.RAILWAY_ENVIRONMENT_NAME ||
        process.env.NODE_ENV ||
        "unknown",
      commit_sha:
        runtime.commit_sha ||
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        "unknown",
      proof_source: truncateString(runtime.proof_source || sanitized.proof_source || "runtime", 120),
    },
    constraints: {
      no_secrets: true,
      real_data_only: true,
      no_autonomous_enforcement: true,
    },
    details: sanitized,
  };
}

function shapeReceiptRow(row) {
  const payload = sanitizeReceiptValue(row.payload || {});
  return {
    id: row.id,
    receipt_type: row.receipt_type,
    payload,
    created_at: row.created_at,
  };
}

function createRuntimeProofReceipt({
  receiptType = SECURITY_RECEIPT_TYPES.RUNTIME_PROOF,
  model,
  latency_ms,
  confirmed,
  prompt_response,
  proof_source = "runtime",
  summary,
}) {
  return buildCanonicalReceiptPayload(receiptType, {
    status: confirmed ? "PASS" : "FAIL",
    subject: model || receiptType,
    summary: summary || `${receiptType} ${confirmed ? "confirmed" : "failed"}`,
    model,
    latency_ms,
    confirmed,
    prompt_response,
    runtime: { proof_source },
  });
}

function createAuditVerificationReceipt({
  summary,
  verification_target,
  verification_result = "PASS",
  evidence_refs = [],
  proof_source = "audit",
}) {
  return buildCanonicalReceiptPayload(SECURITY_RECEIPT_TYPES.AUDIT_VERIFICATION, {
    status: verification_result,
    subject: verification_target || "audit_verification",
    summary: summary || "Audit verification recorded",
    evidence_refs,
    runtime: { proof_source },
  });
}

async function writeSecurityReceipt(receiptType, payload, pool) {
  if (!isValidReceiptType(receiptType)) {
    throw new Error(`Invalid receipt type: ${receiptType}`);
  }
  const canonicalPayload = buildCanonicalReceiptPayload(receiptType, payload || {});
  const result = await pool.query(
    `INSERT INTO security_receipts (receipt_type, payload) VALUES ($1, $2) RETURNING id`,
    [receiptType, canonicalPayload]
  );
  return { receipt_id: result.rows[0].id };
}

async function readRecentReceipts(limit = 50, pool, options = {}) {
  const coreOnly = options.coreOnly === true;
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const params = [];
  const where = [];
  if (coreOnly) {
    params.push(SEC_F01_CORE_RECEIPT_TYPES);
    where.push(`receipt_type = ANY($${params.length}::text[])`);
  }
  params.push(normalizedLimit);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT id, receipt_type, payload, created_at
       FROM security_receipts
       ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params
  );
  return result.rows.map(shapeReceiptRow);
}

async function readReceiptsByType(receiptType, limit = 20, pool) {
  if (!isValidReceiptType(receiptType)) {
    throw new Error(`Invalid receipt type: ${receiptType}`);
  }
  const result = await pool.query(
    `SELECT id, receipt_type, payload, created_at FROM security_receipts WHERE receipt_type = $1 ORDER BY created_at DESC LIMIT $2`,
    [receiptType, Math.max(1, Math.min(Number(limit) || 20, 200))]
  );
  return result.rows.map(shapeReceiptRow);
}

async function readLatestDailySummary(pool) {
  const rows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.DAILY_OIL_SUMMARY, 1, pool);
  return rows[0] || null;
}

export {
  SECURITY_RECEIPT_TYPES,
  SEC_F01_CORE_RECEIPT_TYPES,
  SECURITY_RECEIPT_CATEGORIES,
  createRuntimeProofReceipt,
  createAuditVerificationReceipt,
  writeSecurityReceipt,
  readRecentReceipts,
  readReceiptsByType,
  readLatestDailySummary,
  buildCanonicalReceiptPayload,
};
