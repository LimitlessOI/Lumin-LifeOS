# 🚂 Railway Environment Variable Setup

**Never guess again.** This guide provides exact copy/paste blocks for Railway environment variables.

## ⚠️ IMPORTANT: Select Environment First

**Before pasting variables, select the correct environment in Railway:**
1. Open your Railway project
2. Click on the **service** (e.g., "Lumin-LifeOS" or "robust-magic")
3. Click **"Variables"** tab
4. **Look at the sidebar** - you'll see:
   - **Production** (or your main environment name)
   - **Lumin** (or "sandbox" - your sandbox environment)
5. **Click the environment name** in the sidebar to select it
6. **Then paste** the appropriate block below

---

## 🔵 PRODUCTION Environment

**Use this for your main production Railway service.**

### Railway Raw Editor Block (Production)

```bash
DATABASE_URL=postgresql://[YOUR_PRODUCTION_NEON_CONNECTION_STRING]
SANDBOX_MODE=false
NODE_ENV=production
DB_SSL_REJECT_UNAUTHORIZED=false
COMMAND_CENTER_KEY=MySecretKey2025LifeOS
OLLAMA_ENDPOINT=http://ollama.railway.internal:11434
MAX_DAILY_SPEND=0
COST_SHUTDOWN_THRESHOLD=0
PORT=8080
HOST=0.0.0.0
RAILWAY_PUBLIC_DOMAIN=[YOUR_PRODUCTION_DOMAIN].up.railway.app
```

**How to get DATABASE_URL:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your **PRODUCTION** database project
3. Click **"Connection Details"** or **"Connection String"**
4. Copy the **PostgreSQL connection string**
5. Replace `[YOUR_PRODUCTION_NEON_CONNECTION_STRING]` above

**Required Variables:**
- ✅ `DATABASE_URL` - **MUST** point to your production Neon database
- ✅ `SANDBOX_MODE=false` - Explicitly set to false for production (or omit it)
- ✅ `NODE_ENV=production`

**Optional Variables:**
- `DATABASE_URL_SANDBOX` - Can be set to sandbox DB connection string (for reference, not used in production)
- `COMMAND_CENTER_KEY` - API key for command center access
- `OLLAMA_ENDPOINT` - If using Railway Ollama service
- `RAILWAY_PUBLIC_DOMAIN` - Your production domain

---

## 🔶 SANDBOX Environment (Lumin)

**Use this for your sandbox/testing Railway service.**

### Railway Raw Editor Block (Sandbox)

```bash
DATABASE_URL=postgresql://[YOUR_SANDBOX_NEON_CONNECTION_STRING]
DATABASE_URL_SANDBOX=postgresql://[YOUR_SANDBOX_NEON_CONNECTION_STRING]
SANDBOX_MODE=true
NODE_ENV=production
DB_SSL_REJECT_UNAUTHORIZED=false
COMMAND_CENTER_KEY=MySecretKey2025LifeOS
OLLAMA_ENDPOINT=http://ollama.railway.internal:11434
MAX_DAILY_SPEND=0
COST_SHUTDOWN_THRESHOLD=0
PORT=8080
HOST=0.0.0.0
RAILWAY_PUBLIC_DOMAIN=[YOUR_SANDBOX_DOMAIN].up.railway.app
```

**How to get your sandbox Neon connection string:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your **SANDBOX** database project (or create a separate Neon project for sandbox)
3. Click **"Connection Details"** or **"Connection String"**
4. Copy the **PostgreSQL connection string**
5. Replace `[YOUR_SANDBOX_NEON_CONNECTION_STRING]` above in **BOTH** `DATABASE_URL` and `DATABASE_URL_SANDBOX`

**Required Variables:**
- ✅ `DATABASE_URL` - **MUST** be set to your sandbox Neon connection string
- ✅ `DATABASE_URL_SANDBOX` - **MUST** be set to the **SAME** sandbox Neon connection string
- ✅ `SANDBOX_MODE=true` - **MUST** be set to true for sandbox
- ✅ `NODE_ENV=production` (still production for Railway, but using sandbox DB)

**⚠️ CRITICAL - Exact Match Required:**
- **BOTH** `DATABASE_URL` and `DATABASE_URL_SANDBOX` must be set
- **BOTH** must be **exactly equal** (character-for-character match)
- The system will **fail fast** if they don't match exactly
- This prevents confusion and ensures sandbox always uses the correct database

