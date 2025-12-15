# 🔧 Fix Git and Railway Issues

## Problem 1: Git Configuration

### Fix Git Identity

```bash
# Set your Git identity (required for commits)
git config --global user.name "Adam Hopkins"
git config --global user.email "your-email@example.com"

# Verify it worked
git config --global user.name
git config --global user.email
```

### Fix Push Rejection

```bash
# Fetch latest from remote
git fetch origin

# Pull with rebase to get remote changes
git pull --rebase origin modular-micro-v27

# If there are conflicts, resolve them, then:
git add .
git rebase --continue

# Push your changes
git push origin modular-micro-v27
```

### Clean Cursor Worktree Cache

```bash
# Close Cursor first, then:
rm -rf ~/.cursor/worktrees/Lumin-LifeOS

# Re-open Cursor
```

## Problem 2: Railway Production Issues

### Why OSC Fails on Railway

Railway **cannot** reach your local Ollama instance. The `ollama_*` models will always fail in production unless you:

1. **Host Ollama on a server Railway can reach**, OR
2. **Use cloud APIs in production** (Gemini, OpenAI, etc.)

### Quick Fix for Railway

**Option A: Use Cloud APIs in Production (Recommended)**

1. **Add API keys in Railway:**
   - Go to Railway dashboard → Your project → Variables
   - Add: `GEMINI_API_KEY=your-key-here`
   - Or: `OPENAI_API_KEY=your-key-here`

2. **Set a budget (even small):**
   - Add: `MAX_DAILY_SPEND=5` (or whatever you're comfortable with)
   - Add: `COST_SHUTDOWN_THRESHOLD=4` (slightly less than max)

3. **Disable Ollama models in production:**
   - Add: `OLLAMA_ENDPOINT=` (empty = disabled)
   - Or modify code to skip `ollama_*` models when `NODE_ENV=production`

**Option B: Keep OSC Local Only**

- Don't deploy the AI council features to Railway
- Keep them local-only
- Deploy only non-AI parts to Railway

### Fix Router Logic

The router shouldn't try to use Gemini if the key doesn't exist. This needs a code fix.

---

## 🎯 Priority: Test OSC Locally First

**Before worrying about Railway, verify OSC works locally:**

1. Start server: `npm start`
2. Run test: `./scripts/verify-osc-working.sh`
3. Watch server logs for OSC activity

If OSC works locally, then we can fix Railway separately.
