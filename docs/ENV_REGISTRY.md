# ENV_REGISTRY.md — Environment Variable Registry

**SSOT Position:** This file sits under `docs/SSOT_COMPANION.md § 0.4` as the canonical env var reference.
Priority: SSOT North Star → SSOT Companion → **This file** → everything else.

**Platform “what can the system do?”** → **`docs/SYSTEM_CAPABILITIES.md`** (HTTP routes + scripts + required env + **gaps**). Update that file and this registry **together** when adding self-serve ops.

**This file is the single source of truth for every environment variable the system uses.**
Every variable must be listed here. When a new var is added anywhere in the codebase, it goes here first.
The vault is Railway → Project → Variables. This file is the map.

**Working vs present:** Category tables + deploy inventory = **what exists**. **`## Env certification playbook`** + **`## Env certification log`** = **what is proven correct on a live deploy** (run `npm run env:certify` and paste the printed row after each relevant slice).

**Before claiming a var is “missing” in production:** read **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** — if the **name** is listed below, agents **must** exhaust non-secret causes (shell vs Railway, wrong base URL, auth header, typos) before blaming the vault. **North Star:** `docs/SSOT_NORTH_STAR.md` **Article II §2.3**.

### For every Conductor session (read before “missing env” or “I can’t reach builder”)

1. **Open this file** and scan **category tables** + **Deploy inventory** for the names you need (`COMMAND_CENTER_KEY`, `PUBLIC_BASE_URL` policy, etc.). If the name is **SET** in Railway per this file, **do not** ask Adam to “confirm it exists” again — diagnose **local shell** (`export PUBLIC_BASE_URL=…`), **wrong host**, **401 key mismatch**, or **404 deploy drift** (`ENV_DIAGNOSIS_PROTOCOL.md`).
2. **Non-secrets the system can set:** `POST /api/v1/railway/env/bulk` (per **`docs/SYSTEM_CAPABILITIES.md`**) when policy allows — **not** “paste into Railway by hand” as the first move.
3. **True secrets / rotation:** operator only after **receipts** show no other cause (North Star **§2.3**).
4. **Builder 404 on `/api/v1/lifeos/builder/domains`:** not an “env list” problem — **deploy** the commit that **mounts** builder routes; track in receipts until **200** (`QUICK_LAUNCH` / `SYSTEM_CAPABILITIES`).

### Operator mirror of Railway (screenshots / lists = evidence)

- When **Adam posts Railway Variables screenshots** or a **name list** from the dashboard, that is **authoritative evidence** for **which names exist** in the vault for that service. Agents **must** treat that as **KNOW** for name presence until a **contradicting** machine receipt (e.g. authenticated `GET /api/v1/railway/env` on the **same** service shows the key gone).
- **“No access to Railway”** in an IDE session means: this chat process **does not** automatically receive Railway’s GraphQL/API or vault UI — **not** “the variables are not set.” If Adam already showed them, **never** imply the vault is empty; diagnose only **shell export, wrong host, 401, stale deploy, or verifier skip** (`ENV_DIAGNOSIS_PROTOCOL` → *Operator-supplied evidence*).
- **Same-session update rule:** Any change to Railway variables (**add / remove / rename**) must be reflected **in this file the same session**: update **§ Deploy inventory** (visible-name list + optional non-secret values line), any affected **category table** `Status`, and a **Changelog** row with date + source (“operator screenshot”, “Railway UI export”, or “GET /api/v1/railway/env name list”). That keeps the repo aligned with the vault so cold agents **always** have a written mirror of **names** (and safe **values** only where listed below).
- **Secrets:** never commit secret **values**. If a secret value ever appeared in a screenshot or chat, **rotate** it in the provider + Railway; this file stays **names + SET/NEEDED** only for secrets.

Legend:
- ✅ **SET** — confirmed in Railway production (operator screenshot, deploy inventory A→Z, or authenticated name list)
- ⚠️ **NEEDED** — required for a feature to work, not yet set
- 🔲 **OPTIONAL** — **role**: not required for a **minimal** core path — **does not mean “absent.”** Optional keys can still be **✅ SET** when the vault/inventory shows them; use SET when you have evidence of presence.
- ❌ **DEPRECATED** — no longer used, safe to remove

