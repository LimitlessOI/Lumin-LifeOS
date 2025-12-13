#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    CHECK OLLAMA MODEL DOWNLOAD STATUS                            ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

echo "📊 Checking Ollama model download status..."
echo ""

# Required models for Video Editing Council + Open Source Council
REQUIRED_MODELS=(
    # Already installed
    "llama3.2:1b"
    "phi3:mini"
    "deepseek-coder:latest"
    "deepseek-coder-v2:latest"
    
    # Currently downloading
    "deepseek-v3:latest"
    "llama3.3:70b-instruct-q4_0"
    "codestral:latest"
    "qwen2.5-coder:32b-instruct"
    "gemma2:27b-it-q4_0"
    "deepseek-coder:33b"
    "qwen2.5:72b-q4_0"
)

echo "📋 Model Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INSTALLED=0
DOWNLOADING=0
MISSING=0

for model in "${REQUIRED_MODELS[@]}"; do
    if ollama list | grep -q "$model"; then
        SIZE=$(ollama list | grep "$model" | awk '{print $3}')
        echo "✅ $model ($SIZE) - INSTALLED"
        ((INSTALLED++))
    else
        # Check if download is in progress
        if ps aux | grep -q "ollama pull $model"; then
            echo "⏳ $model - DOWNLOADING..."
            ((DOWNLOADING++))
        else
            echo "❌ $model - NOT STARTED"
            ((MISSING++))
        fi
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   ✅ Installed: $INSTALLED"
echo "   ⏳ Downloading: $DOWNLOADING"
echo "   ❌ Not started: $MISSING"
echo ""

# Check active downloads
ACTIVE_DOWNLOADS=$(ps aux | grep "ollama pull" | grep -v grep | wc -l | tr -d ' ')
if [ "$ACTIVE_DOWNLOADS" -gt 0 ]; then
    echo "🔄 Active downloads: $ACTIVE_DOWNLOADS"
    echo ""
    echo "💡 Downloads are running in the background."
    echo "   Large models (70B, 72B, 33B) can take 1-6 hours each."
    echo "   Run this script again to check progress:"
    echo "   ./scripts/check-ollama-downloads.sh"
else
    if [ "$MISSING" -gt 0 ]; then
        echo "⚠️  Some downloads may have stopped."
        echo "   Restart downloads with: ./scripts/setup-ollama-models.sh"
    else
        echo "✅ All downloads complete!"
    fi
fi

echo ""
