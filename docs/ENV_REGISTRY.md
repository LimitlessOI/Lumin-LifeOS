# ENV_REGISTRY.md — Environment Variable SSOT

**This file is the single source of truth for every environment variable the system uses.**
Every variable must be listed here. When a new var is added anywhere in the codebase, it goes here first.

Legend:
- ✅ **SET** — confirmed in Railway production
- ⚠️ **NEEDED** — required for a feature to work, not yet set
- 🔲 **OPTIONAL** — enhances behavior but not blocking
- ❌ **DEPRECATED** — no longer used, safe to remove

---

## 🔑 Authentication & Security

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `COMMAND_CENTER_KEY` | ✅ SET | Master API key — all `requireKey` middleware checks this | All protected routes |
| `JWT_SECRET` | ✅ SET | Signs JWTs for session tokens | Auth middleware |
| `ENCRYPTION_KEY` | 🔲 OPTIONAL | Symmetric encryption for sensitive data at rest | Various services |
| `CONVERSATION_ENCRYPTION_KEY` | 🔲 OPTIONAL | Encrypts stored conversation history | conversation-store.js |
| `TCO_ENCRYPTION_KEY` | 🔲 OPTIONAL | Encrypts TCO/savings ledger data | tco-tracker.js |
| `SECRET_KEY` | ❌ DEPRECATED | Old auth key — replaced by COMMAND_CENTER_KEY | — |

---

## 🤖 AI Model APIs

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ SET | Claude (Anthropic) — primary reasoning model | council-service.js |
| `OPENAI_API_KEY` | ✅ SET | GPT-4 + Whisper transcription | council-service.js, word-keeper-transcriber.js |
| `GEMINI_API_KEY` | ✅ SET | Google Gemini — mediator empathy, council member | council-service.js, mediator-service.js |
| `GROK_API_KEY` | ✅ SET | xAI Grok — reality check, council member | council-service.js, commitment-detector.js |
| `DEEPSEEK_API_KEY` | ✅ SET | DeepSeek — pattern analysis, council member | council-service.js, integrity-engine.js |
| `GROQ_API_KEY` | 🔲 OPTIONAL | Groq inference (fast, cheap) — fallback council member | council-service.js |
| `GROQ_MODEL` | 🔲 OPTIONAL | Groq model name (default: llama-3.1-70b-versatile) | council-service.js |
| `MISTRAL_API_KEY` | 🔲 OPTIONAL | Mistral — additional council member | council-service.js |
| `MISTRAL_MODEL` | 🔲 OPTIONAL | Mistral model name | council-service.js |
| `CEREBRAS_API_KEY` | 🔲 OPTIONAL | Cerebras — ultra-fast inference | council-service.js |
| `CEREBRAS_MODEL` | 🔲 OPTIONAL | Cerebras model name | council-service.js |
| `TOGETHER_API_KEY` | 🔲 OPTIONAL | Together AI — open model inference | council-service.js |
| `TOGETHER_MODEL` | 🔲 OPTIONAL | Together model name | council-service.js |
| `OPENROUTER_API_KEY` | 🔲 OPTIONAL | OpenRouter — model routing/fallback | council-service.js |
| `OPENROUTER_MODEL` | 🔲 OPTIONAL | Default model via OpenRouter | council-service.js |
| `PERPLEXITY_API_KEY` | 🔲 OPTIONAL | Perplexity — web-search-grounded answers | web-search-integration.js |
| `BRAVE_SEARCH_API_KEY` | 🔲 OPTIONAL | Brave Search — web intelligence without Google | web-search-service.js |
| `REPLICATE_API_TOKEN` | ✅ SET | Replicate — Kling/Wan video generation | video-pipeline.js |
| `GEMINI_MODEL` | 🔲 OPTIONAL | Override Gemini model name | council-service.js |

---

## 🗄️ Database

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `DATABASE_URL` | ✅ SET | Neon PostgreSQL connection string (production branch) | db.js, all services with pool |
| `NEON_PG_CONNECTION_STRING` | ❌ DEPRECATED | Old alias for DATABASE_URL — use DATABASE_URL | — |