**Two different questions:** (1) **Is the name in the vault?** → deploy inventory + category **Status**. (2) **Does the live Node process have it right now?** → e.g. `GET /api/v1/lifeos/builder/ready` → `github_token` (runtime). Those can disagree if you hit **local** Node, **wrong** `PUBLIC_BASE_URL`, or **pre-redeploy** — see **§ GitHub** and `ENV_DIAGNOSIS_PROTOCOL.md`.

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
| `GROQ_API_KEY` | ✅ SET | Groq inference (fast, cheap) — fallback council member; **optional for core** but **present** in deploy inventory (2026-04-25) | council-service.js |
| `GROQ_MODEL` | 🔲 OPTIONAL | Groq model name (default: llama-3.1-70b-versatile) | council-service.js |
| `MISTRAL_API_KEY` | ✅ SET | Mistral — additional council member; **optional for core**; **present** in deploy inventory (2026-04-25) | council-service.js |
| `MISTRAL_MODEL` | 🔲 OPTIONAL | Mistral model name | council-service.js |
| `CEREBRAS_API_KEY` | ✅ SET | Cerebras — ultra-fast inference | council-service.js |
| `CEREBRAS_MODEL` | 🔲 OPTIONAL | Cerebras model name | council-service.js |
| `TOGETHER_API_KEY` | ✅ SET | Together AI — open model inference; **optional for core**; **present** in deploy inventory (2026-04-25) | council-service.js |
| `TOGETHER_MODEL` | 🔲 OPTIONAL | Together model name | council-service.js |
| `OPENROUTER_API_KEY` | ✅ SET | OpenRouter — model routing/fallback; **optional for core**; **present** in deploy inventory (2026-04-25) | council-service.js |
| `OPENROUTER_MODEL` | 🔲 OPTIONAL | Default model via OpenRouter | council-service.js |
| `PERPLEXITY_API_KEY` | 🔲 OPTIONAL | Perplexity — web-search-grounded answers | web-search-integration.js |
| `BRAVE_SEARCH_API_KEY` | 🔲 OPTIONAL | Brave Search — web intelligence without Google | web-search-service.js |
| `REPLICATE_API_TOKEN` | ✅ SET | Replicate — Kling/Wan video generation | video-pipeline.js |
| `GEMINI_MODEL` | 🔲 OPTIONAL | Override Gemini model name | council-service.js |

---

## 🗄️ Database

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `DATABASE_URL` | ✅ SET | Neon PostgreSQL connection string (primary; production) | `core/database.js`, all services with pool |
| `DATABASE_URL_SANDBOX` | ✅ SET | Non-production / sandbox Neon branch when `NODE_ENV` is not `production` (falls back to `DATABASE_URL` if unset) | `core/database.js` |
| `DB_SSL_REJECT_UNAUTHORIZED` | 🔲 OPTIONAL | `true` (default) \| `false` — pg SSL `rejectUnauthorized` (Neon often needs `false` in some local shells) | `core/database.js` |
| `NEON_PG_CONNECTION_STRING` | ❌ DEPRECATED | Old alias for DATABASE_URL — use DATABASE_URL | — |

**Security:** `DATABASE_URL` and `DATABASE_URL_SANDBOX` are **secrets** (user + password in the connection string). They live only in Railway. Never paste them into this file, into tickets, or into chat. If a URL was ever shown in a screenshot, UI export, or message, **rotate the Neon user password** and update Railway.

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

## 🌐 Public URL & remote verification (not secrets)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `PUBLIC_BASE_URL` | ✅ SET | Canonical `https://…` origin — **set on Railway** (`robust-magic` production); operator screenshot **2026-04-22**; also export in local shell for scripts | `scripts/verify-project.mjs`, `scripts/council-builder-preflight.mjs`, curl examples |
| `REMOTE_VERIFY_BASE_URL` | 🔲 OPTIONAL | Same role as `PUBLIC_BASE_URL` but explicit name for “probe this deploy from my laptop” | `scripts/verify-project.mjs` |
| `BASE_URL` | ✅ SET | Public app origin; fallback when `RAILWAY_PUBLIC_DOMAIN` / `PUBLIC_BASE_URL` are unset (e.g. TC mobile link helper) | `services/tc-mobile-link-service.js` (with `PUBLIC_BASE_URL`) |

