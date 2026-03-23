import crypto from "crypto";
import { encrypt, decrypt } from "../core/tco-encryption.js";

const DEFAULT_ALLOWED_KEYS = new Set([
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "LIFEOS_GEMINI_KEY",
  "MISTRAL_API_KEY",
  "OPENROUTER_API_KEY",
  "TOGETHER_API_KEY",
  "CEREBRAS_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "LIFEOS_ANTHROPIC_KEY",
  "DEEPSEEK_API_KEY",
  "GROK_API_KEY",
  "BOLDTRAIL_API_KEY",
  "BOLDTRAIL_API_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
  "GITHUB_DEPLOY_BRANCH",
  "REPLICATE_API_TOKEN",
  "OLLAMA_ENDPOINT",
  "DEEPSEEK_LOCAL_ENDPOINT",
  "DEEPSEEK_BRIDGE_ENABLED",
  "PUBLIC_BASE_URL",
  "RAILWAY_PUBLIC_DOMAIN",
  "COMMAND_CENTER_KEY",
  "LIFEOS_KEY",
  "API_KEY",
  "TCO_ENCRYPTION_KEY",
  "GMAIL_SIGNUP_EMAIL",
  "GMAIL_SIGNUP_APP_PASSWORD",
  "WORK_EMAIL",
  "WORK_EMAIL_APP_PASSWORD",
  "POSTMARK_SERVER_TOKEN",
  "TWOCAPTCHA_API_KEY",
  "IMAP_HOST",
  "IMAP_USER",
  "IMAP_PASS",
  "IMAP_PORT",
]);

const BLOCKED_KEYS = new Set([
  "DATABASE_URL",
  "RAILWAY_TOKEN",
  "RAILWAY_PROJECT_ID",
  "RAILWAY_SERVICE_ID",
  "RAILWAY_ENVIRONMENT_ID",
  "PORT",
  "NODE_ENV",
  "HOST",
]);

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function maskValue(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return `${text.slice(0, 2)}****`;
  return `${text.slice(0, 4)}****${text.slice(-2)}`;
}

