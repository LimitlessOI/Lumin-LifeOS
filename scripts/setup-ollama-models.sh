#!/bin/bash
# SYNOPSIS: Script — Setup Ollama Models.

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    OLLAMA MODELS SETUP SCRIPT                                    ║
# ║                    Downloads all open source models for Tier 0                  ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

set -e

echo "🚀 Setting up Ollama models for Lumin-LifeOS..."
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed!"
    echo ""
    echo "📦 Install Ollama first:"
    echo "   macOS:   brew install ollama"
    echo "   Linux:   curl -fsSL https://ollama.com/install.sh | sh"
    echo "   Windows: Download from https://ollama.com/download"
    echo ""
    exit 1
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "⚠️  Ollama is not running!"
    echo ""
    echo "🔄 Start Ollama in another terminal:"
    echo "   ollama serve"
    echo ""
    echo "Or run it in the background:"
    echo "   ollama serve &"
    echo ""
    read -p "Press Enter after starting Ollama, or Ctrl+C to exit..."
fi

echo "✅ Ollama is running!"
echo ""

# List of all models to download
MODELS=(
    # Lightweight & Fast
    "llama3.2:1b"
    "phi3:mini"
    
    # Code Generation Specialists
    "deepseek-coder:latest"
    "deepseek-coder-v2:latest"
    "deepseek-coder:33b"
    "qwen2.5-coder:32b-instruct"
    "codestral:latest"
    
    # Reasoning & Analysis Specialists
    "deepseek-v3:latest"
    "llama3.3:70b-instruct-q4_0"
    "qwen2.5:72b-q4_0"
    "gemma2:27b-it-q4_0"
)

echo "📥 Downloading ${#MODELS[@]} models..."
echo "   This may take a while depending on your internet speed."
echo "   Large models (70B, 72B) can take 30+ minutes each."
echo ""

# Track progress
SUCCESS=0
FAILED=0
SKIPPED=0

for model in "${MODELS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Model: $model"
    
    # Check if model already exists
    if ollama list | grep -q "$model"; then
        echo "   ✅ Already installed, skipping..."
        ((SKIPPED++))
        continue
    fi
    
    # Pull the model
    echo "   ⬇️  Downloading..."
    if ollama pull "$model"; then
        echo "   ✅ Successfully downloaded!"
        ((SUCCESS++))
    else
        echo "   ❌ Failed to download"
        ((FAILED++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   ✅ Downloaded: $SUCCESS"
echo "   ⏭️  Skipped (already installed): $SKIPPED"
echo "   ❌ Failed: $FAILED"
echo ""

# List all installed models
echo "📋 Installed models:"
ollama list
echo ""

# Test connection
echo "🧪 Testing Ollama connection..."
if curl -s http://localhost:11434/api/tags | grep -q "models"; then
    echo "✅ Ollama is working correctly!"
else
    echo "⚠️  Could not verify Ollama connection"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Make sure OLLAMA_ENDPOINT is set in your environment:"
echo "      export OLLAMA_ENDPOINT=http://localhost:11434"
echo ""
echo "   2. Test a model via API:"
echo "      curl -X POST http://localhost:11434/api/generate \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"model\": \"llama3.2:1b\", \"prompt\": \"Hello!\"}'"
echo ""
echo "   3. Or use the LifeOS API endpoint:"
echo "      curl -X POST http://localhost:8080/api/v1/chat \\"
echo "        -H 'x-command-key: MySecretKey2025LifeOS' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"message\": \"Hello!\", \"member\": \"ollama_llama\"}'"
echo ""
