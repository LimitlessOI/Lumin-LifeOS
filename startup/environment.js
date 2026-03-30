import process from "node:process";
import rateLimit from "express-rate-limit";
import { loadRuntimeEnv } from "../config/runtime-env.js";
import logger from "../services/logger.js";

export const RUNTIME = loadRuntimeEnv();

export const {
  DATABASE_URL,
  DATABASE_URL_SANDBOX,
  SANDBOX_MODE: SANDBOX_MODE_CONFIG,
  COMMAND_CENTER_KEY,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  LIFEOS_ANTHROPIC_KEY,
  LIFEOS_GEMINI_KEY,
  DEEPSEEK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO,
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
  CURRENT_DEEPSEEK_ENDPOINT,
  validatedDatabaseUrl,
} = RUNTIME;

export const DISABLE_INCOME_DRONES = true;

export const SMOKE_MODE =
  ["1", "true", "yes"].includes(String(process.env.SMOKE_MODE || "").toLowerCase()) ||
  ["1", "true", "yes"].includes(String(process.env.AUTONOMY_SMOKE || "").toLowerCase());

export const COUNCIL_TIMEOUT_MS = Number(process.env.COUNCIL_TIMEOUT_MS || "300000");
export const COUNCIL_PING_TIMEOUT_MS = Number(process.env.COUNCIL_PING_TIMEOUT_MS || "5000");
export const SEARCH_MAX_PER_MINUTE = Number(process.env.SEARCH_RATE_LIMIT_PER_MINUTE || "10");
export const SEARCH_MAX_PER_DAY = Number(process.env.SEARCH_DAILY_LIMIT || "100");
export const SEARCH_ENABLED = !["0", "false", "no"].includes(
  (process.env.SEARCH_ENABLED || "").toString().toLowerCase()
);

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: SEARCH_MAX_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "SEARCH_RATE_LIMIT_EXCEEDED",
    message: "Too many search requests, try again in a moment",
  },
});

export const OUTREACH_MAX_PER_MINUTE = Number(process.env.OUTREACH_RATE_LIMIT_PER_MINUTE || "20");
export const outreachLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: OUTREACH_MAX_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "OUTREACH_RATE_LIMIT_EXCEEDED",
    message: "Too many outreach requests, try again in a moment",
  },
});

const additionalOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
];

export const ALLOWED_ORIGINS_LIST = (ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(additionalOrigins);

let stripeClient = null;

export async function getStripeClient() {
  if (!STRIPE_SECRET_KEY) return null;
  if (stripeClient) return stripeClient;

  try {
    let Stripe;
    try {
      const stripeModule = await import("stripe");
      Stripe = stripeModule.default || stripeModule.Stripe || stripeModule;
    } catch (importError) {
      logger.warn("⚠️ Stripe package not installed - Stripe features disabled");
      logger.warn("   To enable: npm install stripe");
      return null;
    }

    if (!Stripe) {
      return null;
    }

    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    logger.info("✅ Stripe client initialized");
    return stripeClient;
  } catch (err) {
    logger.warn("⚠️ Stripe initialization error (non-fatal):", { error: err.message });
    return null;
  }
}
