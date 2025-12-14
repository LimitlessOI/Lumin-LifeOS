#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    CHECK OLLAMA MODEL DOWNLOAD STATUS                           ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

echo "📊 Checking Ollama model download status..."
echo ""

# Required models
REQUIRED_MODELS=(
    "llama3.2:1b"
    "phi3:mini"
    "deepseek-coder:latest"
    "deepseek-coder-v2:latest"
    "deepseek-coder:33b"
    "qwen2.5-coder:32b-instruct"
    "codestral:latest"
    "deepseek-v3:latest"
    "llama3.3:70b-instruct-q4_0"
    "qwen2.5:72b-q4_0"
    "gemma2:27b-it-q4_0"
)

echo "📋 Required models:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INSTALLED=0
MISSING=0

for model in "${REQUIRED_MODELS[@]}"; do
    if ollama list | grep -q "$model"; then
        SIZE=$(ollama list | grep "$model" | awk '{print $3}')
        echo "✅ $model ($SIZE)"
        ((INSTALLED++))
    else
        echo "⏳ $model (downloading...)"
        ((MISSING++))
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Status: $INSTALLED/${#REQUIRED_MODELS[@]} models installed"
echo ""

if [ $MISSING -gt 0 ]; then
    echo "⏳ Downloads in progress..."
    echo "   Large models (70B, 72B, 33B) can take several hours to download."
    echo "   Run this script again to check progress:"
    echo "   ./scripts/check-model-status.sh"
else
    echo "✅ All models installed!"
fi

echo ""
