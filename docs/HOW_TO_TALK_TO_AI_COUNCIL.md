# 🗣️ How to Talk to the AI Council

## Quick Start

### Method 1: Direct API Call (Easiest)

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello, write me a Python function to calculate fibonacci numbers",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Method 2: Using the CLI

```bash
# If CLI is set up
node apps/cli/index.js chat "Write a function to sort an array"
```

## 📋 Available Models (Your Council Members)

### Fast & General Purpose
- **`ollama_llama`** - Llama 3.2 1B (fastest, good for simple tasks)
- **`ollama_phi3`** - Phi-3 Mini (very fast, simple questions)

### Code Generation (Best for Programming)
- **`ollama_deepseek_coder_v2`** - Best for writing code
- **`ollama_deepseek_coder_33b`** - Complex code, better quality
- **`ollama_qwen_coder_32b`** - Production-ready code
- **`ollama_deepseek`** - General code tasks

### Reasoning & Analysis
- **`ollama_qwen_2_5_72b`** - Complex reasoning, research
- **`ollama_deepseek_v3`** - Best reasoning (if installed)

## 🎯 Examples

### Example 1: Code Generation

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write a Python function that takes a list of numbers and returns the sum of all even numbers",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Example 2: General Question

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Explain how machine learning works in simple terms",
    "member": "ollama_llama"
  }'
```

### Example 3: Complex Reasoning

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Analyze the pros and cons of using microservices architecture",
    "member": "ollama_qwen_2_5_72b"
  }'
```

### Example 4: Use Open Source Council Auto-Routing

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Review this code for bugs: function add(a,b) { return a+b }",
    "member": "ollama_deepseek",
    "useOpenSourceCouncil": true
  }'
```

## 🔧 Advanced Options

### Option 1: Specify Task Type

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Your task here",
    "member": "ollama_deepseek_coder_v2",
    "taskType": "code_generation",
    "useOpenSourceCouncil": true
  }'
```

### Option 2: Require Consensus (Multiple Models Vote)

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Is this a good business idea: [describe idea]",
    "member": "ollama_deepseek_v3",
    "useOpenSourceCouncil": true,
    "requireConsensus": true,
    "consensusThreshold": 3
  }'
```

### Option 3: Set Complexity Level

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Complex task here",
    "member": "ollama_deepseek_v3",
    "complexity": "complex",
    "useOpenSourceCouncil": true
  }'
```

## 📝 Task Types Available

- `code_generation` - Writing code
- `code_review` - Reviewing code
- `complex_reasoning` - Complex analysis
- `math_research` - Math problems
- `quick_tasks` - Simple questions
- `fast_code` - Quick code snippets
- `general` - General purpose

## 🎨 Using Different Models for Different Tasks

### For Code:
```bash
"member": "ollama_deepseek_coder_v2"
```

### For Fast Responses:
```bash
"member": "ollama_llama"
```

### For Complex Reasoning:
```bash
"member": "ollama_qwen_2_5_72b"
```

### For Best Quality (if installed):
```bash
"member": "ollama_deepseek_v3"
```

## 💡 Tips

1. **Be Specific**: The more details you give, the better the response
2. **Choose the Right Model**: Use code models for code, reasoning models for analysis
3. **Use Auto-Routing**: Set `useOpenSourceCouncil: true` to let the system choose
4. **For Complex Tasks**: Use `requireConsensus: true` to get multiple opinions

## 🔍 Check What Models Are Available

```bash
# Test connection and see available models
node scripts/test-ollama-connection.js
```

## 📚 More Examples

### Debugging Code
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Why is this code failing: [paste your code]",
    "member": "ollama_deepseek_coder_v2",
    "taskType": "code_review"
  }'
```

### Writing Documentation
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write documentation for this function: [function code]",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Brainstorming
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Give me 10 ideas for a new mobile app",
    "member": "ollama_qwen_2_5_72b"
  }'
```

---

**Ready to start?** Just start your server (`npm start`) and make your first API call!

