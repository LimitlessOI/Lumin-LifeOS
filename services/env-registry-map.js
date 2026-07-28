/**
 * SYNOPSIS: env-registry-map.js
 * env-registry-map.js
 * Machine-readable version of docs/ENV_REGISTRY.md
 * Single source of truth for every env var the system uses.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
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
  { name: "CEREBRAS_API_KEY",    status: "SET",        category: "ai",       purpose: "Cerebras — ultra-fast inference" },
  { name: "CEREBRAS_MODEL",      status: "OPTIONAL",   category: "ai",       purpose: "Cerebras model name" },
  { name: "TOGETHER_API_KEY",    status: "RETIRED",    category: "ai",       purpose: "Together AI — removed from stack (Adam 2026-05-24)" },
  { name: "TOGETHER_MODEL",      status: "RETIRED",    category: "ai",       purpose: "Together model override — unused" },
  { name: "OPENROUTER_API_KEY",  status: "RETIRED",    category: "ai",       purpose: "OpenRouter — removed from stack (Adam 2026-05-24)" },
  { name: "OPENROUTER_MODEL",    status: "RETIRED",    category: "ai",       purpose: "OpenRouter model override — unused" },
  { name: "PERPLEXITY_API_KEY",  status: "OPTIONAL",   category: "ai",       purpose: "Perplexity — web-search-grounded answers" },
  { name: "BRAVE_SEARCH_API_KEY",status: "OPTIONAL",   category: "ai",       purpose: "Brave Search — web intelligence" },
  { name: "REPLICATE_API_TOKEN", status: "NEEDED",     category: "ai",       purpose: "Replicate — Ideogram/Recraft/Flux graphics + Kling/Wan video (alias: REPLICATE_API)" },
  { name: "REPLICATE_API",       status: "DEPRECATED", category: "ai",       purpose: "Founder short-name — aliased to REPLICATE_API_TOKEN at boot" },
  { name: "GEMINI_MODEL",        status: "OPTIONAL",   category: "ai",       purpose: "Override Gemini model name" },

  // ── Database ─────────────────────────────────────────────────────────────────
  { name: "DATABASE_URL",        status: "SET",        category: "database", purpose: "Neon PostgreSQL connection string (primary)" },
  { name: "DATABASE_URL_SANDBOX", status: "SET",        category: "database", purpose: "Neon DSN for non-production when NODE_ENV !== production (else DATABASE_URL)" },
  { name: "DB_SSL_REJECT_UNAUTHORIZED", status: "OPTIONAL", category: "database", purpose: "true|false — pg Pool SSL rejectUnauthorized (default true)" },
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

  // ── Public URL / verification (not secrets) ─────────────────────────────────
  { name: "PUBLIC_BASE_URL",         status: "OPTIONAL", category: "railway", purpose: "Canonical public origin for local scripts and route probes (e.g. https://lifeos.up.railway.app); on Railway prefer RAILWAY_PUBLIC_DOMAIN" },
  { name: "REMOTE_VERIFY_BASE_URL",  status: "OPTIONAL", category: "railway", purpose: "Explicit base URL for node scripts/verify-project.mjs HTTP probes when PUBLIC_BASE_URL is unset" },
  { name: "BASE_URL",                 status: "SET",     category: "railway",  purpose: "Public app origin fallback for links when RAILWAY_PUBLIC_DOMAIN / PUBLIC_BASE_URL unset" },

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
  { name: "EMAIL_PROVIDER",      status: "SET",        category: "email",    purpose: "Email provider name: postmark (or as configured)" },
  { name: "EMAIL_FROM",          status: "SET",        category: "email",    purpose: "Sender address (e.g. adam@yourdomain.com)" },
  { name: "POSTMARK_SERVER_TOKEN",status: "NEEDED",    category: "email",    purpose: "Postmark API token for transactional email", revenueBlocking: true },
  { name: "EMAIL_WEBHOOK_SECRET",status: "OPTIONAL",   category: "email",    purpose: "Validates inbound Postmark webhook events" },
  { name: "WORK_EMAIL",          status: "SET",        category: "email",    purpose: "Primary work inbox for alerts and TC fallback identity" },
  { name: "WORK_EMAIL_APP_PASSWORD", status: "OPTIONAL", category: "email",  purpose: "App password for primary work inbox IMAP access" },
  { name: "TC_IMAP_HOST",        status: "NEEDED",     category: "email",    purpose: "TC mailbox IMAP host", revenueBlocking: true },
  { name: "TC_IMAP_PORT",        status: "NEEDED",     category: "email",    purpose: "TC mailbox IMAP port", revenueBlocking: true },
  { name: "TC_IMAP_USER",        status: "NEEDED",     category: "email",    purpose: "TC mailbox address used for IMAP reads", revenueBlocking: true },
  { name: "TC_IMAP_APP_PASSWORD",status: "NEEDED",     category: "email",    purpose: "App password for TC mailbox IMAP access", revenueBlocking: true },
  { name: "TC_EMAIL_FROM",       status: "OPTIONAL",   category: "email",    purpose: "From-address for TC communications" },
  { name: "TC_AGENT_NAME",       status: "OPTIONAL",   category: "email",    purpose: "Agent/TC name used in prepared communications" },
  { name: "TC_AGENT_PHONE",      status: "OPTIONAL",   category: "email",    purpose: "Agent/TC phone used in prepared communications" },
  { name: "TWILIO_WEBHOOK_SECRET", status: "OPTIONAL", category: "email",    purpose: "Validates inbound Twilio callbacks for TC comms" },

  // ── ElevenLabs ────────────────────────────────────────────────────────────────
  { name: "ELEVENLABS_API_KEY",  status: "SET",        category: "elevenlabs", purpose: "ElevenLabs text-to-speech" },
  { name: "ELEVENLABS_VOICE_ID", status: "SET",        category: "elevenlabs", purpose: "Voice ID for Adam's coaching voice" },

  // ── Google ────────────────────────────────────────────────────────────────────
  { name: "GOOGLE_CLIENT_ID",    status: "NEEDED",     category: "google",   purpose: "OAuth2 client ID for Google Calendar" },
  { name: "GOOGLE_CLIENT_SECRET",status: "NEEDED",     category: "google",   purpose: "OAuth2 client secret" },
  { name: "GOOGLE_REDIRECT_URI", status: "NEEDED",     category: "google",   purpose: "OAuth2 callback URL" },
  { name: "GOOGLE_PLACES_KEY",   status: "NEEDED",     category: "google",   purpose: "Google Places Text Search — Go Vegas discover + site-builder prospect discovery (preferred name)" },
  { name: "GOOGLE_PLACES_API_KEY",status: "OPTIONAL",  category: "google",   purpose: "Alias accepted by Go Vegas / prospect scripts — prefer GOOGLE_PLACES_KEY" },
  { name: "GOOGLE_CALENDAR_API_KEY",status: "DEPRECATED",category: "google", purpose: "Service account key — replaced by OAuth2 flow" },
  { name: "GO_VEGAS_ALLOW_DISCOVER_IDLE", status: "OPTIONAL", category: "google", purpose: "1 = scheduler may discover when prospect queue is empty" },
  { name: "GO_VEGAS_SCHEDULER_MS", status: "OPTIONAL", category: "google", purpose: "Go Vegas outreach scheduler interval ms" },

  // ── BoldTrail CRM ─────────────────────────────────────────────────────────────
  { name: "BOLDTRAIL_API_KEY",   status: "SET",        category: "boldtrail", purpose: "BoldTrail/KVCore API access" },
  { name: "BOLDTRAIL_API_URL",   status: "SET",        category: "boldtrail", purpose: "BoldTrail API base URL" },
  { name: "BOLDTRAIL_LEGACY_API_URL",status: "OPTIONAL",category: "boldtrail",purpose: "Legacy KVCore endpoint (if needed)" },
  { name: "BOLDTRAIL_AI_ENABLED",status: "OPTIONAL",   category: "boldtrail", purpose: "Flag: enable AI-enhanced BoldTrail features" },
  { name: "KVCORE_API_TOKEN",    status: "DEPRECATED", category: "boldtrail", purpose: "Old KVCore token — use BOLDTRAIL_API_KEY" },
  { name: "KVCORE_API_PREFIX",   status: "DEPRECATED", category: "boldtrail", purpose: "Old KVCore prefix — use BOLDTRAIL_API_URL" },

  // ── ClientCare billing (browser path — Amendment 18) ─────────────────────────
  { name: "CLIENTCARE_BASE_URL",   status: "SET",        category: "clientcare", purpose: "ClientCare web app origin for Puppeteer (Railway vault)" },
  { name: "CLIENTCARE_USERNAME",   status: "SET",        category: "clientcare", purpose: "ClientCare login username (Railway vault)" },
  { name: "CLIENTCARE_PASSWORD",   status: "SET",        category: "clientcare", purpose: "ClientCare login password (Railway vault)" },
  { name: "CLIENTCARE_MFA_MODE",   status: "OPTIONAL",   category: "clientcare", purpose: "MFA mode when ClientCare enforces second factor" },
  { name: "CLIENTCARE_MFA_SECRET", status: "OPTIONAL",   category: "clientcare", purpose: "MFA secret or approved fallback material for automation" },

  // ── eXp Okta (TC — credential-aliases) ────────────────────────────────────────
  { name: "exp_okta_Username",   status: "OPTIONAL",   category: "tcex",     purpose: "eXp Okta username for TC / browser paths" },
  { name: "exp_okta_Password",   status: "OPTIONAL",   category: "tcex",     purpose: "eXp Okta password (vault; legacy Railway naming)" },
  { name: "exp_okta_URL",        status: "OPTIONAL",   category: "tcex",     purpose: "eXp Okta issuer URL (default exprealty.okta.com)" },
  { name: "EXP_OKTA_USERNAME",   status: "OPTIONAL",   category: "tcex",     purpose: "Alias for exp_okta_Username" },
  { name: "EXP_OKTA_USER",       status: "OPTIONAL",   category: "tcex",     purpose: "Alias for exp_okta_Username" },
  { name: "EXP_OKTA_PASSWORD",   status: "OPTIONAL",   category: "tcex",     purpose: "Alias for exp_okta_Password" },
  { name: "EXP_OKTA_PASS",       status: "OPTIONAL",   category: "tcex",     purpose: "Alias for exp_okta_Password" },
  { name: "EXP_OKTA_URL",        status: "OPTIONAL",   category: "tcex",     purpose: "Alias for exp_okta_URL" },

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
  { name: "COST_SHUTDOWN_THRESHOLD", status: "SET",     category: "runtime",  purpose: "AI spend cap USD before paid council routes stop (config/runtime-env default 0)" },
  { name: "COUNCIL_MODE_OVERRIDE", status: "OPTIONAL", category: "runtime",  purpose: "Reserved; in some Railway envs, not referenced in repo" },
  { name: "DATA_DIR",            status: "OPTIONAL",   category: "runtime",  purpose: "Reserved; in some Railway envs, not referenced in repo" },
  { name: "DEBUG_AI",            status: "OPTIONAL",   category: "runtime",  purpose: "Reserved; in some Railway envs, not referenced in repo" },
  { name: "QUIET_HOURS",         status: "OPTIONAL",   category: "runtime",  purpose: "JSON [{start,end}] — no SMS during these hours" },

  // ── Notion ────────────────────────────────────────────────────────────────────
  { name: "NOTION_API_KEY",      status: "OPTIONAL",   category: "notion",   purpose: "Notion integration token" },
  { name: "NOTION_CONTACTS_DB_ID",status: "OPTIONAL",  category: "notion",   purpose: "Notion database ID for contacts" },
  { name: "NOTION_TASKS_DB_ID",  status: "OPTIONAL",   category: "notion",   purpose: "Notion database ID for tasks" },

  // ── Multi-account social / Wix (prefix WHO_CHANNEL_*) ─────────────────────────
  { name: "ADAM_FACEBOOK_EMAIL",      status: "OPTIONAL", category: "social",   purpose: "Adam Facebook login email — Go Vegas admin ops (multi-account: ADAM_*)" },
  { name: "ADAMS_FACEBOOK_PASSWORD",  status: "OPTIONAL", category: "social",   purpose: "Adam Facebook password (typo name as set in Railway) — never log" },
  { name: "ADAM_FACEBOOK_PASSWORD",   status: "OPTIONAL", category: "social",   purpose: "Preferred spelling alias for Adam Facebook password — never log" },
  { name: "FACEBOOK_EMAIL",           status: "OPTIONAL", category: "social",   purpose: "Generic Facebook email alias" },
  { name: "FACEBOOK_PASSWORD",        status: "OPTIONAL", category: "social",   purpose: "Generic Facebook password alias — never log" },
  { name: "WRM_WIX_EMAIL",            status: "OPTIONAL", category: "social",   purpose: "Well Rounded Momma Wix login (maternity@…) for domain cutover" },
  { name: "WRM_WIX_PASSWORD",         status: "OPTIONAL", category: "social",   purpose: "WRM Wix password — never log" },
  { name: "WRM_DOMAIN",               status: "OPTIONAL", category: "social",   purpose: "WRM public domain default wellroundedmomma.com" },
  { name: "WIX_EMAIL",                status: "OPTIONAL", category: "social",   purpose: "Generic Wix email alias" },
  { name: "WIX_PASSWORD",             status: "OPTIONAL", category: "social",   purpose: "Generic Wix password alias — never log" },

  // ── Signup Agent ──────────────────────────────────────────────────────────────
  { name: "GMAIL_SIGNUP_EMAIL",       status: "SET",      category: "signup",   purpose: "System signup email — lumea.lifeos@gmail.com (not founder UI login)" },
  { name: "GMAIL_SIGNUP_APP_PASSWORD",status: "NEEDED",   category: "signup",   purpose: "Gmail App Password for IMAP email verification reads" },
  { name: "FOUNDER_PAYMENT_CARD_NUMBER", status: "NEEDED", category: "signup", purpose: "Founder card number for autonomous paid signups (Railway vault only — never log)" },
  { name: "FOUNDER_PAYMENT_CARD_EXP", status: "NEEDED", category: "signup", purpose: "Card expiry MM/YY for founder payment vault" },
  { name: "FOUNDER_PAYMENT_CARD_CVC", status: "NEEDED", category: "signup", purpose: "Card CVC for founder payment vault" },
  { name: "FOUNDER_PAYMENT_CARD_NAME", status: "NEEDED", category: "signup", purpose: "Name on card for founder payment vault" },
  { name: "FOUNDER_PAYMENT_BILLING_ZIP", status: "OPTIONAL", category: "signup", purpose: "Billing ZIP when checkout requires postal code" },
  { name: "LIFEOS_FOUNDER_LOGIN_EMAIL", status: "NEEDED", category: "auth",     purpose: "Founder LifeOS sign-in email (e.g. adam@hopkinsgroup.org) — sync via operator/sync-founder-login" },
  { name: "LIFEOS_FOUNDER_LOGIN_PASSWORD", status: "NEEDED", category: "auth", purpose: "Founder LifeOS sign-in password — never commit; Railway vault only" },
  { name: "TWOCAPTCHA_API_KEY",       status: "OPTIONAL", category: "signup",   purpose: "2captcha key for captcha solving during signups ($1/1000)" },
  { name: "SCREENSHOT_DIR",           status: "OPTIONAL", category: "signup",   purpose: "Directory for browser error screenshots (default: /tmp)" },
];

/**
 * Returns a live health report for every var in the registry.
 * Compares registry expected status against what's actually in process.env.
 * No Railway API call needed — Railway injects all vars at boot time.
 */
const ENV_PRESENT_ALIASES = {
  REPLICATE_API_TOKEN: ['REPLICATE_API'],
};

function isEnvPresent(name) {
  if (String(process.env[name] || '').trim()) return true;
  for (const alias of ENV_PRESENT_ALIASES[name] || []) {
    if (String(process.env[alias] || '').trim()) return true;
  }
  return false;
}

export function getRegistryHealth() {
  const results = ENV_REGISTRY.map((entry) => {
    const present = isEnvPresent(entry.name);
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