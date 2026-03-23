/**
 * env-registry-map.js
 * Machine-readable version of docs/ENV_REGISTRY.md
 * Single source of truth for every env var the system uses.
 *
 * Status values:
 *   SET      — confirmed present in Railway production
 *   NEEDED   — required for a feature; revenue blocked without it
 *   OPTIONAL — enhances behavior but not blocking
 *   DEPRECATED — no longer used
 *
 * getRegistryHealth() compares this map against process.env and returns
 * a live status for every var without any Railway API call.
 */

export const ENV_REGISTRY = [
  // ── Auth & Security ─────────────────────────────────────────────────────────
  { name: "COMMAND_CENTER_KEY",  status: "SET",        category: "auth",     purpose: "Master API key — all requireKey middleware" },
  { name: "JWT_SECRET",          status: "SET",        category: "auth",     purpose: "Signs JWTs for session tokens" },
  { name: "ENCRYPTION_KEY",      status: "OPTIONAL",   category: "auth",     purpose: "Symmetric encryption for sensitive data at rest" },
  { name: "CONVERSATION_ENCRYPTION_KEY", status: "OPTIONAL", category: "auth", purpose: "Encrypts stored conversation history" },
  { name: "TCO_ENCRYPTION_KEY",  status: "SET",        category: "auth",     purpose: "AES-256-GCM key for managed-env encrypted storage" },
  { name: "SECRET_KEY",          status: "DEPRECATED", category: "auth",     purpose: "Old auth key — replaced by COMMAND_CENTER_KEY" },

  // ── AI Models ────────────────────────────────────────────────────────────────
  { name: "ANTHROPIC_API_KEY",   status: "SET",        category: "ai",       purpose: "Claude — primary reasoning model" },
  { name: "OPENAI_API_KEY",      status: "SET",        category: "ai",       purpose: "GPT-4 + Whisper transcription" },
  { name: "GEMINI_API_KEY",      status: "SET",        category: "ai",       purpose: "Google Gemini — mediator empathy, council member" },
  { name: "GROK_API_KEY",        status: "SET",        category: "ai",       purpose: "xAI Grok — reality check, council member" },
  { name: "DEEPSEEK_API_KEY",    status: "SET",        category: "ai",       purpose: "DeepSeek — pattern analysis, council member" },
  { name: "GROQ_API_KEY",        status: "OPTIONAL",   category: "ai",       purpose: "Groq inference — fallback council member" },
  { name: "GROQ_MODEL",          status: "OPTIONAL",   category: "ai",       purpose: "Groq model name (default: llama-3.1-70b-versatile)" },
  { name: "MISTRAL_API_KEY",     status: "OPTIONAL",   category: "ai",       purpose: "Mistral — additional council member" },
  { name: "MISTRAL_MODEL",       status: "OPTIONAL",   category: "ai",       purpose: "Mistral model name" },
  { name: "CEREBRAS_API_KEY",    status: "OPTIONAL",   category: "ai",       purpose: "Cerebras — ultra-fast inference" },
  { name: "CEREBRAS_MODEL",      status: "OPTIONAL",   category: "ai",       purpose: "Cerebras model name" },
  { name: "TOGETHER_API_KEY",    status: "OPTIONAL",   category: "ai",       purpose: "Together AI — open model inference" },
  { name: "TOGETHER_MODEL",      status: "OPTIONAL",   category: "ai",       purpose: "Together model name" },
  { name: "OPENROUTER_API_KEY",  status: "OPTIONAL",   category: "ai",       purpose: "OpenRouter — model routing/fallback" },
  { name: "OPENROUTER_MODEL",    status: "OPTIONAL",   category: "ai",       purpose: "Default model via OpenRouter" },
  { name: "PERPLEXITY_API_KEY",  status: "OPTIONAL",   category: "ai",       purpose: "Perplexity — web-search-grounded answers" },
  { name: "BRAVE_SEARCH_API_KEY",status: "OPTIONAL",   category: "ai",       purpose: "Brave Search — web intelligence" },
  { name: "REPLICATE_API_TOKEN", status: "SET",        category: "ai",       purpose: "Replicate — Kling/Wan video generation" },
  { name: "GEMINI_MODEL",        status: "OPTIONAL",   category: "ai",       purpose: "Override Gemini model name" },

  // ── Database ─────────────────────────────────────────────────────────────────
  { name: "DATABASE_URL",        status: "SET",        category: "database", purpose: "Neon PostgreSQL connection string" },
  { name: "NEON_PG_CONNECTION_STRING", status: "DEPRECATED", category: "database", purpose: "Old alias for DATABASE_URL" },

  // ── Twilio ───────────────────────────────────────────────────────────────────
  { name: "TWILIO_ACCOUNT_SID",  status: "SET",        category: "twilio",   purpose: "Twilio account identifier" },
  { name: "TWILIO_AUTH_TOKEN",   status: "SET",        category: "twilio",   purpose: "Twilio auth secret" },
  { name: "TWILIO_PHONE_NUMBER", status: "SET",        category: "twilio",   purpose: "Outbound SMS/call number" },
  { name: "ALERT_PHONE",         status: "SET",        category: "twilio",   purpose: "Adam's phone — autonomy SMS + alerts" },
  { name: "ADMIN_PHONE",         status: "OPTIONAL",   category: "twilio",   purpose: "Alias for ALERT_PHONE" },
  { name: "ADAM_SMS_NUMBER",     status: "DEPRECATED", category: "twilio",   purpose: "Old alias for ALERT_PHONE" },

  // ── Stripe ───────────────────────────────────────────────────────────────────
  { name: "STRIPE_SECRET_KEY",   status: "SET",        category: "stripe",   purpose: "Stripe secret — server-side payments" },
  { name: "STRIPE_PUBLISHABLE_KEY", status: "SET",     category: "stripe",   purpose: "Stripe public key — client-side Stripe.js" },
  { name: "STRIPE_WEBHOOK_SECRET",  status: "SET",     category: "stripe",   purpose: "Validates incoming Stripe webhook events" },
  { name: "STRIPE_PRICE_ID_MONTHLY",status: "SET",     category: "stripe",   purpose: "Price ID for monthly subscription plan" },
  { name: "STRIPE_API_KEY",      status: "DEPRECATED", category: "stripe",   purpose: "Old name — use STRIPE_SECRET_KEY" },
  { name: "STRIPE_KEY",          status: "DEPRECATED", category: "stripe",   purpose: "Old alias" },
  { name: "STRIPE_SECRET",       status: "DEPRECATED", category: "stripe",   purpose: "Old alias" },

  // ── Railway ───────────────────────────────────────────────────────────────────
  { name: "RAILWAY_PUBLIC_DOMAIN",   status: "SET",    category: "railway",  purpose: "Full public URL — health checks, SMS links, webhooks" },
  { name: "RAILWAY_TOKEN",           status: "SET",    category: "railway",  purpose: "Railway API token — env var management via API" },
  { name: "RAILWAY_PROJECT_ID",      status: "SET",    category: "railway",  purpose: "Railway project ID (auto-injected)" },
  { name: "RAILWAY_SERVICE_ID",      status: "SET",    category: "railway",  purpose: "Railway service ID (auto-injected)" },
  { name: "RAILWAY_ENVIRONMENT_ID",  status: "SET",    category: "railway",  purpose: "Railway environment ID (auto-injected)" },
  { name: "RAILWAY_ENVIRONMENT",     status: "SET",    category: "railway",  purpose: "Environment name (production/staging)" },
  { name: "PORT",                    status: "SET",    category: "railway",  purpose: "Port server listens on (Railway auto-sets)" },

  // ── GitHub ────────────────────────────────────────────────────────────────────
  { name: "GITHUB_TOKEN",        status: "SET",        category: "github",   purpose: "Personal access token — auto-commits built files" },
  { name: "GITHUB_REPO",         status: "SET",        category: "github",   purpose: "Repo in owner/name format" },
  { name: "GITHUB_DEPLOY_BRANCH",status: "SET",        category: "github",   purpose: "Branch auto-builder commits to" },

  // ── Email ─────────────────────────────────────────────────────────────────────
  { name: "EMAIL_PROVIDER",      status: "NEEDED",     category: "email",    purpose: "Email provider name: postmark", revenueBlocking: true },
  { name: "EMAIL_FROM",          status: "NEEDED",     category: "email",    purpose: "Sender address (e.g. adam@yourdomain.com)", revenueBlocking: true },
  { name: "POSTMARK_SERVER_TOKEN",status: "NEEDED",    category: "email",    purpose: "Postmark API token for transactional email", revenueBlocking: true },
  { name: "EMAIL_WEBHOOK_SECRET",status: "OPTIONAL",   category: "email",    purpose: "Validates inbound Postmark webhook events" },

  // ── ElevenLabs ────────────────────────────────────────────────────────────────
  { name: "ELEVENLABS_API_KEY",  status: "SET",        category: "elevenlabs", purpose: "ElevenLabs text-to-speech" },
  { name: "ELEVENLABS_VOICE_ID", status: "SET",        category: "elevenlabs", purpose: "Voice ID for Adam's coaching voice" },

  // ── Google ────────────────────────────────────────────────────────────────────
  { name: "GOOGLE_CLIENT_ID",    status: "NEEDED",     category: "google",   purpose: "OAuth2 client ID for Google Calendar" },
  { name: "GOOGLE_CLIENT_SECRET",status: "NEEDED",     category: "google",   purpose: "OAuth2 client secret" },
  { name: "GOOGLE_REDIRECT_URI", status: "NEEDED",     category: "google",   purpose: "OAuth2 callback URL" },
  { name: "GOOGLE_PLACES_API_KEY",status: "OPTIONAL",  category: "google",   purpose: "Google Places — prospect address lookups" },
  { name: "GOOGLE_CALENDAR_API_KEY",status: "DEPRECATED",category: "google", purpose: "Service account key — replaced by OAuth2 flow" },

  // ── BoldTrail CRM ─────────────────────────────────────────────────────────────
  { name: "BOLDTRAIL_API_KEY",   status: "SET",        category: "boldtrail", purpose: "BoldTrail/KVCore API access" },
  { name: "BOLDTRAIL_API_URL",   status: "SET",        category: "boldtrail", purpose: "BoldTrail API base URL" },
  { name: "BOLDTRAIL_LEGACY_API_URL",status: "OPTIONAL",category: "boldtrail",purpose: "Legacy KVCore endpoint (if needed)" },
  { name: "BOLDTRAIL_AI_ENABLED",status: "OPTIONAL",   category: "boldtrail", purpose: "Flag: enable AI-enhanced BoldTrail features" },
  { name: "KVCORE_API_TOKEN",    status: "DEPRECATED", category: "boldtrail", purpose: "Old KVCore token — use BOLDTRAIL_API_KEY" },
  { name: "KVCORE_API_PREFIX",   status: "DEPRECATED", category: "boldtrail", purpose: "Old KVCore prefix — use BOLDTRAIL_API_URL" },

  // ── Redis ─────────────────────────────────────────────────────────────────────
  { name: "UPSTASH_REDIS_URL",   status: "SET",        category: "redis",    purpose: "Upstash Redis — BullMQ job queue" },
  { name: "REDIS_URL",           status: "OPTIONAL",   category: "redis",    purpose: "Alternative Redis URL (non-Upstash)" },

  // ── VAPI ─────────────────────────────────────────────────────────────────────
  { name: "VAPI_API_KEY",        status: "SET",        category: "vapi",     purpose: "VAPI phone agent platform" },
  { name: "VAPI_ASSISTANT_ID",   status: "SET",        category: "vapi",     purpose: "Default VAPI assistant ID" },

  // ── Site Builder ─────────────────────────────────────────────────────────────
  { name: "SITE_BASE_URL",       status: "NEEDED",     category: "sitebuilder", purpose: "Base URL for generated preview sites", revenueBlocking: true },
  { name: "AFFILIATE_JANE_APP_URL",  status: "NEEDED", category: "sitebuilder", purpose: "Jane App affiliate referral URL (~$50/referral)", revenueBlocking: true },
  { name: "AFFILIATE_MINDBODY_URL",  status: "NEEDED", category: "sitebuilder", purpose: "Mindbody affiliate referral URL (~$200/referral)", revenueBlocking: true },
  { name: "AFFILIATE_SQUARE_URL",    status: "NEEDED", category: "sitebuilder", purpose: "Square affiliate referral URL (up to $2,500/referral)", revenueBlocking: true },

  // ── Ollama (Local AI) ─────────────────────────────────────────────────────────
  { name: "OLLAMA_BASE_URL",     status: "OPTIONAL",   category: "ollama",   purpose: "Ollama local endpoint" },
  { name: "OLLAMA_HOST",         status: "OPTIONAL",   category: "ollama",   purpose: "Alias for OLLAMA_BASE_URL" },
  { name: "FORCE_OLLAMA_ON",     status: "OPTIONAL",   category: "ollama",   purpose: "Force Ollama even if cloud models available" },

  // ── Feature Flags ─────────────────────────────────────────────────────────────
  { name: "FLAG_AUTONOMY_RUNNING",   status: "OPTIONAL", category: "flags",  purpose: "Enable/disable autonomy scheduler" },
  { name: "FLAG_INCOME_DRONES",      status: "OPTIONAL", category: "flags",  purpose: "Enable income drone system" },
  { name: "FLAG_STRIPE_LIVE",        status: "OPTIONAL", category: "flags",  purpose: "Use Stripe live keys vs test keys" },
  { name: "FLAG_VIDEO_GENERATION",   status: "OPTIONAL", category: "flags",  purpose: "Enable Replicate video generation" },
  { name: "FLAG_GAME_BUILDER",       status: "OPTIONAL", category: "flags",  purpose: "Enable game publisher" },
  { name: "FLAG_FSAR_GATING",        status: "OPTIONAL", category: "flags",  purpose: "Enable FSAR execution gating" },
  { name: "FLAG_BOLDTRAIL_CRM",      status: "OPTIONAL", category: "flags",  purpose: "Enable BoldTrail CRM features" },
  { name: "FLAG_VAPI_PHONE",         status: "OPTIONAL", category: "flags",  purpose: "Enable VAPI phone agents" },
  { name: "FLAG_WHITE_LABEL",        status: "OPTIONAL", category: "flags",  purpose: "Enable white-label config" },
  { name: "FLAG_IDEA_AUTO_IMPLEMENT",status: "OPTIONAL", category: "flags",  purpose: "Auto-implement approved ideas" },
  { name: "FLAG_OPEN_SOURCE_COUNCIL",status: "OPTIONAL", category: "flags",  purpose: "Use open-source council models" },
  { name: "FLAG_TCO_SALES",          status: "OPTIONAL", category: "flags",  purpose: "Enable TCO sales agent" },
  { name: "FLAG_MOBILE_APP_BUILDER", status: "OPTIONAL", category: "flags",  purpose: "Enable mobile app builder" },

  // ── Runtime / Behavior ────────────────────────────────────────────────────────
  { name: "NODE_ENV",            status: "SET",        category: "runtime",  purpose: "production | development | test" },
  { name: "LOG_LEVEL",           status: "OPTIONAL",   category: "runtime",  purpose: "Pino log level (default: info)" },
  { name: "SMOKE_MODE",          status: "OPTIONAL",   category: "runtime",  purpose: "Skip heavy init for smoke tests" },
  { name: "SEARCH_ENABLED",      status: "OPTIONAL",   category: "runtime",  purpose: "Enable/disable web search globally" },
  { name: "COUNCIL_TIMEOUT_MS",  status: "OPTIONAL",   category: "runtime",  purpose: "Max ms to wait for a council member (default: 300000)" },
  { name: "COUNCIL_PING_TIMEOUT_MS",status: "OPTIONAL",category: "runtime",  purpose: "Ping timeout for council availability (default: 5000)" },
  { name: "QUIET_HOURS",         status: "OPTIONAL",   category: "runtime",  purpose: "JSON [{start,end}] — no SMS during these hours" },

  // ── Notion ────────────────────────────────────────────────────────────────────
  { name: "NOTION_API_KEY",      status: "OPTIONAL",   category: "notion",   purpose: "Notion integration token" },
  { name: "NOTION_CONTACTS_DB_ID",status: "OPTIONAL",  category: "notion",   purpose: "Notion database ID for contacts" },
  { name: "NOTION_TASKS_DB_ID",  status: "OPTIONAL",   category: "notion",   purpose: "Notion database ID for tasks" },
];

