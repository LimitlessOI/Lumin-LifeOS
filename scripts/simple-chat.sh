#!/bin/bash

# Simple chat script - just type and get responses

API_URL="http://localhost:8080/api/v1/chat"
API_KEY="MySecretKey2025LifeOS"

# Default model
MODEL="${1:-ollama_llama}"

echo "🗣️  AI Council Chat"
echo "Model: $MODEL"
echo "Type 'exit' to quit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

while true; do
  read -p "You: " message
  
  if [ "$message" = "exit" ]; then
    echo "Goodbye!"
    break
  fi
  
  if [ -z "$message" ]; then
    continue
  fi
  
  echo ""
  echo "🤖 Thinking..."
  
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "x-command-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"$message\",
      \"member\": \"$MODEL\"
    }")
  
  # Try to extract the response text (adjust based on your API response format)
  echo "$RESPONSE" | jq -r '.response // .message // .' 2>/dev/null || echo "$RESPONSE"
  echo ""
done

