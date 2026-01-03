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
- ✅ `SANDBOX_MODE=false` - Explicitly set to false for production
- ✅ `NODE_ENV=production`

**Optional but Recommended:**
- `COMMAND_CENTER_KEY` - API key for command center access
- `OLLAMA_ENDPOINT` - If using Railway Ollama service
- `RAILWAY_PUBLIC_DOMAIN` - Your production domain

---

## 🔶 SANDBOX Environment (Lumin)

**Use this for your sandbox/testing Railway service.**

### Railway Raw Editor Block (Sandbox)

```bash
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

**How to get DATABASE_URL_SANDBOX:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your **SANDBOX** database project (or create a separate Neon project for sandbox)
3. Click **"Connection Details"** or **"Connection String"**
4. Copy the **PostgreSQL connection string**
5. Replace `[YOUR_SANDBOX_NEON_CONNECTION_STRING]` above

**Required Variables:**
- ✅ `DATABASE_URL_SANDBOX` - **MUST** point to your sandbox Neon database
- ✅ `SANDBOX_MODE=true` - **MUST** be set to true for sandbox
- ✅ `NODE_ENV=production` (still production for Railway, but using sandbox DB)

**⚠️ CRITICAL:**
- **DO NOT** set `DATABASE_URL` in sandbox environment (or ensure it's different from production)
- The system will **fail fast** if `SANDBOX_MODE=true` but `DATABASE_URL` points to production
- This prevents accidental data corruption

---

## 🔍 How the System Detects Environment

The system automatically detects which database to use:

1. **Checks `SANDBOX_MODE` env var:**
   - If `SANDBOX_MODE=true` → Uses `DATABASE_URL_SANDBOX`
   - If `SANDBOX_MODE=false` or unset → Uses `DATABASE_URL`

2. **Checks Railway environment name:**
   - If `RAILWAY_ENVIRONMENT` contains "sandbox" or "lumin" → Uses `DATABASE_URL_SANDBOX`
   - Otherwise → Uses `DATABASE_URL`

3. **Fails fast if misconfigured:**
   - Missing `DATABASE_URL` in production → **Server won't start**
   - Missing `DATABASE_URL_SANDBOX` in sandbox → **Server won't start**
   - `SANDBOX_MODE=true` but `DATABASE_URL` points to prod → **Server won't start**

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

✅ [DB VALIDATOR] Using: DATABASE_URL_SANDBOX (sandbox)
   Connection: postgresql://****@****...
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
- [ ] Replaced `[YOUR_SANDBOX_NEON_CONNECTION_STRING]` with actual sandbox Neon connection string
- [ ] Set `SANDBOX_MODE=true`
- [ ] **Did NOT set `DATABASE_URL`** (or ensured it's different from production)
- [ ] Verified server starts without errors

---

## 🆘 Troubleshooting

### Error: "DATABASE_URL is required for production environment"
- **Fix:** Set `DATABASE_URL` in your production environment variables

### Error: "DATABASE_URL_SANDBOX is required when SANDBOX_MODE=true"
- **Fix:** Set `DATABASE_URL_SANDBOX` in your sandbox environment variables

### Error: "SANDBOX_MODE=true but DATABASE_URL points to production database"
- **Fix:** Either:
  1. Remove `DATABASE_URL` from sandbox environment, OR
  2. Set `DATABASE_URL` to point to your sandbox database (not production)

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
