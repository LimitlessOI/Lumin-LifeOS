<!-- SYNOPSIS: 🚀 Quick Start: Talking to Your AI Council -->

# 🚀 Quick Start: Talking to Your AI Council

## The Simplest Way

### 1. Start Your Server

```bash
cd /Users/adamhopkins/Projects/Lumin-LifeOS
npm start
```

Wait for: `✅ SYSTEM READY`

### 2. Send a Message

Open a **new terminal** and run:

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Hello! What can you do?",
    "member": "ollama_llama"
  }'
```

## 📝 Basic Format

Every message needs:
- **`message`**: What you want to say or ask
- **`member`**: Which AI model to use

## 🎯 Common Examples

### Ask a Question
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Explain how recursion works",
    "member": "ollama_llama"
  }'
```

### Write Code
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Write a Python function to reverse a string",
    "member": "ollama_deepseek_coder_v2"
  }'
```

### Get Advice
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "What are the best practices for API design?",
    "member": "ollama_qwen_2_5_72b"
  }'
```

## 🤖 Which Model to Use?

| Task | Use This Model |
|------|----------------|
| Quick questions | `ollama_llama` |
| Writing code | `ollama_deepseek_coder_v2` |
| Complex code | `ollama_deepseek_coder_33b` |
| Deep thinking | `ollama_qwen_2_5_72b` |
| Fast code snippets | `ollama_deepseek` |

## 💡 Pro Tips

### Tip 1: Be Specific
❌ "Write code"  
✅ "Write a Python function that takes a list and returns only even numbers"

### Tip 2: Give Context
❌ "Fix this"  
✅ "This code is throwing an error: [paste code]. Fix it."

### Tip 3: Ask for Format
✅ "Write a function and include unit tests"  
✅ "Explain in bullet points"  
✅ "Give me 3 examples"

## 🔧 Advanced: Using Options

### Use Open Source Council Auto-Routing
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Your task here",
    "member": "ollama_deepseek",
    "useOpenSourceCouncil": true
  }'
```

### Specify Task Type
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Review this code for bugs",
    "member": "ollama_deepseek_coder_v2",
    "taskType": "code_review"
  }'
```

## 🎨 Using the Example Script

I created a helper script for you:

```bash
./scripts/chat-example.sh
```

This will give you interactive examples to try!

## 📚 Full Documentation

For more details, see:
- `docs/HOW_TO_TALK_TO_AI_COUNCIL.md` - Complete guide
- `docs/OLLAMA_BRIDGE_SETUP.md` - Setup details

---

**Ready?** Start your server and send your first message! 🚀

