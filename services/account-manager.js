/**
 * account-manager.js
 * Encrypted credential vault for all system-managed accounts.
 * Stores and retrieves account credentials from Neon with AES-256-GCM encryption.
 *
 * Deps: pool (pg), core/tco-encryption.js
 */

import { encrypt, decrypt } from "../core/tco-encryption.js";

function maskValue(value) {
  const s = String(value || "");
  if (!s) return "";
  if (s.length <= 8) return `${s.slice(0, 2)}****`;
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

export function createAccountManager({ pool, logger = console } = {}) {

  async function ensureSchema() {
    // Schema is in db/migrations/20260322_managed_accounts.sql
    // Auto-runner handles this at boot — this is a no-op safety check
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managed_accounts (
        id              BIGSERIAL PRIMARY KEY,
        service_name    TEXT NOT NULL,
        service_url     TEXT,
        email_used      TEXT NOT NULL,
        username        TEXT,
        encrypted_password TEXT,
        status          TEXT NOT NULL DEFAULT 'pending',
        plan_name       TEXT,
        account_id      TEXT,
        api_key_hint    TEXT,
        encrypted_api_key TEXT,
        notes           TEXT,
        metadata        JSONB,
        captcha_required BOOLEAN DEFAULT FALSE,
        human_required  BOOLEAN DEFAULT FALSE,
        last_action     TEXT,
        last_error      TEXT,
        verified_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managed_accounts_log (
        id            BIGSERIAL PRIMARY KEY,
        account_id    BIGINT REFERENCES managed_accounts(id) ON DELETE CASCADE,
        service_name  TEXT,
        action        TEXT NOT NULL,
        status        TEXT NOT NULL,
        details       JSONB,
        screenshot_path TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_accounts_service_email
        ON managed_accounts (service_name, email_used)
    `);
  }

  async function upsertAccount({
    serviceName,
    serviceUrl = null,
    emailUsed,
    password = null,
    username = null,
    status = "pending",
    planName = null,
    accountId = null,
    apiKey = null,
    notes = null,
    metadata = null,
    captchaRequired = false,
    humanRequired = false,
    lastAction = null,
    lastError = null,
    verifiedAt = null,
  }) {
    const encryptedPassword = password ? encrypt(String(password)) : null;
    const encryptedApiKey = apiKey ? encrypt(String(apiKey)) : null;
    const apiKeyHint = apiKey ? maskValue(apiKey) : null;

    const { rows } = await pool.query(
      `INSERT INTO managed_accounts (
         service_name, service_url, email_used, username,
         encrypted_password, status, plan_name, account_id,
         api_key_hint, encrypted_api_key, notes, metadata,
         captcha_required, human_required, last_action, last_error,
         verified_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,NOW())
       ON CONFLICT (service_name, email_used) DO UPDATE SET
         service_url = COALESCE(EXCLUDED.service_url, managed_accounts.service_url),
         username = COALESCE(EXCLUDED.username, managed_accounts.username),
         encrypted_password = COALESCE(EXCLUDED.encrypted_password, managed_accounts.encrypted_password),
         status = EXCLUDED.status,
         plan_name = COALESCE(EXCLUDED.plan_name, managed_accounts.plan_name),
         account_id = COALESCE(EXCLUDED.account_id, managed_accounts.account_id),
         api_key_hint = COALESCE(EXCLUDED.api_key_hint, managed_accounts.api_key_hint),
         encrypted_api_key = COALESCE(EXCLUDED.encrypted_api_key, managed_accounts.encrypted_api_key),
         notes = COALESCE(EXCLUDED.notes, managed_accounts.notes),
         metadata = COALESCE(EXCLUDED.metadata, managed_accounts.metadata),
         captcha_required = EXCLUDED.captcha_required,
         human_required = EXCLUDED.human_required,
         last_action = EXCLUDED.last_action,
         last_error = EXCLUDED.last_error,
         verified_at = COALESCE(EXCLUDED.verified_at, managed_accounts.verified_at),
         updated_at = NOW()
       RETURNING id, service_name, email_used, status`,
      [
        serviceName, serviceUrl, emailUsed, username,
        encryptedPassword, status, planName, accountId,
        apiKeyHint, encryptedApiKey, notes,
        metadata ? JSON.stringify(metadata) : null,
        captchaRequired, humanRequired, lastAction, lastError,
        verifiedAt,
      ]
    );

    return rows[0];
  }

  async function getAccount(serviceName, emailUsed) {
    const email = emailUsed || process.env.GMAIL_SIGNUP_EMAIL;
    const { rows } = await pool.query(
      `SELECT * FROM managed_accounts WHERE service_name = $1 AND email_used = $2`,
      [serviceName, email]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      ...row,
      password: row.encrypted_password ? decrypt(row.encrypted_password) : null,
      apiKey: row.encrypted_api_key ? decrypt(row.encrypted_api_key) : null,
      maskedPassword: row.encrypted_password
        ? maskValue(decrypt(row.encrypted_password))
        : null,
    };
  }

  async function listAccounts({ status = null } = {}) {
    const { rows } = await pool.query(
      `SELECT id, service_name, service_url, email_used, username, status,
              plan_name, account_id, api_key_hint, notes, captcha_required,
              human_required, last_action, last_error, verified_at,
              created_at, updated_at
       FROM managed_accounts
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC`,
      [status]
    );
    return rows;
  }

  async function logAction({
    accountId,
    serviceName,
    action,
    status = "ok",
    details = {},
    screenshotPath = null,
  }) {
    try {
      await pool.query(
        `INSERT INTO managed_accounts_log (account_id, service_name, action, status, details, screenshot_path)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [accountId, serviceName, action, status, JSON.stringify(details), screenshotPath]
      );
    } catch (err) {
      logger.warn?.(`[ACCOUNT-MANAGER] log failed: ${err.message}`);
    }
  }

  async function getLog(accountId, limit = 50) {
    const { rows } = await pool.query(
      `SELECT * FROM managed_accounts_log
       WHERE ($1::bigint IS NULL OR account_id = $1)
       ORDER BY created_at DESC LIMIT $2`,
      [accountId || null, Math.min(Number(limit) || 50, 200)]
    );
    return rows;
  }

  async function getStatus() {
    const { rows } = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM managed_accounts
      GROUP BY status ORDER BY status
    `);
    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    return {
      total,
      byStatus: Object.fromEntries(rows.map((r) => [r.status, Number(r.count)])),
      needsHuman: (await listAccounts({ status: "needs_human" })).length,
    };
  }

  return {
    ensureSchema,
    upsertAccount,
    getAccount,
    listAccounts,
    logAction,
    getLog,
    getStatus,
  };
}

export default createAccountManager;
