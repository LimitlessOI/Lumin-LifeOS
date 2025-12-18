# 🔧 Fix Git and Railway Issues - Complete Guide

## ✅ What I Fixed

1. **Model Selection Bug** - Router no longer tries Gemini without API key ✅
2. **Production Detection** - System now detects production and disables Ollama ✅
3. **OSC Production Skip** - Open Source Council automatically skipped in production ✅

## 🛠️ Part 1: Fix Git Issues (Local)

### A) Set Git Identity

```bash
git config --global user.name "Adam Hopkins"
git config --global user.email "your-email@example.com"
```

**Verify it worked:**
```bash
git config --global user.name
git config --global user.email
```

### B) Fix Push Rejection

```bash
# 1. Fetch latest from remote
git fetch origin

# 2. Pull with rebase (gets remote changes)
git pull --rebase origin modular-micro-v27

# 3. If there are conflicts, resolve them:
#    - Edit conflicted files
#    - git add .
#    - git rebase --continue

# 4. Push your changes
git push origin modular-micro-v27
```

**If you want to see what's on remote first:**
```bash
git log --oneline --decorate --graph --all -n 30
git status
git branch -vv
```

### C) Clean Cursor Worktree Cache

```bash
# 1. Close Cursor completely

# 2. Delete stale cache
rm -rf ~/.cursor/worktrees/Lumin-LifeOS

# 3. Re-open Cursor
```

---

## 🚂 Part 2: Fix Railway Production Issues

### The Problem

Railway **cannot** reach your local Ollama. Your deployed AI council is failing because:
- ❌ `ollama_*` models fail (Railway can't reach localhost:11434)
- ❌ Router tries Gemini but no `GEMINI_API_KEY` exists
- ❌ Cost guard set to $0, blocking all paid APIs

### ✅ What I Fixed in Code

1. **Model Selection** - Now checks for API keys before selecting models
2. **Production Detection** - Automatically detects `NODE_ENV=production` or `RAILWAY_ENVIRONMENT`
3. **Ollama Disabled in Production** - OSC automatically skipped when in production

### 🎯 What You Need to Do in Railway

#### Option A: Use Cloud APIs (Recommended)

**1. Add API Keys in Railway:**
- Go to Railway dashboard → Your project → **Variables** tab
- Add at least ONE of these:
  ```
  GEMINI_API_KEY=your-gemini-key-here
  ```
  OR
  ```
  OPENAI_API_KEY=your-openai-key-here
  ```

**2. Set a Budget (Even Small):**
```
MAX_DAILY_SPEND=5
COST_SHUTDOWN_THRESHOLD=4
```
(This allows up to $4/day before shutdown)

**3. Verify Production Detection:**
The code now automatically:
- ✅ Detects `NODE_ENV=production` or `RAILWAY_ENVIRONMENT`
- ✅ Skips Ollama models in production
- ✅ Only uses cloud APIs when keys are available

#### Option B: Keep AI Features Local Only

If you want to keep OSC local-only:
- Don't deploy AI council features to Railway
- Keep them local-only
- Deploy only non-AI parts to Railway

---

## 🧪 Test Locally First

**Before worrying about Railway, verify OSC works locally:**

```bash
# 1. Start server
npm start

# 2. In another terminal, test OSC
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Test Open Source Council",
    "member": "ollama_llama",
    "useOpenSourceCouncil": true
  }'
```

**Watch server logs for:**
- ✅ `[OPEN SOURCE COUNCIL] INITIALIZED`
- ✅ `[OPEN SOURCE COUNCIL] ACTIVATED`
- ✅ `[OLLAMA] SUCCESS`

---

## 📋 Quick Checklist

### Local/Git
- [ ] Set Git identity (`git config --global user.name` and `user.email`)
- [ ] Fetch and rebase (`git fetch origin && git pull --rebase origin modular-micro-v27`)
- [ ] Push changes (`git push origin modular-micro-v27`)
- [ ] Clean Cursor cache (`rm -rf ~/.cursor/worktrees/Lumin-LifeOS`)

### Railway
- [ ] Add `GEMINI_API_KEY` or `OPENAI_API_KEY` in Railway Variables
- [ ] Set `MAX_DAILY_SPEND=5` (or your preferred budget)
- [ ] Set `COST_SHUTDOWN_THRESHOLD=4` (slightly less than max)
- [ ] Verify production detection works (check logs for "Skipping OSC in production")

---

## ✅ Success Indicators

**Local:**
- Git commits work without "author identity unknown" error
- Git push succeeds
- OSC logs appear in server console

**Railway:**
- No more "gemini API key not found" errors
- No more "ollama_* failed" errors
- AI council uses cloud APIs successfully
- Logs show "Skipping OSC in production" (expected)

---

## 🐛 If Issues Persist

**Git:**
```bash
# Check current status
git status
git log --oneline -n 10

# See what's on remote
git fetch origin
git log origin/modular-micro-v27 --oneline -n 10
```

**Railway:**
- Check Railway logs for specific errors
- Verify environment variables are set correctly
- Make sure deployment completed successfully

---

**All fixes are in place!** Test locally first, then fix Railway config. 🚀
