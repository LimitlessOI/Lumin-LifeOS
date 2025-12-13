#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════════╗
# ║                    VIDEO EDITING COUNCIL SETUP                                   ║
# ║                    Install all open source video tools                          ║
# ╚══════════════════════════════════════════════════════════════════════════════════╝

set -e

echo "🎬 Setting up Open Source Video Editing Council..."
echo ""

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is optimized for macOS. Some commands may differ on Linux."
    echo ""
fi

# Step 1: Install FFmpeg
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Installing FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg already installed: $(ffmpeg -version | head -1)"
else
    echo "⬇️  Installing FFmpeg..."
    if command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo "❌ Homebrew not found. Install FFmpeg manually:"
        echo "   macOS: brew install ffmpeg"
        echo "   Linux: sudo apt install ffmpeg"
        exit 1
    fi
fi

# Step 2: Install Python packages
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 2: Installing Python packages..."

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found. Install Python 3.8+ first."
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)

echo "Using Python: $($PYTHON_CMD --version)"

# Core video editing packages
echo "⬇️  Installing core packages..."
$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install moviepy opencv-python

# AI packages
echo "⬇️  Installing AI packages..."
$PYTHON_CMD -m pip install openai-whisper TTS

# Optional: For better performance
echo "⬇️  Installing optional performance packages..."
$PYTHON_CMD -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu 2>/dev/null || echo "⚠️  GPU packages skipped (using CPU)"

# Step 3: Install AnimateDiff (optional)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 3: Setting up AnimateDiff (optional)..."
read -p "Install AnimateDiff? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ANIMATEDIFF_DIR="$HOME/AnimateDiff"
    if [ -d "$ANIMATEDIFF_DIR" ]; then
        echo "✅ AnimateDiff already exists at $ANIMATEDIFF_DIR"
    else
        echo "⬇️  Cloning AnimateDiff..."
        git clone https://github.com/guoyww/AnimateDiff.git "$ANIMATEDIFF_DIR" || {
            echo "⚠️  Git clone failed. Install manually:"
            echo "   git clone https://github.com/guoyww/AnimateDiff.git"
        }
        if [ -d "$ANIMATEDIFF_DIR" ]; then
            cd "$ANIMATEDIFF_DIR"
            $PYTHON_CMD -m pip install -r requirements.txt
            echo "✅ AnimateDiff installed"
        fi
    fi
fi

# Step 4: Install ComfyUI (for Stable Video Diffusion)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 4: Setting up ComfyUI (for Stable Video Diffusion) (optional)..."
read -p "Install ComfyUI? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    COMFYUI_DIR="$HOME/ComfyUI"
    if [ -d "$COMFYUI_DIR" ]; then
        echo "✅ ComfyUI already exists at $COMFYUI_DIR"
    else
        echo "⬇️  Cloning ComfyUI..."
        git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR" || {
            echo "⚠️  Git clone failed. Install manually:"
            echo "   git clone https://github.com/comfyanonymous/ComfyUI.git"
        }
        if [ -d "$COMFYUI_DIR" ]; then
            cd "$COMFYUI_DIR"
            $PYTHON_CMD -m pip install -r requirements.txt
            echo "✅ ComfyUI installed"
            echo ""
            echo "💡 To start ComfyUI:"
            echo "   cd $COMFYUI_DIR"
            echo "   python main.py"
        fi
    fi
fi

# Step 5: Verify installations
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 5: Verifying installations..."

VERIFIED=0
FAILED=0

# Check FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg: OK"
    ((VERIFIED++))
else
    echo "❌ FFmpeg: Not found"
    ((FAILED++))
fi

# Check Python packages
if $PYTHON_CMD -c "import moviepy" 2>/dev/null; then
    echo "✅ MoviePy: OK"
    ((VERIFIED++))
else
    echo "❌ MoviePy: Not found"
    ((FAILED++))
fi

if $PYTHON_CMD -c "import cv2" 2>/dev/null; then
    echo "✅ OpenCV: OK"
    ((VERIFIED++))
else
    echo "❌ OpenCV: Not found"
    ((FAILED++))
fi

if $PYTHON_CMD -c "import whisper" 2>/dev/null; then
    echo "✅ Whisper: OK"
    ((VERIFIED++))
else
    echo "❌ Whisper: Not found"
    ((FAILED++))
fi

if $PYTHON_CMD -c "import TTS" 2>/dev/null; then
    echo "✅ Coqui TTS: OK"
    ((VERIFIED++))
else
    echo "❌ Coqui TTS: Not found"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary: $VERIFIED tools verified"
if [ $FAILED -gt 0 ]; then
    echo "⚠️  $FAILED tools failed - check errors above"
fi

# Step 6: Create environment file
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Step 6: Creating environment configuration..."

ENV_FILE=".env.video-editing"
cat > "$ENV_FILE" << EOF
# Video Editing Council Configuration
# Add these to your main .env file

# ComfyUI (for Stable Video Diffusion)
COMFYUI_ENDPOINT=http://localhost:8188

# Stable Video Diffusion
SVD_ENDPOINT=http://localhost:7860

# AnimateDiff
ANIMATEDIFF_PATH=$HOME/AnimateDiff

# Python
PYTHON_CMD=$PYTHON_CMD
EOF

echo "✅ Configuration saved to $ENV_FILE"
echo "   Add these variables to your main .env file"

# Step 7: Test script
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Step 7: Creating test script..."

TEST_SCRIPT="scripts/test-video-council.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
echo "🧪 Testing Video Editing Council..."

python3 << 'PYTHON'
import sys
import importlib

tools = {
    'moviepy': 'moviepy',
    'opencv': 'cv2',
    'whisper': 'whisper',
    'coqui_tts': 'TTS',
}

print("Testing Python packages...")
for name, module in tools.items():
    try:
        importlib.import_module(module)
        print(f"✅ {name}: OK")
    except ImportError:
        print(f"❌ {name}: Not found")

# Test FFmpeg
import subprocess
try:
    result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ FFmpeg: OK")
    else:
        print("❌ FFmpeg: Not working")
except FileNotFoundError:
    print("❌ FFmpeg: Not found")

PYTHON

echo ""
echo "✅ Test complete!"
EOF

chmod +x "$TEST_SCRIPT"
echo "✅ Test script created: $TEST_SCRIPT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "   1. Review configuration: cat $ENV_FILE"
echo "   2. Add to main .env file"
echo "   3. Test installation: ./$TEST_SCRIPT"
echo "   4. Start using: See docs/VIDEO_EDITING_COUNCIL_PLAN.md"
echo ""
echo "💡 To use the Video Editing Council:"
echo "   const { VideoEditingCouncil } = await import('./core/video-editing-council.js');"
echo "   const council = new VideoEditingCouncil(pool, callCouncilMember);"
echo "   const result = await council.processRequest({ task: 'generate video', ... });"
echo ""
