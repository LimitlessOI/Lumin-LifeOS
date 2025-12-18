# 🚀 Quick Start: Fix Everything

## ✅ Code Fixes Applied

1. ✅ **Model Selection** - No longer tries Gemini without API key
2. ✅ **Production Detection** - Automatically detects Railway/production
3. ✅ **Ollama Disabled in Production** - OSC skipped when `NODE_ENV=production`

## 🛠️ Step 1: Fix Git (2 minutes)

```bash
# Set your identity
git config --global user.name "Adam Hopkins"
git config --global user.email "your-email@example.com"

# Fix push
git fetch origin
git pull --rebase origin modular-micro-v27
git push origin modular-micro-v27

# Clean Cursor cache (close Cursor first)
rm -rf ~/.cursor/worktrees/Lumin-LifeOS
```

## 🧪 Step 2: Test OSC Locally (1 minute)

```bash
# Terminal 1: Start server
npm start

# Terminal 2: Test OSC
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Test OSC",
    "member": "ollama_llama",
    "useOpenSourceCouncil": true
  }'
```

**Look for in server logs:**
- ✅ `[OPEN SOURCE COUNCIL] INITIALIZED`
- ✅ `[OPEN SOURCE COUNCIL] ACTIVATED`
- ✅ `[OLLAMA] SUCCESS`

## 🚂 Step 3: Fix Railway (2 minutes)

**Go to Railway → Variables tab, add:**

```
GEMINI_API_KEY=your-key-here
MAX_DAILY_SPEND=5
COST_SHUTDOWN_THRESHOLD=4
```

**That's it!** The code now:
- ✅ Detects production automatically
- ✅ Skips Ollama in production
- ✅ Uses cloud APIs when keys are available

---

**Done!** Test locally first, then Railway will work automatically. 🎉
