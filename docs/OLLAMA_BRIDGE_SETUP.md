# 🔗 Ollama Bridge Setup - Connect Your Laptop to AI Counsel OS

## Quick Start

Your Ollama is already running! The system is configured to use `http://localhost:11434` by default.

### 1. Verify Connection

Run the test script:
```bash
node scripts/test-ollama-connection.js
```

This will:
- ✅ Check if Ollama is accessible
- ✅ List all your installed models
- ✅ Verify required models are available
- ✅ Test a sample API call

### 2. Start the Server

```bash
npm start
```

The server will automatically connect to your local Ollama instance.

### 3. Test the Open Source Council

```bash
# Test via API
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello, test the Open Source Council",
    "member": "ollama_deepseek_v3",
    "useOpenSourceCouncil": true
  }'
```

## Configuration

### Default Setup (Already Configured)

The system uses these defaults:
- **Endpoint**: `http://localhost:11434`
- **Auto-detection**: Automatically finds your Ollama instance

### Custom Configuration

If your Ollama is on a different port or machine:

**Option 1: Environment Variable**
```bash
export OLLAMA_ENDPOINT=http://localhost:11434
npm start
```

**Option 2: .env File**
```bash
# Create or edit .env file
echo "OLLAMA_ENDPOINT=http://localhost:11434" >> .env
npm start
```

**Option 3: Different Machine**
```bash
# If Ollama is on another machine on your network
export OLLAMA_ENDPOINT=http://192.168.1.100:11434
npm start
```

## Model Mapping

Your installed models are automatically mapped to COUNCIL_MEMBERS:

| Your Model Name | Council Key | Status |
|----------------|-------------|--------|
| `llama3.2:1b` | `ollama_llama` | ✅ |
| `phi3:mini` | `ollama_phi3` | ✅ |
| `deepseek-coder:latest` | `ollama_deepseek` | ✅ |
| `deepseek-coder-v2:latest` | `ollama_deepseek_coder_v2` | ✅ |
| `deepseek-v3:latest` | `ollama_deepseek_v3` | ✅ |
| `qwen2.5:72b-instruct` | `ollama_qwen_2_5_72b` | ✅ |

## Using the Open Source Council

### Method 1: Explicit Opt-in

```javascript
// In API calls
{
  "message": "Your prompt",
  "member": "ollama_deepseek_v3",
  "useOpenSourceCouncil": true
}
```

### Method 2: Cost Shutdown Mode

When `MAX_DAILY_SPEND=0`, the system automatically uses Open Source Council:

```bash
export MAX_DAILY_SPEND=0
npm start
```

### Method 3: Auto-Routing

The Open Source Council Router automatically selects the best model:

```bash
curl -X POST http://localhost:8080/api/v1/council/route \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Write a Python function",
    "taskType": "code_generation"
  }'
```

## Troubleshooting

### Ollama Not Found

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

### Connection Refused

```bash
# Check if port is correct
lsof -i :11434

# Check environment variable
echo $OLLAMA_ENDPOINT

# Test connection
curl http://localhost:11434/api/tags
```

### Model Not Found

The system will automatically:
1. Try the exact model name
2. Fall back to similar models
3. Use available models if exact match not found

### Slow Responses

Large models (70B+) are slow. Use smaller models for faster responses:
- `ollama_llama` (1B) - Fastest
- `ollama_phi3` (3.8B) - Fast
- `ollama_deepseek_coder_v2` (15.7B) - Medium
- `ollama_deepseek_v3` (varies) - Slower but better quality

## Verification

After setup, verify everything works:

```bash
# 1. Test connection
node scripts/test-ollama-connection.js

# 2. Test server
npm start

# 3. Test API call
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Test", "member": "ollama_llama"}'
```

## Next Steps

1. ✅ Verify connection (run test script)
2. ✅ Start server (`npm start`)
3. ✅ Test Open Source Council (make API call)
4. ✅ Monitor logs for any issues
5. ✅ Use the system!

## Advanced: Network Setup

If you want to access Ollama from another machine:

### Option 1: Expose Ollama (Not Recommended for Production)

```bash
# Make Ollama accessible on your network
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### Option 2: SSH Tunnel (Recommended)

```bash
# On the machine running AI Counsel OS
ssh -L 11434:localhost:11434 user@your-laptop-ip

# Then use localhost in the app
export OLLAMA_ENDPOINT=http://localhost:11434
```

### Option 3: VPN/Internal Network

If both machines are on the same network:
```bash
# Find your laptop's IP
ifconfig | grep "inet "

# Use that IP in the server
export OLLAMA_ENDPOINT=http://192.168.1.XXX:11434
```

---

**You're all set!** The Open Source Council should now be operational with your local Ollama instance.