---

## 📱 Twilio (SMS & Voice)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `TWILIO_ACCOUNT_SID` | ✅ SET | Twilio account identifier | twilio-service.js |
| `TWILIO_AUTH_TOKEN` | ✅ SET | Twilio auth secret | twilio-service.js |
| `TWILIO_PHONE_NUMBER` | ✅ SET | Outbound SMS/call number (e.g. +17025551234) | twilio-service.js, reminder-cron.js |
| `ALERT_PHONE` | ✅ SET | Adam's phone number — receives autonomy SMS, alerts | autonomy-orchestrator.js, twilio-service.js |
| `ADMIN_PHONE` | 🔲 OPTIONAL | Alias for ALERT_PHONE — prefer ALERT_PHONE | Various |
| `ADAM_SMS_NUMBER` | ❌ DEPRECATED | Old alias for ALERT_PHONE | — |
| `COMMAND_CENTER_PHONE` | 🔲 OPTIONAL | Alternative notification phone | — |

> **Auto-managed:** The Twilio SMS webhook URL (`/api/v1/autonomy/sms-webhook`) is automatically
> registered at startup via `services/twilio-webhook-registrar.js`. No manual Twilio console action needed.

---

## 💳 Stripe (Payments)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ SET | Stripe secret — server-side payments | stripe-routes.js |
| `STRIPE_PUBLISHABLE_KEY` | ✅ SET | Stripe public key — client-side Stripe.js | stripe-routes.js |
| `STRIPE_WEBHOOK_SECRET` | ✅ SET | Validates incoming Stripe webhook events | stripe-routes.js |
| `STRIPE_PRICE_ID_MONTHLY` | ✅ SET | Stripe price ID for the monthly subscription plan | billing-routes.js |
| `STRIPE_API_KEY` | ❌ DEPRECATED | Old name — use STRIPE_SECRET_KEY | — |
| `STRIPE_KEY` | ❌ DEPRECATED | Old alias | — |
| `STRIPE_SECRET` | ❌ DEPRECATED | Old alias | — |

---

