#!/bin/bash
# SYNOPSIS: Script — Monitor Ollama Downloads.

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    MONITOR OLLAMA MODEL DOWNLOADS                                ║
# ║                    Real-time download progress monitoring                        ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

echo "🔄 Monitoring Ollama Model Downloads..."
echo ""

REQUIRED_MODELS=(
    "deepseek-v3:latest"
    "llama3.3:70b-instruct-q4_0"
    "codestral:latest"
    "qwen2.5-coder:32b-instruct"
    "gemma2:27b-it-q4_0"
    "deepseek-coder:33b"
    "qwen2.5:72b-q4_0"
)

while true; do
    clear
    echo "╔══════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    OLLAMA DOWNLOAD MONITOR                                        ║"
    echo "║                    $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    INSTALLED=0
    DOWNLOADING=0
    MISSING=0
    
    for model in "${REQUIRED_MODELS[@]}"; do
        if ollama list 2>/dev/null | grep -q "$model"; then
            SIZE=$(ollama list | grep "$model" | awk '{print $3}')
            echo "✅ $model ($SIZE) - INSTALLED"
            ((INSTALLED++))
        elif ps aux | grep -q "ollama pull $model"; then
            echo "⏳ $model - DOWNLOADING..."
            ((DOWNLOADING++))
        else
            echo "❌ $model - NOT STARTED"
            ((MISSING++))
        fi
    done
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Status: ✅ $INSTALLED installed | ⏳ $DOWNLOADING downloading | ❌ $MISSING not started"
    
    ACTIVE=$(ps aux | grep "ollama pull" | grep -v grep | wc -l | tr -d ' ')
    echo "🔄 Active download processes: $ACTIVE"
    
    if [ "$DOWNLOADING" -eq 0 ] && [ "$MISSING" -eq 0 ]; then
        echo ""
        echo "🎉 All downloads complete!"
        break
    fi
    
    echo ""
    echo "Press Ctrl+C to stop monitoring (downloads will continue in background)"
    sleep 5
done
