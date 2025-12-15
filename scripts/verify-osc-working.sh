#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    VERIFY OPEN SOURCE COUNCIL IS WORKING                        ║
# ║                    This will show OSC activity in your server logs              ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

API_URL="http://localhost:8080/api/v1/chat"
API_KEY="MySecretKey2025LifeOS"

echo "🧪 VERIFYING OPEN SOURCE COUNCIL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 INSTRUCTIONS:"
echo "   1. Make sure your server is running (npm start)"
echo "   2. Watch your SERVER LOGS in another terminal"
echo "   3. This script will make test calls"
echo "   4. You should see OSC logs appear in your server console"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter when your server is running and you're watching the logs..."

echo ""
echo "🚀 Starting tests..."
echo ""

# Test 1: Simple OSC activation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Activating Open Source Council with explicit opt-in"
echo "Expected: '[OPEN SOURCE COUNCIL] ACTIVATED' in server logs"
echo ""

curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Say hello and confirm you are using the Open Source Council",
    "member": "ollama_llama",
    "useOpenSourceCouncil": true
  }' > /dev/null

echo "✅ Test 1 sent - Check your server logs for:"
echo "   - '[OPEN SOURCE COUNCIL] ACTIVATED'"
echo "   - '[OSC] Routing task'"
echo "   - '[OLLAMA] Calling local model'"
echo ""
sleep 3

# Test 2: Code generation with OSC
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Code generation with OSC"
echo "Expected: '[OSC] Detected task type: code_generation'"
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

echo "✅ Test 2 sent - Check your server logs for:"
echo "   - '[OSC] Detected task type: code_generation'"
echo "   - '[OSC] Executing with single model'"
echo ""
sleep 3

# Test 3: Direct Ollama call (bypasses OSC but shows Ollama works)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Direct Ollama call (shows Ollama connection works)"
echo "Expected: '[OLLAMA] Calling local model' and '[OLLAMA] SUCCESS'"
echo ""

curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quick test - respond with OK",
    "member": "ollama_llama"
  }' > /dev/null

echo "✅ Test 3 sent - Check your server logs for:"
echo "   - '[OLLAMA] Calling local model: llama3.2:1b'"
echo "   - '[OLLAMA] SUCCESS'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests completed!"
echo ""
echo "📋 WHAT TO LOOK FOR IN YOUR SERVER LOGS:"
echo ""
echo "✅ GOOD SIGNS (OSC is working):"
echo "   • '[OPEN SOURCE COUNCIL] INITIALIZED' (at startup)"
echo "   • '[OPEN SOURCE COUNCIL] ACTIVATED' (when OSC is used)"
echo "   • '[OSC] Routing task'"
echo "   • '[OSC] Detected task type'"
echo "   • '[OLLAMA] Calling local model'"
echo "   • '[OLLAMA] SUCCESS'"
echo "   • '[OPEN SOURCE COUNCIL] SUCCESS'"
echo ""
echo "❌ BAD SIGNS (OSC not working):"
echo "   • '⚠️ [OSC] Router failed'"
echo "   • 'Ollama HTTP error'"
echo "   • 'Connection refused'"
echo "   • No OSC logs at all"
echo ""
echo "If you see the ✅ logs, OSC is working! 🎉"
echo ""