You can also rely on **`RAILWAY_PUBLIC_DOMAIN`** (Railway section below) when your shell inherits Railway’s injected env.

**Project verifier (SSOT manifests):** From a developer machine, run HTTP route probes against the live deploy with an explicit base so the script is not guessing Railway state:

```bash
node scripts/verify-project.mjs --project clientcare_billing_recovery --remote-base-url "https://YOUR-RAILWAY-HOST" --dry-run
```

Optional: `npm run verify:clientcare-billing:remote` (uses `PUBLIC_BASE_URL` from your shell). Manifest `required_env` secrets (`CLIENTCARE_*`) are **skipped** when missing locally unless you pass **`--strict-manifest-env`** (then they must be present in process env). Canonical names and meanings: this file; machine list: `services/env-registry-map.js`; UI health: Command Center env-registry panel + `/api/v1/railway/managed-env/registry` per `docs/SSOT_COMPANION.md` §0.4.

---

## 🏥 ClientCare billing (Amendment 18 — browser path)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `CLIENTCARE_BASE_URL` | ✅ SET | ClientCare web app origin for Puppeteer | `services/clientcare-browser-service.js`, billing routes |
| `CLIENTCARE_USERNAME` | ✅ SET | ClientCare login username | `services/clientcare-browser-service.js` |
| `CLIENTCARE_PASSWORD` | ✅ SET | ClientCare login password | `services/clientcare-browser-service.js` |
| `CLIENTCARE_MFA_MODE` | 🔲 OPTIONAL | MFA mode when ClientCare requires a second factor | Browser automation (when used) |
| `CLIENTCARE_MFA_SECRET` | 🔲 OPTIONAL | MFA secret or approved automation fallback | Browser automation (when used) |

**Vault:** Railway → Project → Variables. Never commit values; `docs/SSOT_COMPANION.md` §0.4 points here as the human-readable map.

---

## eXp Okta (TC — `credential-aliases` / browser automation)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `exp_okta_Username` | 🔲 OPTIONAL | eXp Okta login username (canonical; Railway may use legacy naming) | `services/credential-aliases.js` → `getExpOktaCredentialsFromEnv` |
| `exp_okta_Password` | 🔲 OPTIONAL | eXp Okta password | Same (secret — vault only) |
| `exp_okta_URL` | 🔲 OPTIONAL | Okta org URL; defaults to `https://exprealty.okta.com` if unset | Same |

**Aliases (same resolver):** `EXP_OKTA_USERNAME`, `EXP_OKTA_USER`, `EXP_OKTA_PASSWORD`, `EXP_OKTA_PASS`, `EXP_OKTA_URL`.  
**Note:** A trailing-space variant for the password key is handled in code to match a known Railway quirk. Prefer exact names in new environments.

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

> **`GET /api/v1/lifeos/builder/ready` → `builder.github_token`:** This is **`Boolean(process.env.GITHUB_TOKEN)`** on the **Node process that answers that HTTP request** — runtime injection, not a read of the Railway UI. **✅ SET** here means the **name** is in the **vault** per operator mirror (screenshot / deploy inventory). If you **KNOW** the name is in Railway but `/ready` shows `github_token: false`, diagnose **local server** (no env), **wrong base URL**, **different service**, or **redeploy / scope** — do **not** treat that alone as “Adam must add `GITHUB_TOKEN`” (`ENV_DIAGNOSIS_PROTOCOL` → operator-supplied evidence; North Star **§2.3**).

---

## 📧 Email

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `EMAIL_PROVIDER` | ✅ SET | Email provider name: `postmark` (or as configured) | notification-service.js |
| `EMAIL_FROM` | ✅ SET | Sender address (e.g. adam@yourdomain.com) | notification-service.js |
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
| `COST_SHUTDOWN_THRESHOLD` | ✅ SET | Monthly-ish AI spend cap (USD) before council routing refuses paid providers / escalates; default `0` in `config/runtime-env.js` | `config/runtime-env.js`, `services/council-service.js` |
| `COUNCIL_MODE_OVERRIDE` | 🔲 OPTIONAL | Reserved — present in some Railway envs; **not referenced in this repo** (2026-04-22) | — |
| `DATA_DIR` | 🔲 OPTIONAL | Reserved — present in some Railway envs; **not referenced in this repo** (2026-04-22) | — |
| `DEBUG_AI` | 🔲 OPTIONAL | Reserved — present in some Railway envs; **not referenced in this repo** (2026-04-22) | — |
| `COUNCIL_TIMEOUT_MS` | 🔲 OPTIONAL | Max ms to wait for a council member (default: 300000) | council-service.js |
| `COUNCIL_PING_TIMEOUT_MS` | 🔲 OPTIONAL | Ping timeout for council availability (default: 5000) | council-service.js |
| `QUIET_HOURS` | 🔲 OPTIONAL | JSON `[{start:"22:00",end:"08:00"}]` — no SMS during these hours | reminder-cron.js |
| `ALERT_PHONE` | ✅ SET | (see Twilio section) | — |

