#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    EXAMPLE: How to Talk to AI Council                            ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

# Configuration
API_URL="http://localhost:8080/api/v1/chat"
API_KEY="MySecretKey2025LifeOS"

echo "🗣️  AI Council Chat Examples"
echo ""
echo "Choose an example to run:"
echo "1. Simple greeting"
echo "2. Code generation"
echo "3. General question"
echo "4. Complex reasoning"
echo "5. Custom message"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    MESSAGE="Hello! Introduce yourself and tell me what you can do."
    MEMBER="ollama_llama"
    ;;
  2)
    MESSAGE="Write a Python function to calculate the factorial of a number"
    MEMBER="ollama_deepseek_coder_v2"
    ;;
  3)
    MESSAGE="Explain how neural networks work in simple terms"
    MEMBER="ollama_llama"
    ;;
  4)
    MESSAGE="Analyze the trade-offs between using a monolithic vs microservices architecture for a startup"
    MEMBER="ollama_qwen_2_5_72b"
    ;;
  5)
    read -p "Enter your message: " MESSAGE
    echo ""
    echo "Available models:"
    echo "  - ollama_llama (fast, general)"
    echo "  - ollama_deepseek_coder_v2 (best for code)"
    echo "  - ollama_qwen_2_5_72b (complex reasoning)"
    echo "  - ollama_deepseek (general code)"
    read -p "Enter model name: " MEMBER
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📤 Sending message to $MEMBER..."
echo "Message: $MESSAGE"
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "x-command-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"$MESSAGE\",
    \"member\": \"$MEMBER\"
  }")

echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

