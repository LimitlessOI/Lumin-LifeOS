# 🚀 Quick Start: Connect Your Ollama to AI Counsel OS

## ✅ Status Check

Your Ollama is **already connected**! The system uses `http://localhost:11434` by default.

**Test Results:**
- ✅ Ollama is running
- ✅ 7/11 required models available
- ✅ System ready to use

## 🎯 3-Step Setup

### Step 1: Verify Connection (Already Done!)

```bash
node scripts/test-ollama-connection.js
```

**Result:** ✅ Connection successful!

### Step 2: Start the Server

```bash
cd /Users/adamhopkins/Projects/Lumin-LifeOS
npm start
```

Wait for: `✅ SYSTEM READY`

### Step 3: Test the Open Source Council

```bash
# Test with a simple model
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello, test the Open Source Council",
    "member": "ollama_llama"
  }'
```

## 📋 Available Models

You have these models ready to use:

| Model | Council Key | Status |
|-------|-------------|--------|
| `llama3.2:1b` | `ollama_llama` | ✅ Ready |
| `phi3:mini` | `ollama_phi3` | ✅ Ready |
| `deepseek-coder:latest` | `ollama_deepseek` | ✅ Ready |
| `deepseek-coder-v2:latest` | `ollama_deepseek_coder_v2` | ✅ Ready |
| `qwen2.5:72b-instruct` | `ollama_qwen_2_5_72b` | ✅ Ready |

## 🔧 Using the Open Source Council

### Method 1: Direct Model Selection

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write a Python function to calculate factorial",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Method 2: Auto-Routing (Best Model for Task)

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Review this code for bugs",
    "member": "ollama_deepseek",
    "useOpenSourceCouncil": true
  }'
```

### Method 3: Cost Shutdown Mode (Auto-Use OSC)

```bash
# Set spending to $0 to force Open Source Council
export MAX_DAILY_SPEND=0
npm start
```

## ⚠️ Missing Models (Optional)

These models are not required but can be added:

```bash
# Install missing models (optional)
ollama pull codestral:latest
ollama pull deepseek-v3:latest
ollama pull llama3.3:70b-instruct-q4_0
ollama pull gemma2:27b-it-q4_0
```

**Note:** The system works fine without these. It will use available models automatically.

## 🎉 You're Ready!

The Open Source Council is now operational with your local Ollama instance!

**Next Steps:**
1. ✅ Connection verified
2. ✅ Start server: `npm start`
3. ✅ Test API calls
4. ✅ Use the system!

## 📚 More Information

- Full setup guide: `docs/OLLAMA_BRIDGE_SETUP.md`
- Model documentation: `docs/HOW_TO_USE_OPEN_SOURCE_MODELS.md`
- Troubleshooting: See setup guide

---

**Everything is connected and ready to go!** 🚀