---

## 🛡️ Autonomy & Safety Controls

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `LIFEOS_DIRECTED_MODE` | ✅ SET | `true` = all autonomous AI schedulers OFF. Default is `true` (safe). Set to `false` only to enable autonomous mode. | services/autonomy-scheduler.js, core/auto-builder.js |
| `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER` | ✅ SET | `false` = auto-builder never writes code or commits to GitHub on a schedule. Must be explicitly `true` to enable. | core/auto-builder.js |
| `PAUSE_AUTONOMY` | ✅ SET | `1` = secondary kill switch — all scheduleAutonomyLoop calls are no-ops. | startup/schedulers.js |

> **Rule:** These three must always be explicitly set in Railway. Never rely on defaults. The system can set its own vars via `POST /api/v1/railway/env/bulk` using its own RAILWAY_TOKEN.

---

## 🗂️ Notion (Knowledge Base)

| Variable | Status | Purpose | Used By |
|---|---|---|---|
| `NOTION_API_KEY` | 🔲 OPTIONAL | Notion integration token | knowledge routes |
| `NOTION_CONTACTS_DB_ID` | 🔲 OPTIONAL | Notion database ID for contacts | knowledge routes |
| `NOTION_TASKS_DB_ID` | 🔲 OPTIONAL | Notion database ID for tasks | knowledge routes |

---

## 🧾 Deploy inventory — Lumin (Railway production, variable **names** only)

**Service:** `robust-magic` · **Environment:** production · **Vault:** Railway → Lumin → Variables.  
**Sources:** (1) operator screenshots **2026-04-22** + **2026-04-25** (names only; values masked). (2) Category tables above. (3) Authenticated `GET /api/v1/railway/env` (names + masked values) when available.  
**Railway UI note:** dashboard reports **~92** service variables; **9** may be “added by Railway” system entries — names can change with platform updates.

**Rule:** **Secret values never appear in this repo.** If a secret was ever exposed in a screenshot, chat, or export → **rotate** in provider + Railway.

**Non-secret values (safe to record here):** Only variables that are already public or non-sensitive (e.g. public URL, `NODE_ENV`, `PORT`). Example confirmed from operator screenshot: **`PUBLIC_BASE_URL`** = `https://robust-magic-production.up.railway.app`.

### Full visible-name list (2026-04-25 screenshot pass — A→Z)

Use this as the **“is the name plausibly in the vault?”** checklist before any agent says an env “does not exist.” Non-standard labels (emails as keys) are **real UI artifacts** — map to documented keys where possible; otherwise treat as **THINK** legacy.

