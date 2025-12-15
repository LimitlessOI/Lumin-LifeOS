#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    TEST OPEN SOURCE COUNCIL - VISIBLE IN LOGS                    ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

API_URL="http://localhost:8080/api/v1/chat"
API_KEY="MySecretKey2025LifeOS"

echo "🧪 Testing Open Source Council - Watch your server logs!"
echo ""
echo "This will make API calls that will show OSC activity in your build logs."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Simple task with OSC opt-in
echo "📝 Test 1: Simple task with OSC opt-in"
echo "   Expected log: '[OPEN SOURCE COUNCIL] ACTIVATED'"
echo ""

curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello and introduce yourself",
    "member": "ollama_llama",
    "useOpenSourceCouncil": true
  }' > /dev/null

echo "   ✅ Request sent - check server logs for OSC activation"
echo ""
sleep 2

# Test 2: Code generation with OSC
echo "📝 Test 2: Code generation with OSC"
echo "   Expected log: '[OSC] Routing task' and model selection"
echo ""

curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Write a simple Python function to add two numbers",
    "member": "ollama_deepseek_coder_v2",
    "useOpenSourceCouncil": true,
    "taskType": "code_generation"
  }' > /dev/null

echo "   ✅ Request sent - check server logs for OSC routing"
echo ""
sleep 2

# Test 3: Complex task (should trigger consensus)
echo "📝 Test 3: Complex task (should trigger consensus)"
echo "   Expected log: '[OSC] Executing CONSENSUS'"
echo ""

curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze the pros and cons of microservices architecture in detail with examples",
    "member": "ollama_qwen_2_5_72b",
    "useOpenSourceCouncil": true,
    "complexity": "complex",
    "requireConsensus": true
  }' > /dev/null

echo "   ✅ Request sent - check server logs for consensus execution"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests sent!"
echo ""
echo "📋 What to look for in your server logs:"
echo "   1. '[OPEN SOURCE COUNCIL] ACTIVATED' - OSC is being used"
echo "   2. '[OSC] Routing task' - Task routing started"
echo "   3. '[OSC] Detected task type' - Task type detection"
echo "   4. '[OLLAMA] Calling local model' - Ollama API calls"
echo "   5. '[OLLAMA] SUCCESS' - Successful responses"
echo "   6. '[OSC] Executing CONSENSUS' - Multiple models voting"
echo ""
echo "If you see these logs, the Open Source Council is working! 🎉"
echo ""

