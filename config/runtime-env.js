/** @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md — council/env overlap (Ollama policy, spend caps) */
export function loadRuntimeEnv() {
  const {
    DATABASE_URL,
    DATABASE_URL_SANDBOX,
    SANDBOX_MODE,
    COMMAND_CENTER_KEY,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    LIFEOS_ANTHROPIC_KEY,
    LIFEOS_GEMINI_KEY,
    DEEPSEEK_API_KEY,
    GROK_API_KEY,
    GITHUB_TOKEN,
    GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
    GITHUB_DEPLOY_BRANCH = "main",
    // Railway API (needed to set env vars + trigger deploys programmatically)
    // Get your token: railway.app → Account Settings → Tokens → New Token
    RAILWAY_TOKEN,
    RAILWAY_PROJECT_ID,
    RAILWAY_SERVICE_ID,
    RAILWAY_ENVIRONMENT_ID,
    DEEPSEEK_LOCAL_ENDPOINT = "",
    DEEPSEEK_BRIDGE_ENABLED = "false",
    ALLOWED_ORIGINS = "",
    HOST = "0.0.0.0",
    PORT = 8080,
    // Spend cap (can be overridden in Railway env). Default: $0/day - NO SPENDING
    MAX_DAILY_SPEND: RAW_MAX_DAILY_SPEND = "0",
    // Cost shutdown threshold - if spending exceeds this, only use free models
    COST_SHUTDOWN_THRESHOLD: RAW_COST_SHUTDOWN = "0",
    NODE_ENV = "production",
    RAILWAY_PUBLIC_DOMAIN = "robust-magic-production.up.railway.app",
    RAILWAY_ENVIRONMENT,
    // Database SSL config (default: false for Neon.tech compatibility)
    DB_SSL_REJECT_UNAUTHORIZED = "false",
    // Stripe config
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET, // reserved for future webhook use
    // Web search APIs (for UX research during builds — both optional)
    BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY,
  } = process.env;

  // Require COMMAND_CENTER_KEY (no default fallback)
  if (!COMMAND_CENTER_KEY) {
    throw new Error("COMMAND_CENTER_KEY environment variable is required");
  }

  // Ensure spend cap is numeric
  const MAX_DAILY_SPEND = Number.isFinite(parseFloat(RAW_MAX_DAILY_SPEND))
    ? parseFloat(RAW_MAX_DAILY_SPEND)
    : 0; // Default $0/day - NO SPENDING

  // Cost shutdown threshold - if exceeded, only free models allowed
  const COST_SHUTDOWN_THRESHOLD = Number.isFinite(parseFloat(RAW_COST_SHUTDOWN))
    ? parseFloat(RAW_COST_SHUTDOWN)
    : 0; // Default $0/day - BLOCK ALL PAID MODELS

  const CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || "")
    .trim() || null;

  const isRailwayDeploy = !!(
    RAILWAY_ENVIRONMENT ||
    RAILWAY_PROJECT_ID ||
    RAILWAY_SERVICE_ID ||
    RAILWAY_ENVIRONMENT_ID
  );

  const _ollamaExplicit =
    (
      process.env.OLLAMA_ENDPOINT ||
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_URL ||
      process.env.OLLAMA_API_BASE ||
      (process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}` : "") ||
      ""
    ).trim();

  /** Explicit only on Railway — avoids boot pings to ollama.railway.internal or a tunnel to your Mac. */
  const OLLAMA_ENDPOINT =
    _ollamaExplicit || (!isRailwayDeploy ? "http://localhost:11434" : "");

  /**
   * off — never use Ollama in council routing (free cloud APIs only). Default on Railway.
   * last_resort — Ollama only after other free providers hit daily limits.
   * on — same as last_resort for now.
   */
  const rawCouncilOllama = String(process.env.COUNCIL_OLLAMA_MODE || "")
    .toLowerCase()
    .trim();
  let COUNCIL_OLLAMA_MODE = "last_resort";
  if (["off", "last_resort", "on"].includes(rawCouncilOllama)) {
    COUNCIL_OLLAMA_MODE = rawCouncilOllama;
  } else if (isRailwayDeploy) {
    COUNCIL_OLLAMA_MODE = "off";
  }

  // ==================== DATABASE ENVIRONMENT VALIDATION ====================
  /**
   * Validates database environment variables and determines the correct connection string
   * Fails fast if required variables are missing or misconfigured
   *
   * Rules:
   * - SANDBOX_MODE=true: Requires both DATABASE_URL and DATABASE_URL_SANDBOX, must be exactly equal
   * - Production: Requires DATABASE_URL (not placeholder)
   */
  function validateDatabaseConfig() {
    const errors = [];
    const warnings = [];

    // Detect environment: Use SANDBOX_MODE flag (no heuristics)
    const isSandboxMode = SANDBOX_MODE === "true";
    const isRailway = !!(
      RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
    );

    console.log("\n🔍 [DB VALIDATOR] Environment Detection:");
    console.log(`   Railway: ${isRailway ? "✅" : "❌"}`);
    console.log(`   Environment: ${RAILWAY_ENVIRONMENT || "not set"}`);
    console.log(`   SANDBOX_MODE: ${SANDBOX_MODE || "not set"}`);
    console.log(`   Detected: ${isSandboxMode ? "🔶 SANDBOX" : "🔵 PRODUCTION"}`);

    // Determine which database URL to use
    let finalDatabaseUrl;
    let databaseSource;

    if (isSandboxMode) {
      // SANDBOX MODE: Both DATABASE_URL and DATABASE_URL_SANDBOX are REQUIRED and must match exactly
      if (!DATABASE_URL) {
        errors.push("DATABASE_URL is required when SANDBOX_MODE=true");
      }
      if (!DATABASE_URL_SANDBOX) {
        errors.push("DATABASE_URL_SANDBOX is required when SANDBOX_MODE=true");
      }

      if (DATABASE_URL && DATABASE_URL_SANDBOX) {
        // Exact equality check (no heuristics)
        if (DATABASE_URL !== DATABASE_URL_SANDBOX) {
          errors.push(
            "CRITICAL: SANDBOX_MODE=true but DATABASE_URL !== DATABASE_URL_SANDBOX. They must be exactly equal."
          );
          errors.push(`   DATABASE_URL: ${DATABASE_URL.substring(0, 50)}...`);
          errors.push(
            `   DATABASE_URL_SANDBOX: ${DATABASE_URL_SANDBOX.substring(0, 50)}...`
          );
        } else {
          finalDatabaseUrl = DATABASE_URL; // Use DATABASE_URL (both are equal)
          databaseSource = "DATABASE_URL (sandbox, matches DATABASE_URL_SANDBOX)";
        }
      }
    } else {
      // PRODUCTION MODE: DATABASE_URL is required
      if (!DATABASE_URL) {
        errors.push("DATABASE_URL is required for production environment");
      } else if (
        DATABASE_URL === "postgres://username:password@host:port/database"
      ) {
        errors.push(
          "DATABASE_URL is set to placeholder value. Set the actual production database URL."
        );
      } else {
        finalDatabaseUrl = DATABASE_URL;
        databaseSource = "DATABASE_URL (production)";

        // Optional: DATABASE_URL_SANDBOX can be set in production (for reference, not used)
        if (DATABASE_URL_SANDBOX) {
          console.log(
            "   ℹ️  DATABASE_URL_SANDBOX is set but not used in production mode"
          );
        }
      }
    }

    // Validate connection string format (if we have a URL)
    if (finalDatabaseUrl) {
      if (
        !finalDatabaseUrl.startsWith("postgres://") &&
        !finalDatabaseUrl.startsWith("postgresql://")
      ) {
        errors.push(
          "Invalid database URL format. Must start with postgres:// or postgresql://"
        );
      }

      // Check for placeholder values
      if (
        finalDatabaseUrl.includes("username:password") ||
        finalDatabaseUrl.includes("localhost:5432") ||
        finalDatabaseUrl.includes("[YOUR_")
      ) {
        warnings.push(
          `Database URL appears to contain placeholder values: ${finalDatabaseUrl.substring(
            0,
            60
          )}...`
        );
      }
    }

    // Report results
    if (errors.length > 0) {
      console.error("\n❌ [DB VALIDATOR] CRITICAL ERRORS:");
      errors.forEach((err, i) => console.error(`   ${i + 1}. ${err}`));
      console.error(
        "\n💡 [DB VALIDATOR] Fix these errors before starting the server."
      );
      console.error(
        "   See docs/RAILWAY_ENV_SETUP.md for correct environment variable configuration.\n"
      );
      throw new Error(`Database configuration invalid: ${errors.join("; ")}`);
    }

    if (warnings.length > 0) {
      console.warn("\n⚠️ [DB VALIDATOR] WARNINGS:");
      warnings.forEach((warn, i) => console.warn(`   ${i + 1}. ${warn}`));
    }

    console.log(`\n✅ [DB VALIDATOR] Configuration valid`);
    console.log(`   Using: ${databaseSource}`);
    if (finalDatabaseUrl) {
      // Mask sensitive parts of URL for logging (show protocol, host, and path but mask credentials)
      const urlObj = new URL(finalDatabaseUrl);
      const masked = `${urlObj.protocol}//${urlObj.username ? "****" : ""}@${
        urlObj.host
      }${urlObj.pathname}${urlObj.search ? "?" + urlObj.search : ""}`;
      console.log(`   Connection: ${masked}`);
    }

    return finalDatabaseUrl;
  }

  // Validate and get the correct database URL
  let validatedDatabaseUrl;
  try {
    validatedDatabaseUrl = validateDatabaseConfig();
  } catch (error) {
    console.error(
      "\n💥 [DB VALIDATOR] Server startup aborted due to database configuration errors."
    );
    process.exit(1);
  }

  return {
    DATABASE_URL,
    DATABASE_URL_SANDBOX,
    SANDBOX_MODE,
    COMMAND_CENTER_KEY,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
    LIFEOS_ANTHROPIC_KEY,
    LIFEOS_GEMINI_KEY,
    DEEPSEEK_API_KEY,
    GROK_API_KEY,
    GITHUB_TOKEN,
    GITHUB_REPO,
    GITHUB_DEPLOY_BRANCH,
    RAILWAY_TOKEN,
    RAILWAY_PROJECT_ID,
    RAILWAY_SERVICE_ID,
    RAILWAY_ENVIRONMENT_ID,
    OLLAMA_ENDPOINT,
    COUNCIL_OLLAMA_MODE,
    DEEPSEEK_LOCAL_ENDPOINT,
    DEEPSEEK_BRIDGE_ENABLED,
    ALLOWED_ORIGINS,
    HOST,
    PORT,
    MAX_DAILY_SPEND,
    COST_SHUTDOWN_THRESHOLD,
    NODE_ENV,
    RAILWAY_PUBLIC_DOMAIN,
    RAILWAY_ENVIRONMENT,
    DB_SSL_REJECT_UNAUTHORIZED,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    BRAVE_SEARCH_API_KEY,
    PERPLEXITY_API_KEY,
    CURRENT_DEEPSEEK_ENDPOINT,
    validatedDatabaseUrl,
  };
}
