# 👀 How to See Open Source Council Working in Build Logs

## Quick Test

### Step 1: Start Your Server

```bash
cd /Users/adamhopkins/Projects/Lumin-LifeOS
npm start
```

**Look for this in startup logs:**
```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OPEN SOURCE COUNCIL] INITIALIZED                                              ║
║    Status: Ready to route tasks to local Ollama models                           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### Step 2: Make a Test Call

**In a new terminal**, run:

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello, test the Open Source Council",
    "member": "ollama_llama",
    "useOpenSourceCouncil": true
  }'
```

### Step 3: Watch Your Server Logs

**You should see these logs appear:**

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ 🆓 [OPEN SOURCE COUNCIL] ACTIVATED - Using local Ollama models (FREE)            ║
║    Reason: Explicit opt-in                                                       ║
╚══════════════════════════════════════════════════════════════════════════════════╝

🔄 [OSC] Routing task: Hello, test the Open Source Council...
    Task Type: auto-detect
    Complexity: SIMPLE (single model)
    Prompt Length: 40 chars

╔══════════════════════════════════════════════════════════════════════════════════╗
║ 🧠 [OPEN SOURCE COUNCIL ROUTER] Starting task routing                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝

📋 [OSC] Detected task type: general
    Specialization: General purpose tasks
    Primary models: ollama_llama, ollama_phi3
    Backup models: ollama_deepseek

⚡ [OSC] Task is SIMPLE (single model execution)

🎯 [OSC] Executing with single model (task: General purpose tasks)
    Available models: ollama_llama, ollama_phi3
    Trying primary models first...

    🔄 Trying ollama_llama...

🆓 [OLLAMA] Calling local model: llama3.2:1b
    Endpoint: http://localhost:11434
    Member: ollama_llama
    Prompt length: 150 chars

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OLLAMA] SUCCESS - Local model response received                            ║
║    Model: llama3.2:1b                                                           ║
║    Member: ollama_llama                                                         ║
║    Response Time: 1234ms                                                        ║
║    Response Length: 456 chars                                                  ║
║    Cost: $0.00 (FREE - local Ollama)                                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝

    ✅ ollama_llama succeeded in 1234ms

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OSC] SINGLE MODEL EXECUTION SUCCESS                                         ║
║    Model: ollama_llama                                                          ║
║    Task: General purpose tasks                                                 ║
║    Response Time: 1234ms                                                       ║
║    Response Length: 456 chars                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OPEN SOURCE COUNCIL] SUCCESS                                                  ║
║    Model: ollama_llama                                                          ║
║    Task Type: general                                                           ║
║    Response Time: 1234ms                                                       ║
║    Cost: $0.00 (FREE - local Ollama)                                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 🧪 Automated Test Script

Run this to see OSC working:

```bash
./scripts/test-osc-visible.sh
```

This makes multiple test calls and you'll see all the OSC logs in your server console.

## ✅ What Success Looks Like

**If you see these logs, OSC is working:**

1. ✅ `[OPEN SOURCE COUNCIL] INITIALIZED` - At startup
2. ✅ `[OPEN SOURCE COUNCIL] ACTIVATED` - When OSC is used
3. ✅ `[OSC] Routing task` - Task routing started
4. ✅ `[OSC] Detected task type` - Task type detected
5. ✅ `[OLLAMA] Calling local model` - Ollama API call
6. ✅ `[OLLAMA] SUCCESS` - Response received
7. ✅ `[OPEN SOURCE COUNCIL] SUCCESS` - Final success

## ❌ Troubleshooting

### If you DON'T see OSC logs:

1. **Check if OSC is initialized:**
   - Look for `[OPEN SOURCE COUNCIL] INITIALIZED` at startup
   - If missing, OSC didn't load

2. **Check if OSC is being activated:**
   - Make sure you're using `"useOpenSourceCouncil": true` in your API call
   - Or set `MAX_DAILY_SPEND=0` to force OSC

3. **Check Ollama connection:**
   - Run: `node scripts/test-ollama-connection.js`
   - Should show Ollama is accessible

4. **Check server is running:**
   - Make sure `npm start` completed successfully
   - Look for "✅ SYSTEM READY" message

## 📋 Full Log Guide

See `docs/OSC_LOGS_GUIDE.md` for complete log reference.

---

**Ready to test?** Start your server and run the test script! 🚀