`ADAM_SMS_NUMBER` · `AGENT_PHONE` · `ALERT_PHONE_NUMBER` · `Adam@hopkinsgroup.org` · `APP_URL` · `ASANA_API_KEY` · `BASE_URL` · `BOLDTRAIL_API_KEY` · `CEREBRAS_API_KEY` · `CLIENTCARE_BASE_URL` · `CLIENTCARE_PASSWORD` · `CLIENTCARE_USERNAME` · `COMMAND_CENTER_KEY` · `COST_SHUTDOWN_THRESHOLD` · `COUNCIL_MODE_OVERRIDE` · `DATA_DIR` · `DATABASE_URL` · `DATABASE_URL_SANDBOX` · `DB_SSL_REJECT_UNAUTHORIZED` · `DEBUG_AI` · `EMAIL_FROM` · `EMAIL_PROVIDER` · `exp_okta_Password` · `exp_okta_URL` · `exp_okta_Username` · `GEMINI_API_KEY` · `GITHUB_DEFAULT_BRANCH` · `GITHUB_REPO` · `GITHUB_TOKEN` · `GLVAR_mls_Password` · `GLVAR_mls_URL` · `GLVAR_mls_Username` · `GMAIL_SIGNUP_APP_PASSWORD` · `GMAIL_SIGNUP_EMAIL` · `GROQ_API_KEY` · `HAB_DAILY_LIMIT` · `HOST` · `LIFEOS_DIRECTED_MODE` · `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER` · `lifeos@hopkinsgroup.org` · `LOG_ALL_API_CALLS` · `MAX_DAILY_SPEND` · `MISTRAL_API_KEY` · `NODE_ENV` · `OPENROUTER_API_KEY` · `ORCH_AUTORUN` · `ORCH_LISTEN_CHANNEL` · `ORCH_MAX_CONCURRENCY` · `ORCH_POLL_INTERVAL_MS` · `PAUSE_AUTONOMY` · `PGSSLMODE` · `PORT` · `POSTMARK_SERVER_TOKEN` · `PUBLIC_BASE_URL` · `RAILWAY_ENVIRONMENT_ID` · `RAILWAY_PROJECT_ID` · `RAILWAY_SERVICE_ID` · `RAILWAY_TCP_PROXY_PORT` · `RAILWAY_TOKEN` · `SANDBOX_MODE` · `SMTP_HOST` · `SMTP_PASS` · `SMTP_PORT` · `SMTP_USER` · Stripe CRM AI setup key (Railway UI label contains spaces — match **exact** name in dashboard) · `STRIPE_PAYMENT_LINK` · `STRIPE_PRICE_FULL` · `STRIPE_PRICE_MONTHLY` · `STRIPE_PRICE_PRESALE` · `STRIPE_PRICE_PROMO1` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `SystemEmail_IMAP_APP_LifeOS_PASSWORD` · `TC_IMAP_APP_Adam_PASSWORD` · `TCO_ENCRYPTION_KEY` · `TOGETHER_API_KEY` · `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_PHONE_NUMBER` · `USE_CLAUDE` · `useOpenSourceCouncil` · `VAPI_API_KEY` · `VAPI_ASSISTANT_ID` · `VAPI_PHONE_NUMBER` · `VAPI_PHONE_NUMBER_ID` · `WEBHOOK_SECRET` · `WORK_EMAIL` · `WORK_EMAIL_APP_PASSWORD` · `your_zoom_client_secret` · `ZOOM_ACCOUNT_ID` · `ZOOM_CLIENT_ID`

**Gaps vs UI:** If Railway shows a name **not** in this list or the category tables, add it here the same session (names only) and sync `services/env-registry-map.js` when applicable.

---

## Env certification playbook (presence vs working)

| Goal | What “working” means | How to prove (evidence) |
|------|----------------------|---------------------------|
| **Deploy + base URL** | App responds at the public origin | `GET {PUBLIC_BASE_URL}/healthz` → 200 + healthy body |
| **Command key + builder** | Auth’d builder surface mounted | `npm run builder:preflight` → exit **0**; log line in `data/builder-preflight-log.jsonl` |
| **Command key + Railway API on server** | Server can list vault names (masked) | `npm run env:certify` → `railway_env` PASS; or authenticated `GET /api/v1/railway/env` |
| **`DATABASE_URL` + LifeOS tables** | Pool + migrations match code | `node scripts/lifeos-verify.mjs` (with env) → exit **0** |
| **Lumin build / council** | Jobs + council wiring | `npm run lifeos:lumin-build-smoke` (see script env); or overlay E2E per lane SSOT |
| **Lane manifest (e.g. ClientCare)** | Declared routes return expected shape | `node scripts/verify-project.mjs --project … --remote-base-url "$PUBLIC_BASE_URL"` |

**Rule:** “✅ SET” in category tables = **present in vault** (screenshot or inventory). **Certification log** = **runtime proof** that the var is **used correctly** for a named path. Both matter.

**Automation:** `npm run env:certify` — prints one markdown row; appends `data/env-certification-log.jsonl` (gitignored). Requires `PUBLIC_BASE_URL` + command key in shell (same as Railway). Exit **0** only if `healthz` + `/railway/env` + `/lifeos/builder/domains` all pass.

---