function parseAllowlistPatterns(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function matchesPattern(name, pattern) {
  if (pattern.endsWith("*")) {
    return name.startsWith(pattern.slice(0, -1));
  }
  return name === pattern;
}

export function createRailwayManagedEnvService({
  pool,
  getRailwayEnvVars,
  setRailwayEnvVar,
  logger = console,
  autosync = process.env.MANAGED_RAILWAY_ENV_AUTOSYNC !== "false",
  autosyncIntervalMs = Number(process.env.MANAGED_RAILWAY_ENV_SYNC_INTERVAL_MS || 10 * 60 * 1000),
  allowlist = process.env.MANAGED_RAILWAY_ENV_ALLOWLIST || "",
} = {}) {
  let autosyncTimer = null;
  const customPatterns = parseAllowlistPatterns(allowlist);

  function isAllowedName(rawName) {
    const name = normalizeName(rawName);
    if (!name) return { ok: false, reason: "Invalid env name" };
    if (BLOCKED_KEYS.has(name)) return { ok: false, reason: `${name} is blocked from managed writes` };
    if (DEFAULT_ALLOWED_KEYS.has(name)) return { ok: true };
    if (customPatterns.some((pattern) => matchesPattern(name, pattern))) return { ok: true };
    return { ok: false, reason: `${name} is not in the managed allowlist` };
  }

  async function ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managed_railway_env_vars (
        id BIGSERIAL PRIMARY KEY,
        env_name TEXT NOT NULL UNIQUE,
        encrypted_value TEXT NOT NULL,
        value_sha256 TEXT NOT NULL,
        description TEXT,
        managed BOOLEAN NOT NULL DEFAULT TRUE,
        allow_overwrite BOOLEAN NOT NULL DEFAULT TRUE,
        sync_on_boot BOOLEAN NOT NULL DEFAULT TRUE,
        target_service_id TEXT,
        target_environment_id TEXT,
        last_synced_at TIMESTAMPTZ,
        last_sync_status TEXT,
        last_sync_error TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS railway_env_sync_audit (
        id BIGSERIAL PRIMARY KEY,
        env_name TEXT,
        action TEXT NOT NULL,
        actor TEXT,
        status TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_managed_railway_env_vars_managed
      ON managed_railway_env_vars (managed, sync_on_boot)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_railway_env_sync_audit_created_at
      ON railway_env_sync_audit (created_at DESC)
    `);
  }

  async function audit({ envName = null, action, actor = "system", status = "ok", details = {} }) {
    try {
      await pool.query(
        `INSERT INTO railway_env_sync_audit (env_name, action, actor, status, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [envName, action, actor, status, JSON.stringify(details || {})]
      );
    } catch (error) {
      logger.warn?.(`[RAILWAY-MANAGED-ENV] audit failed: ${error.message}`);
    }
  }

  async function listDesiredVars() {
    const { rows } = await pool.query(
      `SELECT env_name, description, managed, allow_overwrite, sync_on_boot,
              target_service_id, target_environment_id, last_synced_at,
              last_sync_status, last_sync_error, created_by, updated_by,
              created_at, updated_at
       FROM managed_railway_env_vars
       ORDER BY env_name ASC`
    );
    return rows;
  }

  async function getDesiredVar(name) {
    const normalized = normalizeName(name);
    const { rows } = await pool.query(
      `SELECT * FROM managed_railway_env_vars WHERE env_name = $1`,
      [normalized]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    const decrypted = decrypt(row.encrypted_value);
    return {
      ...row,
      value: decrypted,
      maskedValue: maskValue(decrypted),
    };
  }

  async function upsertDesiredVar({
    name,
    value,
    description = null,
    managed = true,
    allowOverwrite = true,
    syncOnBoot = true,
    actor = "system",
  }) {
    const envName = normalizeName(name);
    const allow = isAllowedName(envName);
    if (!allow.ok) throw new Error(allow.reason);
    if (value === undefined || value === null || value === "") {
      throw new Error("value is required");
    }

    const encryptedValue = encrypt(String(value));
    const valueHash = sha256(String(value));

    await pool.query(
      `INSERT INTO managed_railway_env_vars (
         env_name, encrypted_value, value_sha256, description,
         managed, allow_overwrite, sync_on_boot, created_by, updated_by, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,NOW())
       ON CONFLICT (env_name) DO UPDATE SET
         encrypted_value = EXCLUDED.encrypted_value,
         value_sha256 = EXCLUDED.value_sha256,
         description = EXCLUDED.description,
         managed = EXCLUDED.managed,
         allow_overwrite = EXCLUDED.allow_overwrite,
         sync_on_boot = EXCLUDED.sync_on_boot,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [
        envName,
        encryptedValue,
        valueHash,
        description,
        managed,
        allowOverwrite,
        syncOnBoot,
        actor,
      ]
    );

    await audit({
      envName,
      action: "desired_upsert",
      actor,
      status: "ok",
      details: { managed, allowOverwrite, syncOnBoot, description: description || null },
    });

    return {
      ok: true,
      envName,
      maskedValue: maskValue(value),
      managed,
      allowOverwrite,
      syncOnBoot,
    };
  }

  async function upsertDesiredVars(vars, actor = "system") {
    const results = [];
    for (const [name, rawValue] of Object.entries(vars || {})) {
      try {
        if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
          results.push(await upsertDesiredVar({
            name,
            value: rawValue.value,
            description: rawValue.description || null,
            managed: rawValue.managed !== false,
            allowOverwrite: rawValue.allowOverwrite !== false,
            syncOnBoot: rawValue.syncOnBoot !== false,
            actor,
          }));
        } else {
          results.push(await upsertDesiredVar({ name, value: rawValue, actor }));
        }
      } catch (error) {
        results.push({ ok: false, envName: normalizeName(name), error: error.message });
      }
    }
    return results;
  }

  async function deleteDesiredVar(name, actor = "system") {
    const envName = normalizeName(name);
    const { rowCount } = await pool.query(
      `DELETE FROM managed_railway_env_vars WHERE env_name = $1`,
      [envName]
    );
    await audit({
      envName,
      action: "desired_delete",
      actor,
      status: rowCount ? "ok" : "missing",
    });
    return { ok: rowCount > 0, envName, deleted: rowCount > 0 };
  }

  async function getSyncPlan({ names = null, includeCurrent = false } = {}) {
    const requested = Array.isArray(names) && names.length
      ? names.map(normalizeName)
      : null;
    const { rows } = await pool.query(
      `SELECT * FROM managed_railway_env_vars
       WHERE managed = TRUE
         AND ($1::text[] IS NULL OR env_name = ANY($1::text[]))
       ORDER BY env_name ASC`,
      [requested]
    );
    const currentRemote = await getRailwayEnvVars();
    const plan = rows.map((row) => {
      const desiredValue = decrypt(row.encrypted_value);
      const currentValue = currentRemote[row.env_name];
      const existsRemote = currentValue !== undefined;
      const same = existsRemote && String(currentValue) === String(desiredValue);
      let action = "noop";
      if (!existsRemote) action = "create";
      else if (!same && row.allow_overwrite) action = "update";
      else if (!same && !row.allow_overwrite) action = "skip";
      return {
        envName: row.env_name,
        description: row.description,
        allowOverwrite: row.allow_overwrite,
        syncOnBoot: row.sync_on_boot,
        action,
        maskedDesired: maskValue(desiredValue),
        maskedCurrent: existsRemote ? maskValue(currentValue) : null,
        currentPresent: existsRemote,
        same,
      };
    });
    return {
      count: plan.length,
      plan,
      currentRemote: includeCurrent ? Object.fromEntries(
        Object.entries(currentRemote).map(([key, value]) => [key, maskValue(value)])
      ) : undefined,
    };
  }

  async function syncDesiredVars({ actor = "system", names = null, syncOnBootOnly = false } = {}) {
    const requested = Array.isArray(names) && names.length
      ? names.map(normalizeName)
      : null;
    const { rows } = await pool.query(
      `SELECT * FROM managed_railway_env_vars
       WHERE managed = TRUE
         AND ($1::text[] IS NULL OR env_name = ANY($1::text[]))
         AND ($2::boolean = FALSE OR sync_on_boot = TRUE)
       ORDER BY env_name ASC`,
      [requested, syncOnBootOnly]
    );
    const currentRemote = await getRailwayEnvVars();
    const results = [];

    for (const row of rows) {
      const envName = row.env_name;
      const allow = isAllowedName(envName);
      if (!allow.ok) {
        await audit({
          envName,
          action: "sync",
          actor,
          status: "blocked",
          details: { reason: allow.reason },
        });
        results.push({ envName, ok: false, skipped: true, reason: allow.reason });
        continue;
      }

      const desiredValue = decrypt(row.encrypted_value);
      const currentValue = currentRemote[envName];
      const existsRemote = currentValue !== undefined;
      const same = existsRemote && String(currentValue) === String(desiredValue);

      if (same) {
        results.push({ envName, ok: true, action: "noop", maskedValue: maskValue(desiredValue) });
        continue;
      }

      if (existsRemote && !row.allow_overwrite) {
        await audit({
          envName,
          action: "sync",
          actor,
          status: "skipped",
          details: { reason: "allow_overwrite=false", currentMasked: maskValue(currentValue) },
        });
        results.push({ envName, ok: false, skipped: true, reason: "allow_overwrite=false" });
        continue;
      }

      try {
        await setRailwayEnvVar(envName, desiredValue);
        await pool.query(
          `UPDATE managed_railway_env_vars
           SET last_synced_at = NOW(), last_sync_status = 'ok', last_sync_error = NULL, updated_at = NOW()
           WHERE env_name = $1`,
          [envName]
        );
        await audit({
          envName,
          action: "sync",
          actor,
          status: "ok",
          details: { mode: existsRemote ? "update" : "create" },
        });
        results.push({
          envName,
          ok: true,
          action: existsRemote ? "update" : "create",
          maskedValue: maskValue(desiredValue),
        });
      } catch (error) {
        await pool.query(
          `UPDATE managed_railway_env_vars
           SET last_sync_status = 'error', last_sync_error = $2, updated_at = NOW()
           WHERE env_name = $1`,
          [envName, error.message]
        );
        await audit({
          envName,
          action: "sync",
          actor,
          status: "error",
          details: { error: error.message },
        });
        results.push({ envName, ok: false, error: error.message });
      }
    }

    return {
      ok: results.every((item) => item.ok || item.skipped),
      total: results.length,
      changed: results.filter((item) => item.action === "create" || item.action === "update").length,
      skipped: results.filter((item) => item.skipped).length,
      failed: results.filter((item) => item.ok === false && !item.skipped).length,
      results,
    };
  }

  async function verifyManagedVars({ names = null } = {}) {
    const plan = await getSyncPlan({ names });
    const drifted = plan.plan.filter((item) => !item.same && item.action !== "skip");
    const skipped = plan.plan.filter((item) => item.action === "skip");
    return {
      ok: drifted.length === 0,
      total: plan.count,
      drifted: drifted.length,
      skipped: skipped.length,
      plan: plan.plan,
    };
  }

  async function getAuditLog(limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const { rows } = await pool.query(
      `SELECT id, env_name, action, actor, status, details, created_at
       FROM railway_env_sync_audit
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit]
    );
    return rows;
  }

  async function getStatus() {
    const desired = await listDesiredVars();
    const verification = await verifyManagedVars();
    return {
      autosyncEnabled: autosync,
      autosyncIntervalMs,
      desiredCount: desired.length,
      verification,
      allowlist: {
        defaults: Array.from(DEFAULT_ALLOWED_KEYS).sort(),
        custom: customPatterns,
        blocked: Array.from(BLOCKED_KEYS).sort(),
      },
    };
  }

  function startScheduler() {
    if (!autosync || autosyncTimer) return false;
    autosyncTimer = setInterval(() => {
      syncDesiredVars({ actor: "scheduler", syncOnBootOnly: true }).catch((error) => {
        logger.warn?.(`[RAILWAY-MANAGED-ENV] autosync failed: ${error.message}`);
      });
    }, autosyncIntervalMs);
    if (typeof autosyncTimer.unref === "function") autosyncTimer.unref();
    logger.log?.(`[RAILWAY-MANAGED-ENV] autosync enabled (${autosyncIntervalMs}ms)`);
    return true;
  }

  function stopScheduler() {
    if (!autosyncTimer) return false;
    clearInterval(autosyncTimer);
    autosyncTimer = null;
    return true;
  }

  // ── bootstrapWithToken ────────────────────────────────────────────────────
  /**
   * One-time bootstrap: provide a valid Railway API token and this method will:
   *   1. Validate the token against Railway's API
   *   2. Push RAILWAY_TOKEN itself to Railway (persists after restart)
   *   3. Update process.env.RAILWAY_TOKEN in-memory (takes effect immediately)
   *   4. Store + push any additional vars provided
   *   5. Sync all existing managed vars from Neon → Railway
   *
   * After this call the system is fully self-managing — no manual Railway
   * dashboard access is ever needed again.
   *
   * @param {string} railwayToken  — A valid Railway account API token
   * @param {object} opts
   *   @param {string} [opts.projectId]     — Override RAILWAY_PROJECT_ID
   *   @param {string} [opts.serviceId]     — Override RAILWAY_SERVICE_ID
   *   @param {string} [opts.environmentId] — Override RAILWAY_ENVIRONMENT_ID
   *   @param {object} [opts.vars]          — Additional vars to store+push { KEY: value }
   */
  async function bootstrapWithToken(railwayToken, {
    projectId, serviceId, environmentId, vars = {},
  } = {}) {
    const pid = projectId || process.env.RAILWAY_PROJECT_ID;
    const sid = serviceId || process.env.RAILWAY_SERVICE_ID;
    const eid = environmentId || process.env.RAILWAY_ENVIRONMENT_ID;

    if (!railwayToken) throw new Error('railway_token is required');
    if (!pid || !sid || !eid) {
      throw new Error(
        'projectId, serviceId, and environmentId are required ' +
        '(or set RAILWAY_PROJECT_ID / RAILWAY_SERVICE_ID / RAILWAY_ENVIRONMENT_ID in process.env)'
      );
    }

    const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

    async function bGql(query, variables = {}) {
      const res = await fetch(RAILWAY_GQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${railwayToken}`,
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) throw new Error(`Railway API HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.errors?.length) throw new Error(`Railway GraphQL: ${json.errors[0].message}`);
      return json.data;
    }

    async function pushVar(name, value) {
      return bGql(
        `mutation SetVar($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
        { input: { projectId: pid, environmentId: eid, serviceId: sid, name, value: String(value) } }
      );
    }

    // Step 1: Push RAILWAY_TOKEN to Railway + update in-memory immediately
    await pushVar('RAILWAY_TOKEN', railwayToken);
    process.env.RAILWAY_TOKEN = railwayToken;
    logger.info?.('[RAILWAY-BOOTSTRAP] RAILWAY_TOKEN pushed to Railway and updated in process.env');

    // Step 3: Store + push all provided additional vars
    const pushed = [];
    const pushFailed = [];

    if (Object.keys(vars).length) {
      await upsertDesiredVars(vars, 'bootstrap');
      for (const [name, rawVal] of Object.entries(vars)) {
        const value = typeof rawVal === 'object' && rawVal !== null ? rawVal.value : rawVal;
        if (value === undefined || value === null || value === '') continue;
        try {
          await pushVar(name, value);
          pushed.push(name);
        } catch (err) {
          pushFailed.push({ name, error: err.message });
          logger.warn?.(`[RAILWAY-BOOTSTRAP] Failed to push ${name}: ${err.message}`);
        }
      }
    }

    // Step 4: Sync all existing managed vars from Neon → Railway (now that token works)
    let syncResult = { ok: true, total: 0, changed: 0 };
    try {
      syncResult = await syncDesiredVars({ actor: 'bootstrap' });
      logger.info?.({ ...syncResult }, '[RAILWAY-BOOTSTRAP] Managed vars synced');
    } catch (err) {
      logger.warn?.(`[RAILWAY-BOOTSTRAP] Sync pass failed: ${err.message}`);
      syncResult = { ok: false, error: err.message };
    }

    await audit({
      envName: 'RAILWAY_TOKEN',
      action: 'bootstrap',
      actor: 'bootstrap',
      status: 'ok',
      details: {
        varsProvided: Object.keys(vars).length,
        pushed: pushed.length,
        pushFailed: pushFailed.length,
        syncTotal: syncResult.total,
        syncChanged: syncResult.changed,
      },
    });

    return {
      ok: true,
      message: 'Bootstrap complete. Railway token set, managed vars synced. System is now self-managing.',
      tokenSet: true,
      varsPushed: pushed,
      varsFailed: pushFailed,
      sync: syncResult,
    };
  }

  return {
    ensureSchema,
    isAllowedName,
    listDesiredVars,
    getDesiredVar,
    upsertDesiredVar,
    upsertDesiredVars,
    deleteDesiredVar,
    getSyncPlan,
    syncDesiredVars,
    verifyManagedVars,
    getAuditLog,
    getStatus,
    startScheduler,
    stopScheduler,
    bootstrapWithToken,
  };
}

export default createRailwayManagedEnvService;