/**
 * Returns a live health report for every var in the registry.
 * Compares registry expected status against what's actually in process.env.
 * No Railway API call needed — Railway injects all vars at boot time.
 */
export function getRegistryHealth() {
  const results = ENV_REGISTRY.map((entry) => {
    const present = Boolean(process.env[entry.name]);
    let healthStatus;

    if (entry.status === "DEPRECATED") {
      healthStatus = present ? "deprecated_but_set" : "deprecated_clear";
    } else if (entry.status === "SET") {
      healthStatus = present ? "ok" : "missing_critical";
    } else if (entry.status === "NEEDED") {
      healthStatus = present ? "ok" : "missing_needed";
    } else {
      // OPTIONAL
      healthStatus = present ? "ok" : "not_set";
    }

    return {
      name: entry.name,
      category: entry.category,
      registryStatus: entry.status,
      present,
      healthStatus,
      revenueBlocking: entry.revenueBlocking || false,
      purpose: entry.purpose,
    };
  });

  const critical  = results.filter((r) => r.healthStatus === "missing_critical");
  const needed    = results.filter((r) => r.healthStatus === "missing_needed");
  const revenue   = results.filter((r) => r.revenueBlocking && !r.present);
  const ok        = results.filter((r) => r.healthStatus === "ok");
  const deprecated = results.filter((r) => r.healthStatus === "deprecated_but_set");

  return {
    summary: {
      total: results.length,
      ok: ok.length,
      missingCritical: critical.length,
      missingNeeded: needed.length,
      revenueBlocking: revenue.length,
      deprecatedButSet: deprecated.length,
      healthy: critical.length === 0 && needed.length === 0,
    },
    revenueBlockers: revenue.map((r) => ({ name: r.name, purpose: r.purpose })),
    missingCritical: critical.map((r) => ({ name: r.name, purpose: r.purpose })),
    missingNeeded: needed.map((r) => ({ name: r.name, purpose: r.purpose })),
    deprecatedButSet: deprecated.map((r) => r.name),
    vars: results,
  };
}

export default { ENV_REGISTRY, getRegistryHealth };
