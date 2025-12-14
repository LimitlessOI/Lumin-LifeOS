# 🤖 How to Use Open Source Models

This guide shows you how to download, set up, and interact with the open source AI models in Lumin-LifeOS.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Installing Ollama](#installing-ollama)
3. [Downloading Models](#downloading-models)
4. [Interacting with Models](#interacting-with-models)
5. [Available Models](#available-models)
6. [API Examples](#api-examples)

---

## 🚀 Quick Start

```bash
# 1. Install Ollama
brew install ollama  # macOS
# OR
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# 2. Start Ollama
ollama serve

# 3. Download all models (in another terminal)
chmod +x scripts/setup-ollama-models.sh
./scripts/setup-ollama-models.sh

# 4. Test it
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hello!", "member": "ollama_llama"}'
```

---

## 📦 Installing Ollama

### macOS
```bash
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
Download from [ollama.com/download](https://ollama.com/download)

### Start Ollama
```bash
# Run in foreground
ollama serve

# OR run in background
ollama serve &
```

---

## 📥 Downloading Models

### Option 1: Automated Script (Recommended)

```bash
chmod +x scripts/setup-ollama-models.sh
./scripts/setup-ollama-models.sh
```

This script will:
- ✅ Check if Ollama is installed and running
- ✅ Download all 12 open source models
- ✅ Skip models you already have
- ✅ Show progress and summary

### Option 2: Manual Download

Download models individually:

```bash
# Lightweight models (fast, small)
ollama pull llama3.2:1b
ollama pull phi3:mini

# Code generation specialists
ollama pull deepseek-coder:latest
ollama pull deepseek-coder-v2:latest
ollama pull deepseek-coder:33b
ollama pull qwen2.5-coder:32b-instruct
ollama pull codestral:latest

# Reasoning specialists (larger, slower)
ollama pull deepseek-v3:latest
ollama pull llama3.3:70b-instruct-q4_0
ollama pull qwen2.5:72b-q4_0
ollama pull gemma2:27b-it-q4_0
```

### Check Installed Models

```bash
ollama list
```

---

## 💬 Interacting with Models

### Method 1: Via LifeOS API (Recommended)

The system automatically routes tasks to the best model based on task type.

#### Basic Chat
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write a hello world function in Python",
    "member": "ollama_deepseek_coder_v2"
  }'
```

#### Auto-Routing (Let system choose best model)
```bash
curl -X POST http://localhost:8080/api/v1/council/route \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Review this code for bugs",
    "taskType": "code_review",
    "riskLevel": "low"
  }'
```

#### Using Open Source Council Router
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Analyze this business opportunity",
    "useOpenSourceCouncil": true
  }'
```

### Method 2: Direct Ollama API

```bash
curl -X POST http://localhost:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "llama3.2:1b",
    "prompt": "Hello! How are you?",
    "stream": false
  }'
```

### Method 3: Ollama CLI

```bash
ollama run llama3.2:1b "Write a Python function to calculate factorial"
```

---

## 🤖 Available Models

### Lightweight & Fast (Good for quick tasks)

| Model Key | Model Name | Size | Best For |
|-----------|------------|------|----------|
| `ollama_llama` | Llama 3.2 1B | ~1GB | General tasks, quick responses |
| `ollama_phi3` | Phi-3 Mini | ~2GB | Light tasks, monitoring |

### Code Generation Specialists

| Model Key | Model Name | Size | Best For |
|-----------|------------|------|----------|
| `ollama_deepseek_coder_v2` | DeepSeek Coder V2 | ~4GB | Code generation, production code |
| `ollama_deepseek_coder_33b` | DeepSeek Coder 33B | ~20GB | Complex code, algorithms |
| `ollama_qwen_coder_32b` | Qwen2.5-Coder-32B | ~18GB | Production code, understanding |
| `ollama_codestral` | Mistral Codestral | ~15GB | Fast code snippets, IDE tasks |
| `ollama_deepseek` | DeepSeek Coder | ~4GB | General code tasks |

### Reasoning & Analysis Specialists

| Model Key | Model Name | Size | Best For |
|-----------|------------|------|----------|
| `ollama_deepseek_v3` | DeepSeek V3 | ~8GB | Complex reasoning, math, strategy |
| `ollama_llama_3_3_70b` | Llama 3.3 70B | ~40GB | High-quality reasoning, multilingual |
| `ollama_qwen_2_5_72b` | Qwen 2.5 72B | ~40GB | Research, analysis, math |
| `ollama_gemma_2_27b` | Gemma 2 27B | ~15GB | Balanced reasoning, general tasks |

---

## 📡 API Examples

### Example 1: Code Generation

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Create a REST API endpoint in Node.js that returns user data",
    "member": "ollama_deepseek_coder_v2"
  }'
```

**Response:**
```json
{
  "response": "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/users/:id', async (req, res) => {\n  // ... code ...\n})",
  "model": "ollama_deepseek_coder_v2",
  "cost": 0
}
```

### Example 2: Code Review

```bash
curl -X POST http://localhost:8080/api/v1/council/route \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Review this code for security issues:\n\nfunction login(username, password) {\n  const query = `SELECT * FROM users WHERE username = ${username}`;\n  return db.query(query);\n}",
    "taskType": "code_review",
    "riskLevel": "high"
  }'
```

### Example 3: Complex Reasoning

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Analyze the pros and cons of microservices vs monolith architecture for a startup",
    "member": "ollama_deepseek_v3"
  }'
```

### Example 4: Auto-Routing with Consensus

For complex tasks, the system can use multiple models and reach consensus:

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Design a scalable database schema for a social media platform",
    "useOpenSourceCouncil": true,
    "requireConsensus": true,
    "complexity": "complex"
  }'
```

**Response includes consensus analysis:**
```json
{
  "response": "...",
  "model": "ollama_deepseek_v3",
  "consensus": true,
  "consensusResults": [
    {"model": "ollama_deepseek_v3", "response": "..."},
    {"model": "ollama_llama_3_3_70b", "response": "..."}
  ],
  "consensusAnalysis": {
    "totalModels": 2,
    "isConsistent": true,
    "selectedModel": "ollama_deepseek_v3"
  }
}
```

---

## 🎯 Task Type Auto-Detection

The Open Source Council Router automatically detects task types:

- **Code Generation**: Detects keywords like "code", "function", "implement"
- **Code Review**: Detects "review", "debug", "analyze code"
- **Complex Reasoning**: Detects "analyze", "strategy", "decision", "complex"
- **Math/Research**: Detects "calculate", "math", "research", "study"
- **Quick Tasks**: Detects "quick", "simple", "brief", "monitor"

You can also specify manually:

```bash
curl -X POST http://localhost:8080/api/v1/council/route \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Your task here",
    "taskType": "code_generation",  # or code_review, complex_reasoning, etc.
    "complexity": "medium"  # simple, medium, complex, critical
  }'
```

---

## 🔧 Configuration

### Environment Variables

Set in your `.env` or Railway environment:

```bash
# Ollama endpoint (default: http://localhost:11434)
OLLAMA_ENDPOINT=http://localhost:11434

# For Railway deployment
OLLAMA_ENDPOINT=http://ollama-service:11434
```

### Model Selection

The system automatically selects the best model, but you can override:

```javascript
// In your code
const response = await callCouncilMember("ollama_deepseek_coder_v2", prompt);
```

---

## 🐛 Troubleshooting

### Ollama not found
```bash
# Check if installed
which ollama

# Install if missing
brew install ollama  # macOS
curl -fsSL https://ollama.com/install.sh | sh  # Linux
```

### Ollama not running
```bash
# Check if running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Model not found
```bash
# List installed models
ollama list

# Pull missing model
ollama pull <model-name>
```

### Connection refused
```bash
# Check OLLAMA_ENDPOINT
echo $OLLAMA_ENDPOINT

# Test connection
curl http://localhost:11434/api/tags
```

---

## 💡 Tips

1. **Start with lightweight models**: Use `ollama_llama` or `ollama_phi3` for quick tasks
2. **Use code specialists for coding**: `ollama_deepseek_coder_v2` is best for code generation
3. **Large models for complex tasks**: Use 70B models only when needed (they're slow)
4. **Let the router decide**: Use auto-routing for best results
5. **Monitor costs**: All Ollama models are FREE (local) - $0 cost!

---

## 📚 More Resources

- [Ollama Documentation](https://ollama.com/docs)
- [Model Cards](https://ollama.com/library)
- [LifeOS API Documentation](./API_DOCUMENTATION.md)

---

**Need help?** Check the logs:
```bash
# Server logs
tail -f logs/server.log

# Ollama logs
ollama logs
```
