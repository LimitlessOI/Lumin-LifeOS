# 🚀 Quick Start: Open Source Models

## 3-Step Setup

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Start Ollama
```bash
ollama serve
```

### 3. Download Models
```bash
./scripts/setup-ollama-models.sh
```

## Test It

```bash
# Test models directly
node scripts/test-ollama-models.js

# Test via LifeOS API
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Hello!", "member": "ollama_llama"}'
```

## Use It

### Via API
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write a Python function to calculate factorial",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Auto-Routing (Best Model for Task)
```bash
curl -X POST http://localhost:8080/api/v1/council/route \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "Review this code for bugs",
    "taskType": "code_review"
  }'
```

## Available Models

**Quick Tasks:**
- `ollama_llama` - Llama 3.2 1B (fast, general)
- `ollama_phi3` - Phi-3 Mini (very fast, simple tasks)

**Code Generation:**
- `ollama_deepseek_coder_v2` - Best for code
- `ollama_deepseek_coder_33b` - Complex code
- `ollama_qwen_coder_32b` - Production code
- `ollama_codestral` - Fast code snippets

**Reasoning:**
- `ollama_deepseek_v3` - Complex reasoning
- `ollama_llama_3_3_70b` - High quality (slow)
- `ollama_qwen_2_5_72b` - Research & analysis

## Full Documentation

See [HOW_TO_USE_OPEN_SOURCE_MODELS.md](./HOW_TO_USE_OPEN_SOURCE_MODELS.md) for complete guide.