## Env certification log (runtime proof — append as you prove each path)

Paste rows whenever a verifier or production flow **succeeds** under an explicit **success criterion** (not “we think it’s fine”).

| Date | Variable(s) / scope | Success criterion | Evidence | Result |
|---|---|---|---|---|
| _(append rows here)_ | e.g. `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` + server `RAILWAY_TOKEN` | healthz OK; `/railway/env` lists keys; `/lifeos/builder/domains` returns domains | `npm run env:certify` (stdout + `data/env-certification-log.jsonl`) | **PASS** |

---


## 📋 Changelog

| Date | Change |
|---|---|
| 2026-04-25 | **Legend + `/ready` clarification:** OPTIONAL = role (not “absent”); **vault presence** vs **runtime** `process.env` (e.g. `github_token`). **AI APIs:** `GROQ_API_KEY`, `MISTRAL_API_KEY`, `TOGETHER_API_KEY`, `OPENROUTER_API_KEY` → **✅ SET** with note “optional for core” — aligned with deploy inventory A→Z + operator screenshots. |
| 2026-04-25 | **“For every Conductor session”** block — read registry + deploy inventory before “missing env”; `PUBLIC_BASE_URL` export; system `POST /railway/env/bulk` for non-secrets; **404** on builder routes = **deploy drift** (not an operator re-proof loop). |
| 2026-04-22 | **Pointer to `docs/SYSTEM_CAPABILITIES.md`** — matrix of self-serve routes/scripts + env per capability + gaps; maintain with this registry. |
| 2026-04-22 | **Env certification playbook + `npm run env:certify`** — `scripts/env-certify.mjs` (healthz + `/railway/env` + `/lifeos/builder/domains`[/ready]); `data/env-certification-log.jsonl` (gitignored); **Env certification log** table columns: scope / success criterion / evidence / result; `ENV_DIAGNOSIS_PROTOCOL` §4 “present **and** working”. |
| 2026-04-22 | **Operator mirror of Railway** — top-of-file contract: screenshots/lists = **KNOW** for name presence; “no access” = IDE cannot read vault without HTTP/auth, **not** “vars unset”; **same-session update rule** when Railway vars change; `PUBLIC_BASE_URL` → **✅ SET** + non-secret value line under Deploy inventory. |
| 2026-04-25 | **Deploy inventory expanded** — full A→Z **visible-name** list from operator Railway screenshots (robust-magic); **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** (mandatory before “env missing” claims); **Env certification log** table; top-of-file pointer + **North Star §2.3** cross-link |
| 2026-04-22 | **Deploy inventory** (Lumin / robust-magic): names-only table; expanded **Database** (`DATABASE_URL_SANDBOX`, `DB_SSL_*`), **Public URL** (`BASE_URL`), **Runtime** (`COST_SHUTDOWN_THRESHOLD`, reserved keys), **eXp Okta**; **EMAIL_*** and **CEREBRAS** status aligned with live vault where confirmed |
| 2026-04-22 | Added **Public URL & remote verification** (`PUBLIC_BASE_URL`, `REMOTE_VERIFY_BASE_URL`, verify-project remote mode) and **ClientCare billing** (`CLIENTCARE_*`, MFA optional); synced machine map in `services/env-registry-map.js` |
| 2026-03-21 | Initial registry created — all vars audited from codebase grep |
| 2026-03-21 | Added Google Calendar OAuth2 vars (Amendment 16) |
| 2026-03-21 | Added Twilio auto-webhook note (Amendment 17) |
| 2026-03-26 | Added Autonomy & Safety Controls section — LIFEOS_DIRECTED_MODE, LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER, PAUSE_AUTONOMY set via system self-management |

---

## How to Add a New Variable

1. Add to this registry first (under the right category, with status ⚠️ NEEDED)
2. Set it in Railway → Project → Variables
3. Update status to ✅ SET with the date
4. **Same session:** add the **name** to **§ Deploy inventory** (visible-name list) and a **Changelog** row — so the operator mirror stays aligned with the vault (see **Operator mirror of Railway** above).
5. Reference it in code as `process.env.YOUR_VAR_NAME`
6. Add it to `services/env-validator.js` if it's required for the feature to function

**Never hardcode secrets. Never commit .env files. This registry is the map — Railway is the vault.**
