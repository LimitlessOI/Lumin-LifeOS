<!-- SYNOPSIS: 📋 Open Source Council - What to Look For in Logs -->

# 📋 Open Source Council - What to Look For in Logs

## ✅ Startup Logs

When the server starts, you should see:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OPEN SOURCE COUNCIL] INITIALIZED                                              ║
║    Status: Ready to route tasks to local Ollama models                           ║
║    Activation: Cost shutdown OR explicit opt-in (useOpenSourceCouncil: true)    ║
║    Models: Connected to Ollama at http://localhost:11434                        ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

**If you see this:** ✅ Open Source Council is initialized and ready!

## 🔄 Activation Logs

When OSC is activated for a task, you'll see:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ 🆓 [OPEN SOURCE COUNCIL] ACTIVATED - Using local Ollama models (FREE)            ║
║    Reason: Cost shutdown mode / Explicit opt-in                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

🔄 [OSC] Routing task: Your task description here...
    Task Type: code_generation
    Complexity: SIMPLE (single model) / COMPLEX (will use consensus)
    Prompt Length: 150 chars
```

**If you see this:** ✅ OSC is routing your task!

## 🧠 Routing Logs

When OSC routes a task:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ 🧠 [OPEN SOURCE COUNCIL ROUTER] Starting task routing                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝

📋 [OSC] Detected task type: code_generation
    Specialization: Code generation tasks
    Primary models: ollama_deepseek_coder_v2, ollama_deepseek_coder_33b
    Backup models: ollama_qwen_coder_32b, ollama_codestral, ollama_deepseek

⚡ [OSC] Task is SIMPLE (single model execution)
```

**If you see this:** ✅ OSC detected your task type and selected models!

## 🎯 Execution Logs

### Single Model Execution:

```
🎯 [OSC] Executing with single model (task: Code generation tasks)
    Available models: ollama_deepseek_coder_v2, ollama_deepseek_coder_33b
    Trying primary models first...

    🔄 Trying ollama_deepseek_coder_v2...
    ✅ ollama_deepseek_coder_v2 succeeded in 1234ms

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OSC] SINGLE MODEL EXECUTION SUCCESS                                         ║
║    Model: ollama_deepseek_coder_v2                                              ║
║    Task: Code generation tasks                                                  ║
║    Response Time: 1234ms                                                        ║
║    Response Length: 456 chars                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### Consensus Execution:

```
🔄 [OSC] Executing CONSENSUS with 3 models:
    Models: ollama_deepseek_v3, ollama_qwen_2_5_72b, ollama_llama_3_3_70b
    Task: Complex reasoning and strategic decisions
    Running in parallel...

    🔄 [CONSENSUS] ollama_deepseek_v3 processing...
    ✅ [CONSENSUS] ollama_deepseek_v3 completed in 2345ms
    🔄 [CONSENSUS] ollama_qwen_2_5_72b processing...
    ✅ [CONSENSUS] ollama_qwen_2_5_72b completed in 3456ms

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OSC] CONSENSUS EXECUTION COMPLETE                                             ║
║    Successful Models: 2/3                                                       ║
║    Winning Model: ollama_deepseek_v3                                            ║
║    Task: Complex reasoning and strategic decisions                              ║
║    Total Time: 3456ms                                                           ║
║    Response Length: 789 chars                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 🆓 Ollama Call Logs

When OSC calls Ollama:

```
🆓 [OLLAMA] Calling local model: deepseek-coder-v2:latest
    Endpoint: http://localhost:11434
    Member: ollama_deepseek_coder_v2
    Prompt length: 150 chars

╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OLLAMA] SUCCESS - Local model response received                            ║
║    Model: deepseek-coder-v2:latest                                              ║
║    Member: ollama_deepseek_coder_v2                                            ║
║    Response Time: 1234ms                                                       ║
║    Response Length: 456 chars                                                  ║
║    Cost: $0.00 (FREE - local Ollama)                                           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## ✅ Final Success Logs

When OSC completes successfully:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ ✅ [OPEN SOURCE COUNCIL] SUCCESS                                                  ║
║    Model: ollama_deepseek_coder_v2                                              ║
║    Task Type: code_generation                                                   ║
║    Response Time: 1234ms                                                        ║
║    Cost: $0.00 (FREE - local Ollama)                                            ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## ❌ Error Logs

If something goes wrong:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ ❌ [OPEN SOURCE COUNCIL] ERROR                                                    ║
║    Error: All models failed for task type: code_generation                       ║
║    Falling back to standard failover...                                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 🧪 How to Test

Run the test script to see OSC in action:

```bash
./scripts/test-osc-visible.sh
```

This will make API calls and you'll see all the logs above in your server console!

## 📊 Summary

**What you should see:**
1. ✅ Initialization log at startup
2. ✅ Activation log when OSC is used
3. ✅ Routing logs showing task detection
4. ✅ Execution logs showing model selection
5. ✅ Ollama call logs showing API calls
6. ✅ Success logs showing completion

**If you see all of these:** 🎉 Open Source Council is working perfectly!