---

## 🔍 How the System Detects Environment

The system uses a simple, foolproof detection method:

1. **Checks `SANDBOX_MODE` env var (ONLY):**
   - If `SANDBOX_MODE=true` → **SANDBOX MODE**
   - If `SANDBOX_MODE=false` or unset → **PRODUCTION MODE**
   - **No heuristics** - only the explicit flag is checked

2. **SANDBOX MODE Rules:**
   - **REQUIRES** both `DATABASE_URL` and `DATABASE_URL_SANDBOX`
   - **REQUIRES** exact equality: `DATABASE_URL === DATABASE_URL_SANDBOX` (character-for-character)
   - Uses `DATABASE_URL` as the connection string (both are equal anyway)
   - **Fails fast** if either is missing or they don't match exactly

3. **PRODUCTION MODE Rules:**
   - **REQUIRES** `DATABASE_URL` (must not be placeholder)
   - `DATABASE_URL_SANDBOX` is optional (can be set for reference, not used)
   - **Fails fast** if `DATABASE_URL` is missing or is a placeholder

---

## ✅ Startup Validation

When the server starts, you'll see:

```
🔍 [DB VALIDATOR] Environment Detection:
   Railway: ✅
   Environment: production
   SANDBOX_MODE: false
   Detected: 🔵 PRODUCTION

✅ [DB VALIDATOR] Using: DATABASE_URL (production)
   Connection: postgresql://****@****...
```

Or for sandbox:

```
🔍 [DB VALIDATOR] Environment Detection:
   Railway: ✅
   Environment: lumin
   SANDBOX_MODE: true
   Detected: 🔶 SANDBOX

✅ [DB VALIDATOR] Configuration valid
   Using: DATABASE_URL (sandbox, matches DATABASE_URL_SANDBOX)
   Connection: postgresql://****@neon.tech/your-sandbox-db
```

**If you see errors**, the server will **not start** and will tell you exactly what's missing.

---

## 📋 Quick Checklist

### For Production Environment:
- [ ] Selected "Production" environment in Railway sidebar
- [ ] Pasted production Raw Editor block
- [ ] Replaced `[YOUR_PRODUCTION_NEON_CONNECTION_STRING]` with actual Neon connection string
- [ ] Set `SANDBOX_MODE=false`
- [ ] Verified server starts without errors

### For Sandbox Environment:
- [ ] Selected "Lumin" (or sandbox) environment in Railway sidebar
- [ ] Pasted sandbox Raw Editor block
- [ ] Replaced `[YOUR_SANDBOX_NEON_CONNECTION_STRING]` with actual sandbox Neon connection string in **BOTH** `DATABASE_URL` and `DATABASE_URL_SANDBOX` (same value)
- [ ] Verified both `DATABASE_URL` and `DATABASE_URL_SANDBOX` are exactly equal
- [ ] Set `SANDBOX_MODE=true`
- [ ] Verified server starts without errors

---

## 🆘 Troubleshooting

### Error: "DATABASE_URL is required for production environment"
- **Fix:** Set `DATABASE_URL` in your production environment variables

### Error: "DATABASE_URL is required when SANDBOX_MODE=true"
- **Fix:** Set `DATABASE_URL` in your sandbox environment variables

### Error: "DATABASE_URL_SANDBOX is required when SANDBOX_MODE=true"
- **Fix:** Set `DATABASE_URL_SANDBOX` in your sandbox environment variables

### Error: "SANDBOX_MODE=true but DATABASE_URL !== DATABASE_URL_SANDBOX"
- **Fix:** Set both `DATABASE_URL` and `DATABASE_URL_SANDBOX` to the **exact same** sandbox connection string
- They must match character-for-character (copy/paste the same value to both)

### Server starts but connects to wrong database
- **Check:** Look at startup logs for `[DB VALIDATOR]` section
- **Verify:** The "Using:" line shows the correct source (production vs sandbox)
- **Fix:** Ensure `SANDBOX_MODE` is set correctly for your environment

---

## 📝 Notes

- **Never share these connection strings** - they contain database credentials
- **Use separate Neon projects** for production and sandbox (recommended)
- **The system validates on startup** - if config is wrong, server won't start
- **All validation errors are logged** with exact variable names that are missing