## 🚂 Railway (Hosting & Deployment)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `RAILWAY_PUBLIC_DOMAIN` | ✅ SET | Full public URL (e.g. https://lifeos.up.railway.app) | Health checks, SMS links, Twilio webhook |
| `RAILWAY_TOKEN` | ✅ SET | Railway API token — allows env var management via API | railway routes (/api/v1/railway/*) |
| `RAILWAY_PROJECT_ID` | ✅ SET | Railway project ID (auto-injected by Railway) | deployment-service.js |
| `RAILWAY_SERVICE_ID` | ✅ SET | Railway service ID (auto-injected by Railway) | deployment-service.js |
| `RAILWAY_ENVIRONMENT_ID` | ✅ SET | Railway environment ID (auto-injected by Railway) | deployment-service.js |
| `RAILWAY_ENVIRONMENT` | ✅ SET | Environment name (production/staging) | startup/environment.js |
| `PORT` | ✅ SET | Port server listens on (Railway auto-sets this) | server.js |

---

## 🐙 GitHub (Version Control & Auto-commit)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `GITHUB_TOKEN` | ✅ SET | Personal access token — auto-commits built files | deployment-service.js, auto-builder.js |
| `GITHUB_REPO` | ✅ SET | Repo in `owner/name` format (e.g. adamhopkins/lifeos) | deployment-service.js |
| `GITHUB_DEPLOY_BRANCH` | ✅ SET | Branch auto-builder commits to (e.g. main) | deployment-service.js |

---

## 📧 Email

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `EMAIL_PROVIDER` | ⚠️ NEEDED | Email provider name: `postmark` | notification-service.js |
| `EMAIL_FROM` | ⚠️ NEEDED | Sender address (e.g. adam@yourdomain.com) | notification-service.js |
| `POSTMARK_SERVER_TOKEN` | ⚠️ NEEDED | Postmark API token for transactional email | notification-service.js |
| `EMAIL_WEBHOOK_SECRET` | 🔲 OPTIONAL | Validates inbound Postmark webhook events | — |

> **Blocking:** Site Builder outreach emails cannot send until EMAIL_PROVIDER, EMAIL_FROM, and POSTMARK_SERVER_TOKEN are set.

---

## 🗣️ ElevenLabs (Voice)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | ✅ SET | ElevenLabs text-to-speech | reminder-cron.js (weekly coaching audio) |
| `ELEVENLABS_VOICE_ID` | ✅ SET | Voice ID for Adam's coaching voice | reminder-cron.js |

---

## 📅 Google (Calendar & Places)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | ⚠️ NEEDED | OAuth2 client ID for Google Calendar integration | google-calendar-service.js |
| `GOOGLE_CLIENT_SECRET` | ⚠️ NEEDED | OAuth2 client secret | google-calendar-service.js |
| `GOOGLE_REDIRECT_URI` | ⚠️ NEEDED | OAuth2 callback URL (e.g. https://lifeos.up.railway.app/api/v1/word-keeper/calendar/callback) | google-calendar-service.js |
| `GOOGLE_PLACES_API_KEY` | 🔲 OPTIONAL | Google Places — prospect address lookups | prospect-pipeline.js |
| `GOOGLE_CALENDAR_API_KEY` | ❌ DEPRECATED | Service account key — replaced by OAuth2 flow | — |

---

## 🏠 BoldTrail CRM

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `BOLDTRAIL_API_KEY` | ✅ SET | BoldTrail/KVCore API access | boldtrail-routes.js |
| `BOLDTRAIL_API_URL` | ✅ SET | BoldTrail API base URL | boldtrail-routes.js |
| `BOLDTRAIL_LEGACY_API_URL` | 🔲 OPTIONAL | Legacy KVCore endpoint (if needed) | boldtrail-routes.js |
| `BOLDTRAIL_AI_ENABLED` | 🔲 OPTIONAL | Flag: enable AI-enhanced BoldTrail features | boldtrail-routes.js |
| `KVCORE_API_TOKEN` | ❌ DEPRECATED | Old KVCore token — use BOLDTRAIL_API_KEY | — |
| `KVCORE_API_PREFIX` | ❌ DEPRECATED | Old KVCore prefix — use BOLDTRAIL_API_URL | — |

---

## 🔴 Redis (Job Queue)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `UPSTASH_REDIS_URL` | ✅ SET | Upstash Redis (rediss://) — BullMQ job queue | queue.js, auto-builder.js |
| `REDIS_URL` | 🔲 OPTIONAL | Alternative Redis URL (non-Upstash) | queue.js |

---

## 🤙 VAPI (Phone Agents)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `VAPI_API_KEY` | ✅ SET | VAPI phone agent platform | vapi integration |
| `VAPI_ASSISTANT_ID` | ✅ SET | Default VAPI assistant ID | vapi integration |

---

## 🏗️ Site Builder (Amendment 05)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `SITE_BASE_URL` | ⚠️ NEEDED | Base URL for generated preview sites | site-builder.js, prospect-pipeline.js |
| `AFFILIATE_JANE_APP_URL` | ⚠️ NEEDED | Jane App affiliate referral URL (~$50/referral, wellness) | site-builder.js |
| `AFFILIATE_MINDBODY_URL` | ⚠️ NEEDED | Mindbody affiliate referral URL (~$200/referral, fitness) | site-builder.js |
| `AFFILIATE_SQUARE_URL` | ⚠️ NEEDED | Square affiliate referral URL (up to $2,500/referral) | site-builder.js |

---

## 🧠 Ollama (Local AI — Optional)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `OLLAMA_BASE_URL` | 🔲 OPTIONAL | Ollama local endpoint (e.g. http://localhost:11434) | ai-model-selector.js |
| `OLLAMA_HOST` | 🔲 OPTIONAL | Alias for OLLAMA_BASE_URL | ai-model-selector.js |
| `FORCE_OLLAMA_ON` | 🔲 OPTIONAL | Force Ollama even if cloud models available | ai-model-selector.js |

---

## ⚙️ Feature Flags

| Variable | Status | Default | Purpose |
|---|---|---|---|
| `FLAG_AUTONOMY_RUNNING` | 🔲 OPTIONAL | true | Enable/disable autonomy scheduler |
| `FLAG_INCOME_DRONES` | 🔲 OPTIONAL | true | Enable income drone system |
| `FLAG_STRIPE_LIVE` | 🔲 OPTIONAL | false | Use Stripe live keys vs test keys |
| `FLAG_VIDEO_GENERATION` | 🔲 OPTIONAL | true | Enable Replicate video generation |
| `FLAG_GAME_BUILDER` | 🔲 OPTIONAL | true | Enable game publisher |
| `FLAG_FSAR_GATING` | 🔲 OPTIONAL | false | Enable FSAR execution gating |
| `FLAG_BOLDTRAIL_CRM` | 🔲 OPTIONAL | true | Enable BoldTrail CRM features |
| `FLAG_VAPI_PHONE` | 🔲 OPTIONAL | false | Enable VAPI phone agents |
| `FLAG_WHITE_LABEL` | 🔲 OPTIONAL | false | Enable white-label config |
| `FLAG_IDEA_AUTO_IMPLEMENT` | 🔲 OPTIONAL | false | Auto-implement approved ideas |
| `FLAG_OPEN_SOURCE_COUNCIL` | 🔲 OPTIONAL | false | Use open-source council models |
| `FLAG_TCO_SALES` | 🔲 OPTIONAL | true | Enable TCO sales agent |
| `FLAG_MOBILE_APP_BUILDER` | 🔲 OPTIONAL | false | Enable mobile app builder |

---

## 🔧 Runtime / Behavior

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `NODE_ENV` | ✅ SET | `production` \| `development` \| `test` | Throughout |
| `LOG_LEVEL` | 🔲 OPTIONAL | Pino log level (default: info) | logger.js |
| `SMOKE_MODE` | 🔲 OPTIONAL | Skip heavy init for smoke tests | startup/environment.js |
| `SEARCH_ENABLED` | 🔲 OPTIONAL | Enable/disable web search globally | web-search-service.js |
| `COUNCIL_TIMEOUT_MS` | 🔲 OPTIONAL | Max ms to wait for a council member (default: 300000) | council-service.js |
| `COUNCIL_PING_TIMEOUT_MS` | 🔲 OPTIONAL | Ping timeout for council availability (default: 5000) | council-service.js |
| `QUIET_HOURS` | 🔲 OPTIONAL | JSON `[{start:"22:00",end:"08:00"}]` — no SMS during these hours | reminder-cron.js |
| `ALERT_PHONE` | ✅ SET | (see Twilio section) | — |

---

## 🗂️ Notion (Knowledge Base)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `NOTION_API_KEY` | 🔲 OPTIONAL | Notion integration token | knowledge routes |
| `NOTION_CONTACTS_DB_ID` | 🔲 OPTIONAL | Notion database ID for contacts | knowledge routes |
| `NOTION_TASKS_DB_ID` | 🔲 OPTIONAL | Notion database ID for tasks | knowledge routes |

---

## 📋 Changelog

| Date | Change |
|---|---|
| 2026-03-21 | Initial registry created — all vars audited from codebase grep |
| 2026-03-21 | Added Google Calendar OAuth2 vars (Amendment 16) |
| 2026-03-21 | Added Twilio auto-webhook note (Amendment 17) |

---

## How to Add a New Variable

1. Add to this registry first (under the right category, with status ⚠️ NEEDED)
2. Set it in Railway → Project → Variables
3. Update status to ✅ SET with the date
4. Reference it in code as `process.env.YOUR_VAR_NAME`
5. Add it to `services/env-validator.js` if it's required for the feature to function

**Never hardcode secrets. Never commit .env files. This registry is the map — Railway is the vault.**
